import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Delete Last.fm cookies
  cookieStore.delete('lastfm_session_key');
  cookieStore.delete('lastfm_username');
  
  return NextResponse.json({ success: true });
}
