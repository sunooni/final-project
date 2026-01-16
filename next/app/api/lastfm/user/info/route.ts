import { NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';

export async function GET() {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    // Get user info from Last.fm
    const data = await callLastfmApi('user.getInfo', {
      user: username,
    });

    return NextResponse.json({
      success: true,
      user: data.user,
    });
  } catch (error) {
    console.error('Error fetching Last.fm user info:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch user info' 
      },
      { status: 500 }
    );
  }
}
