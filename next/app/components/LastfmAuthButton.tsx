'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LastfmUser {
  name: string;
  realname?: string;
}

export default function LastfmAuthButton() {
  const [user, setUser] = useState<LastfmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/lastfm/user/info');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
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
    window.location.href = '/api/auth/lastfm/login';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/lastfm/logout', { method: 'POST' });
      setUser(null);
      router.push('/auth/lastfm');
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
            {user.realname || user.name}
          </p>
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
        Войдите через Last.fm
      </h2>
      <button
        onClick={handleLogin}
        className="px-8 py-3 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full font-medium transition-colors flex items-center gap-2"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.419 0 3.188 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.284 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.629-3.932l-1.76-.385c-1.21-.275-1.566-.77-1.566-1.594 0-.935.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.188 3.602l1.869.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.932-1.457-4.591-3.464l-.907-2.749c-1.155-3.574-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/>
        </svg>
        Войти через Last.fm
      </button>
    </div>
  );
}
