import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userApi } from '@/app/lib/api';

export async function GET() {
  const cookieStore = await cookies();
  
  // Check for Last.fm user
  const lastfmUsername = cookieStore.get('lastfm_username');
  const userId = cookieStore.get('user_id')?.value;
  
  if (lastfmUsername) {
    // Пытаемся получить данные пользователя из базы данных
    if (userId) {
      try {
        const userResult = await userApi.getUser(lastfmUsername.value);
        if (userResult.data) {
          return NextResponse.json({ 
            authenticated: true, 
            user: { 
              id: userResult.data.id,
              username: userResult.data.lastfmUsername,
              login: userResult.data.lastfmUsername,
              provider: 'lastfm',
              playcount: userResult.data.playcount,
              country: userResult.data.country,
              realname: userResult.data.realname,
              image: userResult.data.image,
            } 
          });
        }
      } catch (error) {
        console.error('Error fetching user from database:', error);
      }
    }

    // Fallback на данные из cookie
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

