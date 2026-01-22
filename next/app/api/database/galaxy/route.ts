import { NextResponse } from 'next/server';
import { callLastfmApi, callLastfmPublicApi, getLastfmUsername } from '@/app/lib/lastfm';

// Кэш для результатов galaxy endpoint
const galaxyCache = new Map<string, { data: any; expiresAt: number }>();
const GALAXY_CACHE_TTL = 30 * 60 * 1000; // 30 минут

interface Track {
  name: string;
  artist: {
    '#text'?: string;
    name?: string;
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

interface Genre {
  name: string;
  trackCount: number;
  artists: Array<{
    name: string;
    trackCount: number;
    url: string;
  }>;
}

export async function GET(request: Request) {
  try {
    console.log('Galaxy API route called');
    const username = await getLastfmUsername();
    
    if (!username) {
      console.log('No username found, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }
    
    // Проверяем кэш
    const cacheKey = `galaxy-${username}`;
    const cached = galaxyCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('Returning cached galaxy data');
      return NextResponse.json(cached.data);
    }
    
    console.log(`Fetching galaxy data for user: ${username}`);

    // Get all loved tracks (fetch multiple pages, limit to 3 for faster load)
    let allTracks: Track[] = [];
    let page = 1;
    const limit = 50;
    const maxPages = 3; // Reduced from 10 to 3 for faster initial load
    let hasMore = true;

    while (hasMore && page <= maxPages) {
      const data = await callLastfmApi('user.getLovedTracks', {
        user: username,
        page: page.toString(),
        limit: limit.toString(),
      });

      const tracks = data.lovedtracks?.track;
      if (!tracks) break;

      const trackArray = Array.isArray(tracks) ? tracks : [tracks];
      allTracks = allTracks.concat(trackArray);

      const totalPages = parseInt(data.lovedtracks?.['@attr']?.totalPages || '1');
      hasMore = page < totalPages;
      page++;
    }

    if (allTracks.length === 0) {
      return NextResponse.json({ genres: [] });
    }

    console.log(`Processing ${allTracks.length} tracks`);

    // Group tracks by artist
    const artistTracks: Record<string, { tracks: Track[]; url: string }> = {};
    for (const track of allTracks) {
      // Handle different possible structures of artist data
      const artistName = track.artist?.['#text'] || track.artist?.name || track.artist;
      
      // Skip tracks without valid artist name
      if (!artistName || typeof artistName !== 'string' || artistName.trim() === '') {
        console.warn('Skipping track with invalid artist:', track);
        continue;
      }
      
      if (!artistTracks[artistName]) {
        // Try to construct artist URL from track URL
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

    console.log(`Found ${Object.keys(artistTracks).length} unique artists:`, Object.keys(artistTracks));

    // Get tags (genres) for each unique artist
    // Use public API method (no auth required for artist.getInfo)
    const genreMap: Record<string, Genre> = {};
    
    // Process artists in batches to avoid rate limiting
    // Ограничиваем количество артистов для анализа (топ 30 по количеству треков)
    const artistNames = Object.keys(artistTracks)
      .filter(name => name && name !== 'undefined')
      .sort((a, b) => (artistTracks[b]?.tracks?.length || 0) - (artistTracks[a]?.tracks?.length || 0))
      .slice(0, 30); // Анализируем только топ 30 артистов для быстрой загрузки
    
    if (artistNames.length === 0) {
      console.warn('No valid artist names found');
      return NextResponse.json({ genres: [] });
    }
    
    console.log(`Analyzing ${artistNames.length} top artists (out of ${Object.keys(artistTracks).length} total)`);
    
    const batchSize = 10; // Увеличиваем размер батча для параллельной обработки
    
    for (let i = 0; i < artistNames.length; i += batchSize) {
      const batch = artistNames.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (artistName) => {
        try {
          // Skip invalid artist names
          if (!artistName || artistName === 'undefined' || artistName.trim() === '') {
            return;
          }
          
          // Use public API method with caching - no authentication needed
          const artistData = await callLastfmPublicApi('artist.getInfo', {
            artist: artistName,
          });
          
          if (!artistData || !artistData.artist) {
            console.warn(`No artist info for ${artistName}`);
            return;
          }
          
          const artistInfo: ArtistInfo = artistData.artist;
          if (!artistInfo || !artistInfo.name) {
            console.warn(`No artist info for ${artistName}`);
            return;
          }

          const tags = artistInfo.tags?.tag;
          if (!tags) {
            console.warn(`No tags for artist ${artistName}`);
            return;
          }

          const tagArray = Array.isArray(tags) ? tags : [tags];
          const trackCount = artistTracks[artistName]?.tracks?.length || 0;
          
          if (trackCount === 0) {
            return;
          }

          // Use only the first genre from the list
          const firstTag = tagArray[0];
          if (firstTag && firstTag.name) {
            const genreName = firstTag.name.toLowerCase();
            if (!genreMap[genreName]) {
              genreMap[genreName] = {
                name: firstTag.name,
                trackCount: 0,
                artists: [],
              };
            }
            genreMap[genreName].trackCount += trackCount;
            
            // Add artist if not already present
            const existingArtist = genreMap[genreName].artists.find(
              a => a.name === artistName
            );
            if (!existingArtist) {
              genreMap[genreName].artists.push({
                name: artistName,
                trackCount,
                url: artistInfo.url || artistTracks[artistName]?.url || `https://www.last.fm/music/${encodeURIComponent(artistName)}`,
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching info for artist ${artistName}:`, error);
          // Continue with other artists even if one fails
        }
      }));

      // Уменьшаем задержку между батчами (кэш уже помогает избежать rate limiting)
      if (i + batchSize < artistNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Convert to array and sort by track count
    const genres = Object.values(genreMap)
      .filter(genre => genre.trackCount > 0 && genre.artists.length > 0)
      .sort((a, b) => b.trackCount - a.trackCount)
      .map(genre => ({
        ...genre,
        artists: genre.artists
          .filter(artist => artist.name && artist.name !== 'undefined' && artist.trackCount > 0)
          .sort((a, b) => b.trackCount - a.trackCount),
      }))
      .filter(genre => genre.artists.length > 0);

    console.log(`Returning ${genres.length} genres with artists`);

    const result = { genres };
    
    // Сохраняем в кэш
    galaxyCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + GALAXY_CACHE_TTL
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching galaxy data:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch galaxy data' 
      },
      { status: 500 }
    );
  }
}

