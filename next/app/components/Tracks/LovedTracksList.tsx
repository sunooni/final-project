"use client";

import { motion } from "framer-motion";
import { Music } from "lucide-react";
import { DatabaseTrack, Track } from "./types";

interface LovedTracksListProps {
  dbTracks: DatabaseTrack[];
  lovedTracks: Track[];
  useDatabase: boolean;
  loading: boolean;
  totalTracks?: number;
}

export const LovedTracksList = ({
  dbTracks,
  lovedTracks,
  useDatabase,
  loading,
  totalTracks,
}: LovedTracksListProps) => {
  const hasTracks = useDatabase ? dbTracks.length > 0 : lovedTracks.length > 0;
  
  const displayCount = totalTracks !== undefined 
    ? totalTracks 
    : (useDatabase ? dbTracks.length : lovedTracks.length);

  if (!hasTracks && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center"
      >
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">
          {useDatabase
            ? "ж-ж-ж (светлячки)"
            : "У вас пока нет любимых треков на Last.fm"}
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          Любимые треки ({displayCount})
        </h2>
      </div>

      <div className="grid gap-3">
        {useDatabase && dbTracks.length > 0
          ? dbTracks.map((dbTrack, index) => (
              <motion.div
                key={dbTrack.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow"
              >
                {dbTrack.track.image ? (
                  <img 
                    src={dbTrack.track.image} 
                    alt={`${dbTrack.track.artist.name} - ${dbTrack.track.name}`}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Music className="w-8 h-8 text-white" />
                  </div>
                )}
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
          : lovedTracks.map((track, index) => {
              const trackImage = track.image?.[2]?.["#text"] || null;
              return (
                <motion.div
                  key={`${track.name}-${track.artist["#text"]}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg hover:shadow-md transition-shadow"
                >
                  {trackImage ? (
                    <img 
                      src={trackImage} 
                      alt={`${track.artist["#text"]} - ${track.name}`}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Music className="w-8 h-8 text-white" />
                    </div>
                  )}
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
              );
            })}
      </div>
    </>
  );
};
