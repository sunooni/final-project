import { NextResponse } from 'next/server';
import { lastfmConfig } from '@/config/lastfm';

/**
 * Получить количество прослушиваний конкретного артиста для нескольких друзей
 * Используется в игре "Угадай друга" для определения, кто слушал больше
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get('artist');
    const friendNames = searchParams.get('friends')?.split(',') || [];

    if (!artistName) {
      return NextResponse.json(
        { error: 'Artist parameter is required' },
        { status: 400 }
      );
    }

    if (friendNames.length === 0) {
      return NextResponse.json(
        { error: 'Friends parameter is required (comma-separated usernames)' },
        { status: 400 }
      );
    }

    // Получаем количество прослушиваний артиста для каждого друга параллельно
    // Используем более лёгкий метод с меньшим лимитом для избежания перегрузки API
    const stats = await Promise.all(
      friendNames.map(async (friendName) => {
        try {
          // Используем метод user.getTopArtists с меньшим лимитом
          const url = new URL('https://ws.audioscrobbler.com/2.0/');
          url.searchParams.set('method', 'user.getTopArtists');
          url.searchParams.set('user', friendName.trim());
          url.searchParams.set('limit', '500'); // Уменьшаем лимит до 500 для снижения нагрузки
          url.searchParams.set('period', 'overall'); // Берем за все время
          url.searchParams.set('api_key', lastfmConfig.apiKey);
          url.searchParams.set('format', 'json');

          console.log(`Загружаем топ артистов для ${friendName}...`);
          
          // Добавляем небольшую задержку между запросами, чтобы не перегружать API
          await new Promise(resolve => setTimeout(resolve, 100 * friendNames.indexOf(friendName)));
          
          const response = await fetch(url.toString());
          
          if (!response.ok) {
            console.error(`Ошибка загрузки статистики артиста для ${friendName}: статус ${response.status}`);
            const errorText = await response.text();
            console.error(`Текст ошибки:`, errorText);
            return { friend: friendName, playcount: 0 };
          }

          const data = await response.json();

          if (data.error) {
            console.error(`Ошибка API для ${friendName}:`, data.message);
            return { friend: friendName, playcount: 0 };
          }

          const artists = data.topartists?.artist || [];
          const artistList = Array.isArray(artists) ? artists : [artists];
          
          console.log(`Получено ${artistList.length} артистов для ${friendName}`);
          
          // Ищем нужного артиста в списке топ артистов пользователя
          const foundArtist = artistList.find(
            (artist: any) => artist.name.toLowerCase() === artistName.toLowerCase()
          );

          const playcount = foundArtist ? parseInt(foundArtist.playcount || '0') : 0;
          
          console.log(`${friendName}: артист "${artistName}" - ${playcount} прослушиваний`);

          return {
            friend: friendName,
            playcount: playcount,
          };
        } catch (error) {
          console.error(`Ошибка загрузки статистики артиста для ${friendName}:`, error);
          return { friend: friendName, playcount: 0 };
        }
      })
    );

    // Сортируем по количеству прослушиваний в убывающем порядке, чтобы показать, кто слушал больше
    const sortedStats = stats.sort((a, b) => b.playcount - a.playcount);

    // Логируем результаты для отладки
    console.log(`Статистика для артиста "${artistName}":`, sortedStats);

    return NextResponse.json({
      success: true,
      artist: artistName,
      stats: sortedStats,
      winner: sortedStats[0], // Друг с наибольшим количеством прослушиваний
    });
  } catch (error) {
    console.error('Ошибка загрузки статистики артиста:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Ошибка загрузки статистики артиста',
      },
      { status: 500 }
    );
  }
}
