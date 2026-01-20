import { NextResponse } from 'next/server';
import { getLastfmUsername } from '@/app/lib/lastfm';
import { buildTimeline } from '@/app/utils/timelineBuilder';

export async function GET() {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    const timeline = await buildTimeline(username);
    
    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Error building timeline:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to build timeline' 
      },
      { status: 500 }
    );
  }
}