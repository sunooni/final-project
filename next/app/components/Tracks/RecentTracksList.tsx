"use client";

import { motion } from "framer-motion";
import { RecentTrack } from "./types";

interface RecentTracksListProps {
  recentTracks: RecentTrack[];
  loading: boolean;
  totalTracks?: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const RecentTracksList = ({
  recentTracks,
  loading,
  totalTracks,
}: RecentTracksListProps) => {
  const displayCount = totalTracks !== undefined ? totalTracks : recentTracks.length;
  if (recentTracks.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center"
      >
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          В базе данных пока нет истории прослушивания. История будет
          синхронизирована автоматически при авторизации через Last.fm.
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          История прослушивания ({displayCount})
        </h2>
      </div>

      <div className="grid gap-3">
        {recentTracks.map((recentTrack, index) => (
          <motion.div
            key={recentTrack.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-black dark:text-zinc-50 truncate">
                {recentTrack.track.name}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                {recentTrack.track.artist.name}
              </p>
              {recentTrack.track.album && (
                <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                  {recentTrack.track.album.title}
                </p>
              )}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {formatDate(recentTrack.playedAt)}
              </p>
            </div>

            <a
              href={recentTrack.track.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#D51007] hover:bg-[#B00D06] text-white rounded-full text-sm font-medium transition-colors whitespace-nowrap"
            >
              Открыть на Last.fm
            </a>
          </motion.div>
        ))}
      </div>
    </>
  );
};
