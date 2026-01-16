import { NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';
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

export async function GET() {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    // Get all loved tracks (fetch multiple pages)
    let allTracks: Track[] = [];
    let page = 1;
    const limit = 50;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 10 pages (500 tracks max)
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

    // Group tracks by artist
    const artistTracks: Record<string, { tracks: Track[]; url: string }> = {};
    for (const track of allTracks) {
      const artistName = track.artist['#text'];
      if (!artistTracks[artistName]) {
        artistTracks[artistName] = { tracks: [], url: track.url.split('/track/')[0] + '/music/' + encodeURIComponent(artistName) };
      }
      artistTracks[artistName].tracks.push(track);
    }

    // Get tags (genres) for each unique artist
    // Use public API method (no auth required for artist.getInfo)
    const genreMap: Record<string, Genre> = {};
    
    // Process artists in batches to avoid rate limiting
    const artistNames = Object.keys(artistTracks);
    const batchSize = 5;
    
    for (let i = 0; i < artistNames.length; i += batchSize) {
      const batch = artistNames.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (artistName) => {
        try {
          // Use public API method - no authentication needed
          const url = new URL('https://ws.audioscrobbler.com/2.0/');
          url.searchParams.set('method', 'artist.getInfo');
          url.searchParams.set('artist', artistName);
          url.searchParams.set('api_key', lastfmConfig.apiKey);
          url.searchParams.set('format', 'json');

          const response = await fetch(url.toString());
          if (!response.ok) {
            console.error(`Failed to fetch artist ${artistName}`);
            return;
          }

          const artistData = await response.json();
          const artistInfo: ArtistInfo = artistData.artist;
          if (!artistInfo) return;

          const tags = artistInfo.tags?.tag;
          if (!tags) return;

          const tagArray = Array.isArray(tags) ? tags : [tags];
          const trackCount = artistTracks[artistName].tracks.length;

          // Add artist to each genre
          for (const tag of tagArray) {
            const genreName = tag.name.toLowerCase();
            if (!genreMap[genreName]) {
              genreMap[genreName] = {
                name: tag.name,
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
                url: artistInfo.url || `https://www.last.fm/music/${encodeURIComponent(artistName)}`,
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
      .filter(genre => genre.trackCount > 0)
      .sort((a, b) => b.trackCount - a.trackCount)
      .map(genre => ({
        ...genre,
        artists: genre.artists.sort((a, b) => b.trackCount - a.trackCount),
      }));

    return NextResponse.json({ genres });
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

