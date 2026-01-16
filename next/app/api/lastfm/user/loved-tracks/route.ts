import { NextRequest, NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';

export async function GET(request: NextRequest) {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';

    // Get loved tracks from Last.fm
    const data = await callLastfmApi('user.getLovedTracks', {
      user: username,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      lovedtracks: data.lovedtracks,
    });
  } catch (error) {
    console.error('Error fetching Last.fm loved tracks:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch loved tracks' 
      },
      { status: 500 }
    );
  }
}
