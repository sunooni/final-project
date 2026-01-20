import { NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';


// Используется метод user.getFriends из Last.fm API
export async function GET() {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    // Вызываем Last.fm API метод user.getFriends для получения списка друзей
    // Этот метод возвращает друзей пользователя с их основной информацией
    const data = await callLastfmApi('user.getFriends', {
      user: username,
      limit: '50', // Ограничиваем количество друзей для оптимизации
    });

    // Проверяем есть ли друзья в ответе
    if (!data.friends || !data.friends.user) {
      return NextResponse.json({
        success: true,
        friends: [], // Возвращаем пустой массив если друзей нет
      });
    }

    // Last.fm может вернуть один объект или массив, нормализуем данные
    const friendsList = Array.isArray(data.friends.user) 
      ? data.friends.user 
      : [data.friends.user];

    // Преобразуем данные Last.fm в формат, удобный для фронтенда
    const formattedFriends = friendsList.map((friend: any) => ({
      id: friend.name, // Используем имя как ID
      name: friend.name,
      realname: friend.realname || friend.name,
      avatar: friend.image || [], // Массив изображений разных размеров
      url: friend.url,
      playcount: friend.playcount || '0',
      registered: friend.registered,
      // Добавляем совместимость как случайное число для демонстрации
      // В реальном приложении это можно вычислить сравнивая музыкальные вкусы
      compatibility: Math.floor(Math.random() * 40) + 60, // 60-100%
    }));

    return NextResponse.json({
      success: true,
      friends: formattedFriends,
      total: data.friends['@attr']?.total || formattedFriends.length,
    });
  } catch (error) {
    console.error('Error fetching Last.fm friends:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch friends' 
      },
      { status: 500 }
    );
  }
}