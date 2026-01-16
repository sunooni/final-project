"use client";

import { useState, useEffect } from "react";
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

export const TraksUser = () => {
  const [lovedTracks, setLovedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Автоматически загружаем треки после успешной авторизации
    if (isAuthenticated === true && lovedTracks.length === 0 && !loading) {
      fetchLovedTracks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/lastfm/user/info");
      if (response.ok) {
        const authData = await response.json();
        setIsAuthenticated(authData.success && !!authData.user);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const fetchLovedTracks = async () => {
    if (!isAuthenticated) {
      setError("Необходима авторизация через Last.fm");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/lastfm/user/loved-tracks?limit=100");
      const tracksData: LovedTracksResponse = await response.json();

      if (tracksData.error) {
        setError(tracksData.error);
        return;
      }

      if (tracksData.lovedtracks?.track) {
        // Last.fm может вернуть один трек как объект или массив треков
        const tracks = Array.isArray(tracksData.lovedtracks.track)
          ? tracksData.lovedtracks.track
          : [tracksData.lovedtracks.track];
        setLovedTracks(tracks);
        setShowTracks(true);
      }
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
        <h1 className="text-2xl font-bold text-white mb-2">
          Любимые треки
        </h1>
        <p className="text-zinc-400 text-sm mb-4">
          Все ваши любимые треки из Last.fm
        </p>

        {isAuthenticated === false && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200">
              Для просмотра любимых треков необходимо авторизоваться через Last.fm
            </p>
          </div>
        )}

        {isAuthenticated && !showTracks && (
          <button
            onClick={fetchLovedTracks}
            disabled={loading}
            className="px-6 py-3 bg-[#D51007] hover:bg-[#B00D06] disabled:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors flex items-center gap-2"
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
                Загрузка...
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
                Загрузить любимые треки
              </>
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTracks && lovedTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Найдено треков: {lovedTracks.length}
              </h2>
              <button
                onClick={() => setShowTracks(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Скрыть
              </button>
            </div>

            <div className="grid gap-3">
              {lovedTracks.map((track, index) => (
                <motion.div
                  key={`${track.name}-${track.artist["#text"]}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.01 }}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">
                      {track.name}
                    </h3>
                    <p className="text-sm text-zinc-400 truncate">
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

        {showTracks && lovedTracks.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 text-center text-zinc-400"
          >
            <p>У вас пока нет любимых треков на Last.fm</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};