"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Track, DatabaseTrack, RecentTrack } from "./types";
import { LovedTracksList } from "./LovedTracksList";
import { RecentTracksList } from "./RecentTracksList";

type ViewMode = "loved" | "history";

export const TraksUser = () => {
  const [lovedTracks, setLovedTracks] = useState<Track[]>([]);
  const [dbTracks, setDbTracks] = useState<DatabaseTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<RecentTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTracks, setShowTracks] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("loved");
  const [useDatabase, setUseDatabase] = useState(false);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
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
          setDbTracks(dbData.tracks);
          setShowTracks(true);
          setUseDatabase(true);
          setLovedTracks([]);
        } else {
          setDbTracks([]);
          setShowTracks(true);
          setUseDatabase(true);
          setLovedTracks([]);
        }
      }
    } catch (err) {
      console.error("Ошибка загрузки треков из БД:", err);
      setError("Ошибка при загрузке треков из базы данных");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadRecentTracks = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/music";
      const dbResponse = await fetch(
        `${apiUrl}/users/${userId}/recent-tracks?limit=50`
      );

      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        if (dbData.tracks && Array.isArray(dbData.tracks)) {
          setRecentTracks(dbData.tracks);
          setShowTracks(true);
        } else {
          setRecentTracks([]);
          setShowTracks(true);
        }
      }
    } catch (err) {
      console.error("Ошибка загрузки истории из БД:", err);
      setError("Ошибка при загрузке истории прослушивания");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      if (viewMode === "loved") {
        loadTracksFromDB();
      } else {
        loadRecentTracks();
      }
    }
  }, [userId, viewMode, loadTracksFromDB, loadRecentTracks]);

  const syncTracksFromLastfm = async () => {
    if (!isAuthenticated || !userId) {
      setError("Необходима авторизация через Last.fm");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Синхронизируем любимые треки
      const syncLovedResponse = await fetch("/api/sync/loved-tracks", {
        method: "POST",
      });

      if (!syncLovedResponse.ok) {
        const errorData = await syncLovedResponse.json();
        setError(errorData.error || "Ошибка при синхронизации любимых треков");
        setLoading(false);
        return;
      }

      const syncLovedData = await syncLovedResponse.json();
      console.log("Любимые треки синхронизированы с БД:", syncLovedData);

      // Синхронизируем историю прослушивания
      const syncRecentResponse = await fetch("/api/sync/recent-tracks", {
        method: "POST",
      });

      if (!syncRecentResponse.ok) {
        const errorData = await syncRecentResponse.json();
        console.warn("Ошибка при синхронизации истории:", errorData.error);
        // Не прерываем процесс, если история не синхронизировалась
      } else {
        const syncRecentData = await syncRecentResponse.json();
        console.log("История прослушивания синхронизирована с БД:", syncRecentData);
      }

      // Обновляем данные в зависимости от текущего режима просмотра
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/music";

      if (viewMode === "loved") {
        // Загружаем обновленные любимые треки
        const dbResponse = await fetch(
          `${apiUrl}/users/${userId}/loved-tracks?limit=50`
        );

        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          if (dbData.tracks && Array.isArray(dbData.tracks)) {
            setDbTracks(dbData.tracks);
            setShowTracks(true);
            setUseDatabase(true);
            setLovedTracks([]);
          }
        } else {
          setError("Не удалось загрузить обновленные треки из базы данных");
        }
      } else {
        // Загружаем обновленную историю прослушивания
        const recentResponse = await fetch(
          `${apiUrl}/users/${userId}/recent-tracks?limit=50`
        );

        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          if (recentData.tracks && Array.isArray(recentData.tracks)) {
            setRecentTracks(recentData.tracks);
            setShowTracks(true);
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка при синхронизации треков"
      );
      console.error("Error syncing tracks:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "loved" ? "history" : "loved"));
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

        {isAuthenticated && (
          <div className="flex justify-between items-center gap-4">
            <button
              onClick={syncTracksFromLastfm}
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
                  Синхронизация...
                </>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.3" />
                  </svg>
                  Обновить треки из Last.fm
                </>
              )}
            </button>

            <button
              onClick={toggleViewMode}
              disabled={loading}
              className={`px-6 py-3 rounded-full font-medium transition-colors flex items-center gap-2 ${
                viewMode === "history"
                  ? "bg-[#D51007] hover:bg-[#B00D06] text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-black dark:text-zinc-50"
              } disabled:bg-zinc-400 disabled:cursor-not-allowed`}
            >
              {loading && viewMode === "history" ? (
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
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M3 3v18h18M7 16l4-4 4 4 6-6" />
                  </svg>
                  {viewMode === "loved" ? "Посмотреть историю" : "Любимые треки"}
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showTracks && viewMode === "loved" && (
          <motion.div
            key="loved"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 overflow-y-auto custom-scrollbar pr-2"
          >
            <LovedTracksList
              dbTracks={dbTracks}
              lovedTracks={lovedTracks}
              useDatabase={useDatabase}
              loading={loading}
            />
          </motion.div>
        )}

        {showTracks && viewMode === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 overflow-y-auto custom-scrollbar pr-2"
          >
            <RecentTracksList
              recentTracks={recentTracks}
              loading={loading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};