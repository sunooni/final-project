import { NextResponse } from 'next/server';
import { lastfmConfig } from '@/config/lastfm';

/**
 * Получить случайного артиста из объединённой истории всех друзей
 * Используется для игры "Угадай друга" - выбирает артиста, которого слушали разные друзья
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const friendNames = searchParams.get('friends')?.split(',') || [];

    if (friendNames.length === 0) {
      return NextResponse.json(
        { error: 'Параметр friends обязателен (список друзей через запятую)' },
        { status: 400 }
      );
    }

    // Получаем топ артистов для каждого друга параллельно
    const allArtistsMap = new Map<string, { name: string; playcount: number; url: string; mbid: string; fromFriend: string }>();

    const artistsByFriend = await Promise.all(
      friendNames.map(async (friendName, index) => {
        try {
          const url = new URL('https://ws.audioscrobbler.com/2.0/');
          url.searchParams.set('method', 'user.getTopArtists');
          url.searchParams.set('user', friendName.trim());
          url.searchParams.set('limit', '50'); // Уменьшаем до 50 для снижения нагрузки
          url.searchParams.set('period', 'overall');
          url.searchParams.set('api_key', lastfmConfig.apiKey);
          url.searchParams.set('format', 'json');

          console.log(`Загружаем топ артистов для ${friendName}...`);
          
          // Добавляем небольшую задержку между запросами
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

          return artistList.map((artist: any) => ({
            name: artist.name,
            playcount: parseInt(artist.playcount || '0'),
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

    // Объединяем артистов от всех друзей в одну коллекцию
    artistsByFriend.forEach((artists, index) => {
      artists.forEach((artist: any) => {
        const key = artist.name.toLowerCase();
        if (!allArtistsMap.has(key)) {
          allArtistsMap.set(key, artist);
        }
      });
    });

    if (allArtistsMap.size === 0) {
      return NextResponse.json(
        { error: 'Не найдено артистов в истории друзей' },
        { status: 400 }
      );
    }

    // Выбираем случайного артиста из объединённой коллекции
    const allArtists = Array.from(allArtistsMap.values());
    const randomArtist = allArtists[Math.floor(Math.random() * allArtists.length)];

    // Логируем для отладки
    console.log(`Выбран случайный артист: ${randomArtist.name} из ${allArtists.length} доступных артистов (от друга: ${randomArtist.fromFriend})`);

    return NextResponse.json({
      success: true,
      artist: {
        name: randomArtist.name,
        playcount: randomArtist.playcount,
        url: randomArtist.url,
        mbid: randomArtist.mbid,
      },
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
