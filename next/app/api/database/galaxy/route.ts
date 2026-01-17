import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { lastfmConfig } from '@/config/lastfm';

interface DatabaseTrack {
  id: number;
  track: {
    id: number;
    name: string;
    image: string;
    url: string;
    artist: {
      id: number;
      name: string;
      url?: string;
    };
    album?: {
      id: number;
      title: string;
      image: string;
    };
  };
  date?: string;
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

export async function GET() {
  try {
    console.log('Database Galaxy API route called');
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      console.log('No user_id found, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log(`Fetching galaxy data from database for user: ${userId}`);

    // Get loved tracks from database
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';
    
    // Fetch all loved tracks (up to 500)
    let allTracks: DatabaseTrack[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore && offset < 500) {
      const response = await fetch(
        `${apiUrl}/users/${userId}/loved-tracks?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to fetch loved tracks: ${response.status}`);
        break;
      }

      const data = await response.json();

      if (!data.tracks || !Array.isArray(data.tracks) || data.tracks.length === 0) {
        hasMore = false;
        break;
      }

      allTracks = allTracks.concat(data.tracks);

      // Check if there are more tracks
      if (data.tracks.length < limit || allTracks.length >= 500) {
        hasMore = false;
      } else {
        offset += limit;
      }
    }

    if (allTracks.length === 0) {
      console.log('No tracks found in database');
      return NextResponse.json({ genres: [] });
    }

    console.log(`Processing ${allTracks.length} tracks from database`);

    // Group tracks by artist
    const artistTracks: Record<string, { tracks: DatabaseTrack[]; url: string }> = {};
    for (const dbTrack of allTracks) {
      const artistName = dbTrack.track?.artist?.name;
      
      // Skip tracks without valid artist name
      if (!artistName || typeof artistName !== 'string' || artistName.trim() === '') {
        console.warn('Skipping track with invalid artist:', dbTrack);
        continue;
      }
      
      if (!artistTracks[artistName]) {
        // Use artist URL from database or construct from Last.fm
        const artistUrl = dbTrack.track.artist.url || 
          `https://www.last.fm/music/${encodeURIComponent(artistName)}`;
        artistTracks[artistName] = { tracks: [], url: artistUrl };
      }
      artistTracks[artistName].tracks.push(dbTrack);
    }

    console.log(`Found ${Object.keys(artistTracks).length} unique artists`);

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

    console.log(`Returning ${genres.length} genres with artists from database`);

    return NextResponse.json({ genres });
  } catch (error) {
    console.error('Error fetching galaxy data from database:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch galaxy data from database' 
      },
      { status: 500 }
    );
  }
}
