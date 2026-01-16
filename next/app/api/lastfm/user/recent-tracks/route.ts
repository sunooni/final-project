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
    const from = searchParams.get('from'); // Unix timestamp
    const to = searchParams.get('to'); // Unix timestamp
    const extended = searchParams.get('extended') || '0'; // 0 or 1

    // Build parameters
    const params: Record<string, string> = {
      user: username,
      page,
      limit,
      extended,
    };

    if (from) params.from = from;
    if (to) params.to = to;

    // Get recent tracks from Last.fm
    const data = await callLastfmApi('user.getRecentTracks', params);

    return NextResponse.json({
      success: true,
      recenttracks: data.recenttracks,
    });
  } catch (error) {
    console.error('Error fetching Last.fm recent tracks:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch recent tracks' 
      },
      { status: 500 }
    );
  }
}
