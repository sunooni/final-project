import { NextResponse } from 'next/server';
import { callLastfmApi } from '@/app/lib/lastfm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const friendUsername = searchParams.get('username');
    const limit = searchParams.get('limit') || '50';

    if (!friendUsername) {
      return NextResponse.json(
        { error: 'Friend username is required' },
        { status: 400 }
      );
    }

    const data = await callLastfmApi('user.getLovedTracks', {
      user: friendUsername,
      limit,
    });

    if (!data.lovedtracks || !data.lovedtracks.track) {
      return NextResponse.json({ tracks: [] });
    }

    const tracks = Array.isArray(data.lovedtracks.track) 
      ? data.lovedtracks.track 
      : [data.lovedtracks.track];

    const formattedTracks = tracks.map((track: any) => ({
      name: track.name,
      artist: track.artist?.name || track.artist,
      url: track.url,
      mbid: track.mbid || null,
      image: track.image?.[2]?.['#text'] || null,
      date: track.date ? new Date(parseInt(track.date.uts) * 1000).toISOString() : null,
    }));

    return NextResponse.json({ 
      tracks: formattedTracks,
      username: friendUsername 
    });
  } catch (error) {
    console.error('Error fetching friend loved tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friend loved tracks' },
      { status: 500 }
    );
  }
}