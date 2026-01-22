import { lastfmConfig } from '@/config/lastfm';
import { callLastfmApi } from '@/app/lib/lastfm';

interface Track {
  name: string;
  artist: {
    '#text': string;
    mbid?: string;
  };
  url: string;
}

interface ArtistInfo {
  name: string;
  tags?: {
    tag: Array<{
      name: string;
      url: string;
    }> | {
      name: string;
      url: string;
    };
  };
  url: string;
}

/**
 * Получить жанры пользователя на основе его любимых треков (loved tracks)
 * Использует ту же логику, что и galaxy endpoint для консистентности
 * @param username - Имя пользователя Last.fm
 * @param maxPages - Максимальное количество страниц loved tracks для анализа (по умолчанию 3 для оптимизации)
 * @param usePublicApi - Использовать публичный API (для друзей без авторизации)
 * @returns Map жанров с их весами (количество треков в этом жанре)
 */
export async function getUserGenres(
  username: string,
  maxPages: number = 3,
  usePublicApi: boolean = false
): Promise<Map<string, number>> {
  const genreMap = new Map<string, number>();

  if (!lastfmConfig.apiKey) {
    console.error('Last.fm API key не настроен');
    return genreMap;
  }

  const apiKey: string = lastfmConfig.apiKey;

  try {
    // Получаем loved tracks пользователя (используем ту же логику, что и в galaxy)
    let allTracks: Track[] = [];
    let page = 1;
    const limit = 50;
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      let data: any;
      
      if (usePublicApi) {
        // Используем публичный API для друзей
        const url = new URL('https://ws.audioscrobbler.com/2.0/');
        url.searchParams.set('method', 'user.getLovedTracks');
        url.searchParams.set('user', username);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('api_key', apiKey);
        url.searchParams.set('format', 'json');

        const response = await fetch(url.toString());
        if (!response.ok) {
          console.error(`Failed to fetch loved tracks for ${username}`);
          break;
        }

        data = await response.json();
        if (data.error) {
          console.error(`Last.fm API error for ${username}:`, data.message);
          break;
        }
      } else {
        // Используем авторизованный API для текущего пользователя
        try {
          data = await callLastfmApi('user.getLovedTracks', {
            user: username,
            page: page.toString(),
            limit: limit.toString(),
          });
        } catch (error) {
          // Если не удалось получить через авторизованный API, пробуем публичный
          const url = new URL('https://ws.audioscrobbler.com/2.0/');
          url.searchParams.set('method', 'user.getLovedTracks');
          url.searchParams.set('user', username);
          url.searchParams.set('page', page.toString());
          url.searchParams.set('limit', limit.toString());
          url.searchParams.set('api_key', apiKey);
          url.searchParams.set('format', 'json');

          const response = await fetch(url.toString());
          if (!response.ok) break;
          data = await response.json();
          if (data.error) break;
        }
      }

      const tracks = data.lovedtracks?.track;
      if (!tracks) break;

      const trackArray = Array.isArray(tracks) ? tracks : [tracks];
      allTracks = allTracks.concat(trackArray);

      const totalPages = parseInt(data.lovedtracks?.['@attr']?.totalPages || '1');
      hasMore = page < totalPages;
      page++;
    }

    if (allTracks.length === 0) {
      // Fallback: если нет loved tracks, используем топ артистов
      return await getUserGenresFromTopArtists(username, 20);
    }

    // Группируем треки по артистам (как в galaxy endpoint)
    const artistTracks: Record<string, { tracks: Track[]; url: string }> = {};
    for (const track of allTracks) {
      const artistName = track.artist?.['#text'] || (typeof track.artist === 'string' ? track.artist : undefined);
      
      if (!artistName || typeof artistName !== 'string' || artistName.trim() === '') {
        continue;
      }
      
      if (!artistTracks[artistName]) {
        let artistUrl = `https://www.last.fm/music/${encodeURIComponent(artistName)}`;
        if (track.url) {
          const trackUrlParts = track.url.split('/track/');
          if (trackUrlParts.length > 0 && trackUrlParts[0]) {
            artistUrl = trackUrlParts[0] + '/music/' + encodeURIComponent(artistName);
          }
        }
        artistTracks[artistName] = { tracks: [], url: artistUrl };
      }
      artistTracks[artistName].tracks.push(track);
    }

    // Получаем жанры для каждого артиста (используем ту же логику, что и в galaxy)
    const artistNames = Object.keys(artistTracks).filter(name => name && name !== 'undefined');
    
    if (artistNames.length === 0) {
      return genreMap;
    }
    
    const batchSize = 5;
    
    for (let i = 0; i < artistNames.length; i += batchSize) {
      const batch = artistNames.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (artistName) => {
          try {
            if (!artistName || artistName === 'undefined' || artistName.trim() === '') {
              return;
            }
            
            // Используем публичный API метод (не требует авторизации)
            const url = new URL('https://ws.audioscrobbler.com/2.0/');
            url.searchParams.set('method', 'artist.getInfo');
            url.searchParams.set('artist', artistName);
            url.searchParams.set('api_key', apiKey);
            url.searchParams.set('format', 'json');

            const response = await fetch(url.toString());
            if (!response.ok) return;

            const artistData = await response.json();
            const artistInfo: ArtistInfo = artistData.artist;
            if (!artistInfo || !artistInfo.name) return;

            const tags = artistInfo.tags?.tag;
            if (!tags) return;

            const tagArray = Array.isArray(tags) ? tags : [tags];
            const trackCount = artistTracks[artistName]?.tracks?.length || 0;
            
            if (trackCount === 0) return;

            // Используем первый жанр из списка (как в galaxy endpoint)
            const firstTag = tagArray[0];
            if (firstTag && firstTag.name) {
              const genreName = firstTag.name.toLowerCase().trim();
              if (genreName) {
                const currentWeight = genreMap.get(genreName) || 0;
                // Вес = количество треков этого артиста в этом жанре
                genreMap.set(genreName, currentWeight + trackCount);
              }
            }
          } catch (error) {
            console.error(`Error fetching genres for artist ${artistName}:`, error);
          }
        })
      );

      // Небольшая задержка между батчами
      if (i + batchSize < artistNames.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  } catch (error) {
    console.error(`Error getting genres for ${username}:`, error);
    // Fallback на топ артистов в случае ошибки
    return await getUserGenresFromTopArtists(username, 20);
  }

  return genreMap;
}

