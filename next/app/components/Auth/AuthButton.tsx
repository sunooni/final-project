'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id?: string;
  login?: string;
  display_name?: string;
  default_email?: string;
  real_name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  provider?: 'lastfm';
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
          if (data.authenticated) {
            setUser(data.user);
            router.push('/'); // например, '/dashboard'
          }
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
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.refresh();
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
            {user.display_name || user.real_name || user.login || user.username}
          </p>
          {user.default_email && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {user.default_email}
            </p>
          )}
          {user.provider && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
              Вход через Last.fm
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
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        Войдите через Last.fm
      </h2>
      
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button
          onClick={handleLogin}
          className="px-8 py-3 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
          Войти через Last.fm
        </button>
      </div>
    </div>
  );
}

