import { NextResponse } from 'next/server';
import { lastfmConfig } from '@/config/lastfm';

/**
 * Получить случайного артиста из объединённой истории всех друзей
 * Используется для игры "Угадай друга"
 * Логика выбора:
 * 1. Сначала ищет артистов с существенной разницей (минимум 2 друга) - вопрос "кто больше слушает"
 * 2. Если таких нет, ищет уникальных артистов (только 1 друг) - вопрос "кто слушает"
 * 3. Если и таких нет, использует любых артистов (минимум 2 друга) - вопрос "кто больше слушает"
 */
export async function GET(request: Request) {
  try {
    if (!lastfmConfig.apiKey) {
      return NextResponse.json(
        { error: 'Last.fm API key не настроен' },
        { status: 500 }
      );
    }
    
    const apiKey: string = lastfmConfig.apiKey;

    const { searchParams } = new URL(request.url);
    const friendNames = searchParams.get('friends')?.split(',') || [];
    const excludeArtists = searchParams.get('exclude')?.split(',').map(a => a.toLowerCase().trim()) || [];

    if (friendNames.length === 0) {
      return NextResponse.json(
        { error: 'Параметр friends обязателен (список друзей через запятую)' },
        { status: 400 }
      );
    }

    // Используем Map для отслеживания артистов с прослушиваниями для каждого друга
    const artistsMap = new Map<string, { 
      name: string; 
      url: string; 
      mbid: string;
      playcounts: Map<string, number>; // Map<friendName, playcount> - прослушивания для каждого друга
    }>();

    // Получаем топ артистов для каждого друга параллельно
    const artistsByFriend = await Promise.all(
      friendNames.map(async (friendName, index) => {
        try {
          const url = new URL('https://ws.audioscrobbler.com/2.0/');
          url.searchParams.set('method', 'user.getTopArtists');
          url.searchParams.set('user', friendName.trim());
          url.searchParams.set('limit', '100'); // Увеличиваем лимит для лучшего покрытия
          url.searchParams.set('period', 'overall');
          url.searchParams.set('api_key', apiKey);
          url.searchParams.set('format', 'json');

          console.log(`Загружаем топ артистов для ${friendName}...`);
          
          // Добавляем небольшую задержку между запросами для избежания rate limiting
          await new Promise(resolve => setTimeout(resolve, 100 * index));
          
          const response = await fetch(url.toString());

          if (!response.ok) {
            console.error(`Ошибка загрузки артистов для ${friendName}: статус ${response.status}`);
            return [];
          }

          const data = await response.json();

          if (data.error) {
            console.error(`Ошибка API для ${friendName}:`, data.message);
            return [];
          }

          const artists = data.topartists?.artist || [];
          const artistList = Array.isArray(artists) ? artists : [artists];

          console.log(`Загружено ${artistList.length} артистов для ${friendName}`);

          return artistList.map((artist: {
            name: string;
            playcount: string | number;
            url: string;
            mbid: string;
          }) => ({
            name: artist.name,
            playcount: parseInt(String(artist.playcount || '0')),
            url: artist.url,
            mbid: artist.mbid,
            fromFriend: friendName,
          }));
        } catch (error) {
          console.error(`Ошибка загрузки артистов для ${friendName}:`, error);
          return [];
        }
      })
    );

    // Объединяем артистов от всех друзей и сохраняем прослушивания для каждого друга
    artistsByFriend.forEach((artists) => {
      artists.forEach((artist: {
        name: string;
        playcount: number;
        url: string;
        mbid: string;
        fromFriend: string;
      }) => {
        const key = artist.name.toLowerCase();
        if (artistsMap.has(key)) {
          // Артист уже есть - добавляем прослушивания для этого друга
          const existing = artistsMap.get(key)!;
          existing.playcounts.set(artist.fromFriend, artist.playcount);
        } else {
          // Новый артист - создаем запись с прослушиваниями
          const playcounts = new Map<string, number>();
          playcounts.set(artist.fromFriend, artist.playcount);
          artistsMap.set(key, {
            name: artist.name,
            url: artist.url,
            mbid: artist.mbid,
            playcounts: playcounts,
          });
        }
      });
    });

    // Функция для проверки, есть ли существенная разница в прослушиваниях
    const hasSignificantDifference = (playcounts: Map<string, number>): boolean => {
      const counts = Array.from(playcounts.values()).filter(count => count > 0);
      if (counts.length < 2) return false;
      
      const sorted = counts.sort((a, b) => b - a);
      const max = sorted[0];
      const second = sorted[1] || 0;
      
      // Проверяем, что максимальное прослушивание больше второго минимум на 20% или на 5 прослушиваний
      const minDifference = Math.max(5, Math.floor(max * 0.2));
      return (max - second) >= minDifference;
    };

    // Приоритет 1: Артисты с существенной разницей (минимум 2 друга)
    let validArtists = Array.from(artistsMap.values()).filter(
      (artist) => {
        const artistKey = artist.name.toLowerCase();
        if (excludeArtists.includes(artistKey)) return false;
        if (artist.playcounts.size < 2) return false;
        return hasSignificantDifference(artist.playcounts);
      }
    );

    let isUnique = false;

    // Приоритет 2: Уникальные артисты (только 1 друг слушает)
    if (validArtists.length === 0) {
      console.log('Не найдено артистов с существенной разницей, ищем уникальных артистов (только 1 друг)');
      validArtists = Array.from(artistsMap.values()).filter(
        (artist) => {
          const artistKey = artist.name.toLowerCase();
          if (excludeArtists.includes(artistKey)) return false;
          // Уникальный артист - слушает только один друг
          return artist.playcounts.size === 1;
        }
      );
      isUnique = true;
    }

    // Приоритет 3: Любые артисты (минимум 2 друга, без требования разницы)
    if (validArtists.length === 0) {
      console.log('Не найдено уникальных артистов, используем любых артистов (минимум 2 друга)');
      validArtists = Array.from(artistsMap.values()).filter(
        (artist) => {
          const artistKey = artist.name.toLowerCase();
          if (excludeArtists.includes(artistKey)) return false;
          return artist.playcounts.size >= 2;
        }
      );
    }

    // Если ничего не найдено, возвращаем ошибку
    if (validArtists.length === 0) {
      const errorMessage = excludeArtists.length > 0
        ? 'Не найдено новых артистов (все уже использованы)'
        : 'Не найдено артистов';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Выбираем случайного артиста из валидных
    const randomArtist = validArtists[Math.floor(Math.random() * validArtists.length)];

    // Определяем друга с максимальным количеством прослушиваний (или единственного друга для уникального артиста)
    const playcountsArray = Array.from(randomArtist.playcounts.entries());
    const sortedPlaycounts = playcountsArray.sort((a, b) => b[1] - a[1]);
    const topFriend = sortedPlaycounts[0][0];
    const topPlaycount = sortedPlaycounts[0][1];

    // Логируем для отладки
    if (isUnique) {
      console.log(
        `Выбран уникальный артист: ${randomArtist.name} из ${validArtists.length} доступных ` +
        `(слушает только ${topFriend}: ${topPlaycount} прослушиваний)`
      );
    } else {
      console.log(
        `Выбран случайный артист: ${randomArtist.name} из ${validArtists.length} доступных артистов ` +
        `(слушали ${randomArtist.playcounts.size} друзей, больше всех слушал ${topFriend}: ${topPlaycount} прослушиваний)`
      );
    }

    return NextResponse.json({
      success: true,
      artist: {
        name: randomArtist.name,
        playcount: topPlaycount,
        url: randomArtist.url,
        mbid: randomArtist.mbid,
      },
      friendsCount: randomArtist.playcounts.size,
      topFriend: topFriend,
      isUnique: isUnique, // Флаг, указывающий, что артист уникальный (слушает только один друг)
    });
  } catch (error) {
    console.error('Ошибка получения случайного артиста:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка получения случайного артиста',
      },
      { status: 500 }
    );
  }
}
