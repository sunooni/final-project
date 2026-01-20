import { NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';

export async function GET(request: Request) {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';

    const data = await callLastfmApi('user.getTopArtists', {
      user: username,
      period: 'overall', // всех времен
      limit,
    });

    const artists = data.topartists?.artist || [];
    const artistArray = Array.isArray(artists) ? artists : [artists];

    // Форматируем данные для удобства использования
    const formattedArtists = artistArray.map((artist: any) => ({
      name: artist.name,
      playcount: parseInt(artist.playcount || '0'),
      url: artist.url,
      mbid: artist.mbid,
      image: artist.image?.[artist.image.length - 1]?.['#text'] || null,
    }));

    return NextResponse.json({ artists: formattedArtists });
  } catch (error) {
    console.error('Error fetching top artists overall:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch top artists' 
      },
      { status: 500 }
    );
  }
}