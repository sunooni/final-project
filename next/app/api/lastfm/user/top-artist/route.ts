import { NextResponse } from 'next/server';
import { lastfmConfig } from '@/config/lastfm';

/**
 * Получить топ артиста для любого пользователя Last.fm (публичный API)
 * Не требует авторизации
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const period = searchParams.get('period') || 'overall'; // overall, 7day, 1month, etc.
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Используем публичный API - не требует авторизации
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', 'user.getTopArtists');
    url.searchParams.set('user', username);
    url.searchParams.set('period', period);
    url.searchParams.set('limit', '1'); // Нам нужен только топ-1
    url.searchParams.set('api_key', lastfmConfig.apiKey);
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch top artist' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.message || 'Last.fm API error' },
        { status: 400 }
      );
    }

    const artists = data.topartists?.artist || [];
    const topArtist = Array.isArray(artists) ? artists[0] : artists;

    if (!topArtist) {
      return NextResponse.json({ artist: null });
    }

    return NextResponse.json({
      artist: {
        name: topArtist.name,
        playcount: parseInt(topArtist.playcount || '0'),
        url: topArtist.url,
        mbid: topArtist.mbid,
      }
    });
  } catch (error) {
    console.error('Error fetching top artist:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch top artist' 
      },
      { status: 500 }
    );
  }
}
