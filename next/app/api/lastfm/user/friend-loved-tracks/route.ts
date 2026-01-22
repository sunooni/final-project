import { NextResponse } from 'next/server';
import { callLastfmApi } from '@/app/lib/lastfm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ?? searchParams.get('username');
    const limit = searchParams.get('limit') || '50';

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const data = await callLastfmApi('user.getLovedTracks', {
      user: id,
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

    return NextResponse.json({ tracks: formattedTracks });
  } catch (error) {
    console.error('Error fetching friend loved tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friend loved tracks' },
      { status: 500 }
    );
  }
}