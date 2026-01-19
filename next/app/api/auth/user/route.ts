import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userApi } from '@/app/lib/api';

export async function GET() {
  const cookieStore = await cookies();
  
  // Check for Last.fm user
  const lastfmUsername = cookieStore.get('lastfm_username');
  const userIdCookie = cookieStore.get('user_id')?.value;
  
  if (lastfmUsername) {
    // Пытаемся получить данные пользователя из базы данных
    if (userIdCookie) {
      try {
        const userResult = await userApi.getUser(lastfmUsername.value);
        if (userResult.data) {
          const userData = userResult.data as any;
          // Возвращаем полные данные пользователя из БД
          return NextResponse.json({ 
            authenticated: true, 
            user: { 
              id: userData.id || parseInt(userIdCookie),
              username: userData.lastfmUsername || lastfmUsername.value,
              login: userData.lastfmUsername || lastfmUsername.value,
              provider: 'lastfm',
              playcount: userData.playcount || 0,
              country: userData.country || '',
              realname: userData.realname || '',
              image: userData.image || '',
            } 
          });
        }
      } catch (error) {
        console.error('Error fetching user from database:', error);
        // Если ошибка при получении из БД, но user_id есть в куки, вернем его
      }
    }

    // Fallback на данные из cookie
    // Если user_id есть в куки, включаем его в ответ
    const fallbackUser: any = {
      username: lastfmUsername.value,
      login: lastfmUsername.value,
      provider: 'lastfm'
    };

    if (userIdCookie) {
      fallbackUser.id = parseInt(userIdCookie);
    }

    return NextResponse.json({ 
      authenticated: true, 
      user: fallbackUser
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}

