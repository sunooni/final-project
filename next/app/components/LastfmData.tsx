'use client';

import { useEffect, useState } from 'react';

interface LastfmUser {
  name: string;
  realname?: string;
  image?: Array<{ '#text': string; size: string }>;
  url: string;
  country?: string;
  age?: string;
  gender?: string;
  subscriber?: string;
  playcount?: string;
  playlists?: string;
  bootstrap?: string;
  registered?: { '#text': string; unixtime: string };
}

interface Track {
  name: string;
  artist: { '#text': string; mbid?: string };
  url: string;
  image?: Array<{ '#text': string; size: string }>;
  date?: { '#text': string; uts: string };
  mbid?: string;
}

export default function LastfmData() {
  const [userInfo, setUserInfo] = useState<LastfmUser | null>(null);
  const [lovedTracks, setLovedTracks] = useState<Track[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLastfmData();
  }, []);

  const fetchLastfmData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user info
      const userResponse = await fetch('/api/lastfm/user/info');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserInfo(userData.user);
      }

      // Fetch loved tracks
      const lovedResponse = await fetch('/api/lastfm/user/loved-tracks?limit=10');
      if (lovedResponse.ok) {
        const lovedData = await lovedResponse.json();
        setLovedTracks(lovedData.lovedtracks?.track || []);
      }

      // Fetch recent tracks
      const recentResponse = await fetch('/api/lastfm/user/recent-tracks?limit=10');
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentTracks(recentData.recenttracks?.track || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Last.fm data');
      console.error('Error fetching Last.fm data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-600 dark:text-zinc-400">Загрузка данных Last.fm...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-100 dark:bg-red-900 rounded-lg">
        <p className="text-red-800 dark:text-red-200">Ошибка: {error}</p>
        <button
          onClick={fetchLastfmData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* User Info */}
      {userInfo && (
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            Информация о пользователе
          </h2>
          <div className="space-y-2">
            <p className="text-zinc-700 dark:text-zinc-300">
              <strong>Имя:</strong> {userInfo.name}
            </p>
            {userInfo.realname && (
              <p className="text-zinc-700 dark:text-zinc-300">
                <strong>Настоящее имя:</strong> {userInfo.realname}
              </p>
            )}
            {userInfo.country && (
              <p className="text-zinc-700 dark:text-zinc-300">
                <strong>Страна:</strong> {userInfo.country}
              </p>
            )}
            {userInfo.playcount && (
              <p className="text-zinc-700 dark:text-zinc-300">
                <strong>Всего прослушано треков:</strong> {parseInt(userInfo.playcount).toLocaleString()}
              </p>
            )}
            <a
              href={userInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#D51007] hover:underline inline-block mt-2"
            >
              Профиль на Last.fm →
            </a>
          </div>
        </div>
      )}

      {/* Loved Tracks */}
      {lovedTracks.length > 0 && (
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            Любимые треки
          </h2>
          <div className="space-y-3">
            {lovedTracks.map((track, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-800 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-black dark:text-zinc-50">
                    {track.name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {track.artist['#text']}
                  </p>
                </div>
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D51007] hover:underline text-sm"
                >
                  Открыть →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tracks */}
      {recentTracks.length > 0 && (
        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-4">
            Недавние треки
          </h2>
          <div className="space-y-3">
            {recentTracks.map((track, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-800 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-black dark:text-zinc-50">
                    {track.name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {track.artist['#text']}
                  </p>
                  {track.date && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                      {new Date(parseInt(track.date.uts) * 1000).toLocaleString('ru-RU')}
                    </p>
                  )}
                </div>
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D51007] hover:underline text-sm"
                >
                  Открыть →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={fetchLastfmData}
        className="px-6 py-2 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full transition-colors"
      >
        Обновить данные
      </button>
    </div>
  );
}
