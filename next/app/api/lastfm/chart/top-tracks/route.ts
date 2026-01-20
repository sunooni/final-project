import { NextResponse } from 'next/server';
import { callLastfmApi } from '@/app/lib/lastfm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';
    const page = searchParams.get('page') || '1';

    const data = await callLastfmApi('chart.getTopTracks', {
      limit,
      page,
    });

    if (!data.tracks || !data.tracks.track) {
      return NextResponse.json({ tracks: [] });
    }

    const tracks = Array.isArray(data.tracks.track) 
      ? data.tracks.track 
      : [data.tracks.track];

    const formattedTracks = tracks.map((track: any) => ({
      name: track.name,
      artist: track.artist?.name || track.artist,
      playcount: parseInt(track.playcount) || 0,
      listeners: parseInt(track.listeners) || 0,
      url: track.url,
      mbid: track.mbid || null,
      image: track.image?.[2]?.['#text'] || null, // medium size image
    }));

    return NextResponse.json({ 
      tracks: formattedTracks,
      total: data.tracks['@attr']?.total || formattedTracks.length 
    });
  } catch (error) {
    console.error('Error fetching top tracks chart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top tracks chart' },
      { status: 500 }
    );
  }
}