import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userApi, lovedTracksApi } from '@/app/lib/api';
import { lastfmConfig } from '@/config/lastfm';

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
    console.log('Database Galaxy API route called');
    const cookieStore = await cookies();
    
    const lastfmUsername = cookieStore.get('lastfm_username');
    const userIdCookie = cookieStore.get('user_id');
    
    if (!lastfmUsername) {
      console.log('No username found, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    // Get user from database
    const userResult = await userApi.getUser(lastfmUsername.value);
    if (!userResult.data) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const userId = userResult.data.id;
    console.log(`Fetching galaxy data from database for user ID: ${userId}`);

    // Get all loved tracks from database (fetch multiple pages)
    let allTracks: Track[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const tracksResult = await lovedTracksApi.getUserLovedTracks(userId, limit, offset);
      
      if (tracksResult.error || !tracksResult.data) {
        console.error('Error fetching loved tracks:', tracksResult.error);
        break;
      }

      const tracks = tracksResult.data.tracks || [];
      if (tracks.length === 0) break;

      // Convert database tracks to the format expected by galaxy processing
      const convertedTracks: Track[] = tracks.map((lt: any) => ({
        name: lt.track?.name || '',
        artist: {
          '#text': lt.track?.artist?.name || '',
          mbid: lt.track?.artist?.mbid || undefined,
        },
        url: lt.track?.url || '',
      }));

      allTracks = allTracks.concat(convertedTracks);

      const total = tracksResult.data.total || 0;
      hasMore = offset + limit < total;
      offset += limit;

      // Limit to prevent excessive requests
      if (allTracks.length >= 500) {
        break;
      }
    }

    if (allTracks.length === 0) {
      return NextResponse.json({ genres: [] });
    }

    console.log(`Processing ${allTracks.length} tracks from database`);

    // Group tracks by artist
    const artistTracks: Record<string, { tracks: Track[]; url: string }> = {};
    for (const track of allTracks) {
      // Handle different possible structures of artist data
      const artistName = track.artist?.['#text'] || track.artist?.name || '';
      
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
    const artistNames = Object.keys(artistTracks).filter(name => name && name !== 'undefined');
    
    if (artistNames.length === 0) {
      console.warn('No valid artist names found');
      return NextResponse.json({ genres: [] });
    }
    
    const batchSize = 5;
    
    for (let i = 0; i < artistNames.length; i += batchSize) {
      const batch = artistNames.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (artistName) => {
        try {
          // Skip invalid artist names
          if (!artistName || artistName === 'undefined' || artistName.trim() === '') {
            return;
          }
          
          // Use public API method - no authentication needed
          const url = new URL('https://ws.audioscrobbler.com/2.0/');
          url.searchParams.set('method', 'artist.getInfo');
          url.searchParams.set('artist', artistName);
          url.searchParams.set('api_key', lastfmConfig.apiKey);
          url.searchParams.set('format', 'json');

          const response = await fetch(url.toString());
          if (!response.ok) {
            console.error(`Failed to fetch artist ${artistName}: ${response.status}`);
            return;
          }

          const artistData = await response.json();
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

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < artistNames.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
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

    return NextResponse.json({ genres });
  } catch (error) {
    console.error('Error fetching galaxy data from database:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch galaxy data' 
      },
      { status: 500 }
    );
  }
}
