'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthStatus() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setMessage({ type: 'success', text: 'Авторизация успешна!' });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        no_code: 'Код авторизации не получен',
        no_token: 'Токен авторизации не получен',
        token_exchange_failed: 'Ошибка обмена токена',
        user_info_failed: 'Ошибка получения информации о пользователе',
        session_failed: 'Ошибка получения сессии',
        no_session_key: 'Ключ сессии не получен',
        internal_error: 'Внутренняя ошибка сервера',
      };
      setMessage({
        type: 'error',
        text: `Ошибка авторизации: ${errorMessages[error] || error}`,
      });
    }
  }, [searchParams]);

  if (!message) return null;

  return (
    <div
      className={`px-4 py-2 rounded-lg ${
        message.type === 'success'
          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      }`}
    >
      {message.text}
    </div>
  );
}

