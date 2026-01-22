import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    
    // Валидация входных данных
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Проверка длины сообщения
    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message is too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Получаем userId из cookies
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('user_id');
    const userId = userIdCookie ? parseInt(userIdCookie.value) : null;

    // Валидация conversationHistory
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'conversationHistory must be an array' },
        { status: 400 }
      );
    }

    // Вызываем Express endpoint через HTTP
    const endpoint = userId ? `/users/${userId}/chat` : '/chat';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationHistory }),
    });

    if (!response.ok) {
      // Пытаемся получить JSON ошибку, если возможно
      let errorMessage = 'Failed to process message';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Если ответ не JSON, используем статус
        if (response.status === 502) {
          errorMessage = 'API сервер недоступен. Попробуйте позже.';
        } else if (response.status === 503) {
          errorMessage = 'Сервис временно недоступен. Попробуйте позже.';
        } else {
          errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json({ response: data.response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process message' 
      },
      { status: 500 }
    );
  }
}