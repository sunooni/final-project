import { NextResponse } from 'next/server';
import { getLastfmUsername } from '@/app/lib/lastfm';
import { callLastfmApi, callLastfmPublicApi } from '@/app/lib/lastfm';
import { getUserGenres } from '@/app/utils/compatibilityCalculator';

/**
 * Preload endpoint - загружает данные для всех основных страниц в фоне
 * Это ускоряет первую загрузку страниц, так как данные уже будут в кэше
 */
export async function POST() {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Запускаем все предзагрузки параллельно, не ждем их завершения
    Promise.all([
      // 1. Предзагрузка друзей
      preloadFriends(username),
      
      // 2. Предзагрузка loved tracks (для galaxy и tracks страниц)
      preloadLovedTracks(username),
      
      // 3. Предзагрузка recent tracks
      preloadRecentTracks(username),
      
      // 4. Предзагрузка galaxy данных (первые 3 страницы)
      preloadGalaxyData(username),
      
      // 5. Предзагрузка жанров пользователя (для совместимости с друзьями)
      preloadUserGenres(username),
    ]).catch((error) => {
      console.error('Error in preload:', error);
      // Игнорируем ошибки, так как это фоновая операция
    });

    // Возвращаем успех сразу, не ждем завершения предзагрузки
    return NextResponse.json({ 
      success: true, 
      message: 'Preload started' 
    });
  } catch (error) {
    console.error('Preload endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to start preload' },
      { status: 500 }
    );
  }
}

/**
 * Предзагрузка списка друзей
 */
async function preloadFriends(username: string) {
  try {
    await callLastfmApi('user.getFriends', {
      user: username,
      limit: '50',
      page: '1',
    });
  } catch (error) {
    console.error('Error preloading friends:', error);
  }
}

/**
 * Предзагрузка loved tracks (первые 3 страницы для быстрой загрузки)
 */
async function preloadLovedTracks(username: string) {
  try {
    for (let page = 1; page <= 3; page++) {
      await callLastfmApi('user.getLovedTracks', {
        user: username,
        page: page.toString(),
        limit: '50',
      });
    }
  } catch (error) {
    console.error('Error preloading loved tracks:', error);
  }
}

/**
 * Предзагрузка recent tracks
 */
async function preloadRecentTracks(username: string) {
  try {
    await callLastfmApi('user.getRecentTracks', {
      user: username,
      limit: '50',
    });
  } catch (error) {
    console.error('Error preloading recent tracks:', error);
  }
}

/**
 * Предзагрузка galaxy данных (первые 3 страницы loved tracks + жанры артистов)
 */
async function preloadGalaxyData(username: string) {
  try {
    // Загружаем loved tracks
    let allTracks: any[] = [];
    for (let page = 1; page <= 3; page++) {
      const data = await callLastfmApi('user.getLovedTracks', {
        user: username,
        page: page.toString(),
        limit: '50',
      });
      
      const tracks = data.lovedtracks?.track;
      if (!tracks) break;
      
      const trackArray = Array.isArray(tracks) ? tracks : [tracks];
      allTracks = allTracks.concat(trackArray);
    }

    // Группируем по артистам
    const artistNames = new Set<string>();
    for (const track of allTracks) {
      const artistName = track.artist?.['#text'] || track.artist?.name || track.artist;
      if (artistName && typeof artistName === 'string' && artistName.trim() !== '') {
        artistNames.add(artistName);
      }
    }

    // Предзагружаем информацию о первых 20 артистах (чтобы не перегружать API)
    const artistArray = Array.from(artistNames).slice(0, 20);
    const batchSize = 5;
    
    for (let i = 0; i < artistArray.length; i += batchSize) {
      const batch = artistArray.slice(i, i + batchSize);
      await Promise.all(
        batch.map(artistName =>
          callLastfmPublicApi('artist.getInfo', { artist: artistName }).catch(() => {
            // Игнорируем ошибки отдельных артистов
          })
        )
      );
      
      // Небольшая задержка между батчами
      if (i + batchSize < artistArray.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  } catch (error) {
    console.error('Error preloading galaxy data:', error);
  }
}

/**
 * Предзагрузка жанров пользователя (для расчета совместимости с друзьями)
 */
async function preloadUserGenres(username: string) {
  try {
    await getUserGenres(username, 3, false);
  } catch (error) {
    console.error('Error preloading user genres:', error);
  }
}
