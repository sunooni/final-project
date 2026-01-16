import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  
  // Check for Yandex user
  const yandexUserCookie = cookieStore.get('yandex_user');
  if (yandexUserCookie) {
    try {
      const user = JSON.parse(yandexUserCookie.value);
      return NextResponse.json({ authenticated: true, user: { ...user, provider: 'yandex' } });
    } catch (error) {
      // Continue to check Last.fm
    }
  }

  // Check for Last.fm user
  const lastfmUsername = cookieStore.get('lastfm_username');
  if (lastfmUsername) {
    return NextResponse.json({ 
      authenticated: true, 
      user: { 
        username: lastfmUsername.value,
        login: lastfmUsername.value,
        provider: 'lastfm'
      } 
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

