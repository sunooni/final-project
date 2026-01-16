'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  login: string;
  display_name?: string;
  default_email?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
}

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
          // Перенаправляем на дашборд после успешной авторизации
          router.push('/taste-map');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-zinc-600 dark:text-zinc-400">Загрузка...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
            Добро пожаловать!
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300">
            {user.display_name || user.real_name || user.login}
          </p>
          {user.default_email && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {user.default_email}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Войдите через Яндекс.Музыку
      </h2>
      <button
        onClick={handleLogin}
        className="px-8 py-3 bg-[#FC3F1D] hover:bg-[#E02E0E] text-white rounded-full font-medium transition-colors flex items-center gap-2"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        Войти через Яндекс
      </button>
    </div>
  );
}