/**
 * Fallback функция: получить жанры на основе топ артистов
 * Используется если loved tracks недоступны
 */
async function getUserGenresFromTopArtists(
  username: string,
  limit: number = 20
): Promise<Map<string, number>> {
  const genreMap = new Map<string, number>();

  if (!lastfmConfig.apiKey) {
    console.error('Last.fm API key не настроен');
    return genreMap;
  }

  const apiKey: string = lastfmConfig.apiKey;

  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', 'user.getTopArtists');
    url.searchParams.set('user', username);
    url.searchParams.set('period', 'overall');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) return genreMap;

    const data = await response.json();
    if (data.error) return genreMap;

    const artists = data.topartists?.artist || [];
    const artistArray = Array.isArray(artists) ? artists : [artists];

    if (artistArray.length === 0) return genreMap;

    const batchSize = 5;
    
    for (let i = 0; i < artistArray.length; i += batchSize) {
      const batch = artistArray.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (artist: any) => {
          try {
            const artistName = artist.name;
            if (!artistName) return;

            const artistUrl = new URL('https://ws.audioscrobbler.com/2.0/');
            artistUrl.searchParams.set('method', 'artist.getInfo');
            artistUrl.searchParams.set('artist', artistName);
            artistUrl.searchParams.set('api_key', apiKey);
            artistUrl.searchParams.set('format', 'json');

            const artistResponse = await fetch(artistUrl.toString());
            if (!artistResponse.ok) return;

            const artistData = await artistResponse.json();
            const tags = artistData.artist?.tags?.tag;

            if (!tags) return;

            const tagArray = Array.isArray(tags) ? tags : [tags];
            const firstTag = tagArray[0];
            
            if (firstTag?.name) {
              const genreName = firstTag.name.toLowerCase().trim();
              if (genreName) {
                const currentWeight = genreMap.get(genreName) || 0;
                // Вес зависит от позиции артиста в топе
                const positionWeight = Math.max(1, limit - i);
                genreMap.set(genreName, currentWeight + positionWeight);
              }
            }
          } catch (error) {
            // Продолжаем обработку других артистов
          }
        })
      );

      if (i + batchSize < artistArray.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  } catch (error) {
    console.error(`Error getting genres from top artists for ${username}:`, error);
  }

  return genreMap;
}

/**
 * Рассчитать совместимость двух пользователей на основе их жанров
 * @param userGenres - Жанры первого пользователя
 * @param friendGenres - Жанры второго пользователя
 * @returns Процент совместимости (0-100)
 */
export function calculateCompatibility(
  userGenres: Map<string, number>,
  friendGenres: Map<string, number>
): number {
  if (userGenres.size === 0 || friendGenres.size === 0) {
    return 0;
  }

  // Находим общие жанры
  const commonGenres: Array<{ genre: string; weight: number }> = [];
  
  userGenres.forEach((userWeight, genre) => {
    const friendWeight = friendGenres.get(genre);
    if (friendWeight) {
      // Используем среднее геометрическое весов для более точного расчета
      const combinedWeight = Math.sqrt(userWeight * friendWeight);
      commonGenres.push({ genre, weight: combinedWeight });
    }
  });

  if (commonGenres.length === 0) {
    return 0;
  }

  // Вычисляем общий вес общих жанров
  const commonWeight = commonGenres.reduce((sum, item) => sum + item.weight, 0);
  
  // Вычисляем общий вес всех жанров обоих пользователей
  const totalUserWeight = Array.from(userGenres.values()).reduce((sum, w) => sum + w, 0);
  const totalFriendWeight = Array.from(friendGenres.values()).reduce((sum, w) => sum + w, 0);
  const totalWeight = totalUserWeight + totalFriendWeight;

  if (totalWeight === 0) {
    return 0;
  }

  // Процент совместимости = (вес общих жанров * 2) / общий вес всех жанров * 100
  // Умножаем на 2, потому что общие жанры учитываются в обоих списках
  const compatibility = Math.min(100, Math.round((commonWeight * 2 / totalWeight) * 100));

  // Минимальная совместимость 20%, если есть хотя бы один общий жанр
  return Math.max(20, compatibility);
}
