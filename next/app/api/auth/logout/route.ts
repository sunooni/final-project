import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Delete Yandex cookies
  cookieStore.delete('yandex_access_token');
  cookieStore.delete('yandex_user');
  
  // Delete Last.fm cookies
  cookieStore.delete('lastfm_session_key');
  cookieStore.delete('lastfm_username');

  return NextResponse.json({ success: true });
}

