import { NextResponse } from 'next/server';
import { callLastfmApi } from '@/app/lib/lastfm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ?? searchParams.get('username');
    const limit = searchParams.get('limit') || '1';
    const skipCache = searchParams.get('_t') !== null; // Если есть параметр _t, обходим кэш

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const data = await callLastfmApi('user.getRecentTracks', {
      user: id,
      limit,
    }, {
      useCache: !skipCache, // Обходим кэш при автоматическом обновлении
    });

    if (!data.recenttracks || !data.recenttracks.track) {
      return NextResponse.json({ tracks: [] });
    }

    const tracks = Array.isArray(data.recenttracks.track) 
      ? data.recenttracks.track 
      : [data.recenttracks.track];

    const formattedTracks = tracks.map((track: any) => ({
      name: track.name,
      artist: track.artist?.['#text'] || track.artist,
      album: track.album?.['#text'] || track.album || '',
      url: track.url,
      mbid: track.mbid || null,
      image: track.image?.[2]?.['#text'] || null, // medium size image
      date: track.date ? {
        uts: track.date.uts,
        text: track.date['#text']
      } : null,
      nowplaying: track['@attr']?.nowplaying === 'true',
    }));

    return NextResponse.json({ 
      tracks: formattedTracks,
      total: data.recenttracks['@attr']?.total ?? formattedTracks.length
    });
  } catch (error) {
    console.error('Error fetching friend recent tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friend recent tracks' },
      { status: 500 }
    );
  }
}