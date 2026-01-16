"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Track {
  name: string;
  artist: { "#text": string; mbid?: string };
  url: string;
  image?: Array<{ "#text": string; size: string }>;
  mbid?: string;
}

interface LovedTracksResponse {
  success: boolean;
  lovedtracks?: {
    track: Track | Track[];
    "@attr": {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
  error?: string;
}

interface DatabaseTrack {
  id: number;
  track: {
    id: number;
    name: string;
    image: string;
    url: string;
    artist: {
      id: number;
      name: string;
    };
    album?: {
      id: number;
      title: string;
      image: string;
    };
  };
  date?: string;
}

export const TraksUser = () => {
  const [lovedTracks, setLovedTracks] = useState<Track[]>([]);
  const [dbTracks, setDbTracks] = useState<DatabaseTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [useDatabase, setUseDatabase] = useState(false); // По умолчанию загружаем из Last.fm
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Предотвращаем повторные запросы
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        const data = await response.json();
        const authenticated =
          data.authenticated && data.user?.provider === "lastfm";
        setIsAuthenticated(authenticated);
        if (authenticated && data.user?.id) {
          setUserId(data.user.id);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  const loadTracksFromDB = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/music";
      const dbResponse = await fetch(
        `${apiUrl}/users/${userId}/loved-tracks?limit=50`
      );

      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        if (
          dbData.tracks &&
          Array.isArray(dbData.tracks) &&
          dbData.tracks.length > 0
        ) {
          // Если в БД есть треки, показываем их
          setDbTracks(dbData.tracks);
          setShowTracks(true);
          setUseDatabase(true);
          setLovedTracks([]);
        }
        // Если треков нет в БД, ничего не делаем (не показываем кнопку)
      }
    } catch (err) {
      console.error("Ошибка загрузки треков из БД:", err);
      // При ошибке ничего не делаем
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Автоматически загружаем треки из БД при наличии userId
    if (userId) {
      loadTracksFromDB();
    }
  }, [userId, loadTracksFromDB]);

  const fetchLovedTracks = async () => {
    if (!isAuthenticated) {
      setError("Необходима авторизация через Last.fm");
      return;
    }

    setLoading(true);
    setError(null);
    setShowTracks(false); // Скрываем треки до завершения синхронизации

    try {
      // Если есть userId, сначала проверяем БД
      if (userId) {
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:3001/api/music";
          const dbResponse = await fetch(
            `${apiUrl}/users/${userId}/loved-tracks?limit=50`
          );

          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (
              dbData.tracks &&
              Array.isArray(dbData.tracks) &&
              dbData.tracks.length > 0
            ) {
              // Если в БД есть треки, показываем их
              setDbTracks(dbData.tracks);
              setShowTracks(true);
              setUseDatabase(true);
              setLovedTracks([]);
              setLoading(false);
              return;
            }
          }
        } catch (dbErr) {
          console.log("Не удалось загрузить из БД, синхронизируем:", dbErr);
        }
      }

      // Получаем треки из Last.fm
      const response = await fetch("/api/lastfm/user/loved-tracks?limit=50");
      const data: LovedTracksResponse = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (!data.lovedtracks?.track) {
        setError("Треки не найдены");
        setLoading(false);
        return;
      }

      // Last.fm может вернуть один трек как объект или массив треков
      const tracks = Array.isArray(data.lovedtracks.track)
        ? data.lovedtracks.track
        : [data.lovedtracks.track];

      // Если есть userId, синхронизируем с БД перед показом
      if (userId) {
        try {
          const syncResponse = await fetch("/api/sync/loved-tracks", {
            method: "POST",
          });

          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            console.log("Треки синхронизированы с БД:", syncData);

            // После синхронизации загружаем из БД
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL ||
              "http://localhost:3001/api/music";
            const dbResponse = await fetch(
              `${apiUrl}/users/${userId}/loved-tracks?limit=50`
            );

            if (dbResponse.ok) {
              const dbData = await dbResponse.json();
              if (
                dbData.tracks &&
                Array.isArray(dbData.tracks) &&
                dbData.tracks.length > 0
              ) {
                // Показываем треки из БД
                setDbTracks(dbData.tracks);
                setShowTracks(true);
                setUseDatabase(true);
                setLovedTracks([]);
                setLoading(false);
                return;
              }
            }
          }
        } catch (syncErr) {
          console.error("Ошибка синхронизации:", syncErr);
          // Если синхронизация не удалась, показываем из Last.fm
        }
      }

      // Если нет userId или синхронизация не удалась, показываем из Last.fm
      setLovedTracks(tracks);
      setShowTracks(true);
      setUseDatabase(false);
      setDbTracks([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка при загрузке треков"
      );
      console.error("Error fetching loved tracks:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-4">
          Карта вкуса
        </h1>

        {isAuthenticated === false && (
          <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200">
              Для просмотра любимых треков необходимо авторизоваться через
              Last.fm
            </p>
          </div>
        )}

        {isAuthenticated && !showTracks && (
          <button
            onClick={fetchLovedTracks}
            disabled={loading}
            className="px-6 py-3 bg-[#D51007] hover:bg-[#B00D06] disabled:bg-zinc-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Загрузка и синхронизация...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                Показать любимые треки
              </>
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTracks &&
          (useDatabase ? dbTracks.length > 0 : lovedTracks.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-y-auto"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                  Любимые треки (
                  {useDatabase ? dbTracks.length : lovedTracks.length})
                </h2>
                <button
                  onClick={() => setShowTracks(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Скрыть
                </button>
              </div>

              <div className="grid gap-3">
                {/* Отображение треков из базы данных */}
                {useDatabase && dbTracks.length > 0
                  ? dbTracks.map((dbTrack, index) => (
                      <motion.div
                        key={dbTrack.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-black dark:text-zinc-50 truncate">
                            {dbTrack.track.name}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                            {dbTrack.track.artist.name}
                          </p>
                          {dbTrack.track.album && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                              {dbTrack.track.album.title}
                            </p>
                          )}
                        </div>

                        <a
                          href={dbTrack.track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Открыть на Last.fm
                        </a>
                      </motion.div>
                    ))
                  : // Отображение треков из Last.fm API
                    lovedTracks.map((track, index) => (
                      <motion.div
                        key={`${track.name}-${track.artist["#text"]}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-black dark:text-zinc-50 truncate">
                            {track.name}
                          </h3>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                            {track.artist["#text"]}
                          </p>
                        </div>

                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full text-sm font-medium transition-colors whitespace-nowrap"
                        >
                          Открыть на Last.fm
                        </a>
                      </motion.div>
                    ))}
              </div>
            </motion.div>
          )}

        {showTracks &&
          (useDatabase ? dbTracks.length === 0 : lovedTracks.length === 0) &&
          !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center text-zinc-600 dark:text-zinc-400"
            >
              <p>У вас пока нет любимых треков на Last.fm</p>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
};
