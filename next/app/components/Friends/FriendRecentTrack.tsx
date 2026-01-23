import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Clock, ExternalLink, X, Loader } from 'lucide-react';

interface Friend {
  name: string;
  realname: string;
  url: string;
  image?: string | null;
  playcount: number;
}

interface RecentTrack {
  name: string;
  artist: string;
  album: string;
  url: string;
  mbid?: string | null;
  image?: string | null;
  date?: {
    uts: string;
    text: string;
  } | null;
  nowplaying: boolean;
}

interface FriendRecentTrackProps {
  friend: Friend;
  isOpen: boolean;
  onClose: () => void;
}

export const FriendRecentTrack = ({ friend, isOpen, onClose }: FriendRecentTrackProps) => {
  const [recentTrack, setRecentTrack] = useState<RecentTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && friend) {
      loadRecentTrack();
    }
  }, [isOpen, friend]);

  const loadRecentTrack = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/lastfm/user/friend-recent-tracks?id=${encodeURIComponent(friend.name)}&limit=1`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }

      const data = await response.json();
      const tracks = data.tracks || [];
      
      if (tracks.length > 0) {
        setRecentTrack(tracks[0]);
      } else {
        setRecentTrack(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка загрузки трека');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateObj: { uts: string; text: string }) => {
    const date = new Date(parseInt(dateObj.uts) * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="glass-card rounded-2xl p-6 border border-white/20">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {friend.image ? (
                    <img 
                      src={friend.image} 
                      alt={friend.realname}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                      {friend.realname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{friend.realname}</h3>
                    <p className="text-sm text-muted-foreground">@{friend.name}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-muted-foreground">Загружаем последний трек...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-red-400 mb-2">{error}</p>
                    <button
                      onClick={loadRecentTrack}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Попробовать снова
                    </button>
                  </div>
                ) : recentTrack ? (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="text-center">
                      {recentTrack.nowplaying ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          Сейчас слушает
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">
                          <Clock className="w-3 h-3" />
                          {recentTrack.date ? formatDate(recentTrack.date) : 'Недавно слушал'}
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                      {recentTrack.image ? (
                        <img 
                          src={recentTrack.image} 
                          alt={`${recentTrack.artist} - ${recentTrack.name}`}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Music className="w-8 h-8 text-white" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg mb-1 truncate">
                          {recentTrack.name}
                        </h4>
                        <p className="text-muted-foreground truncate mb-1">
                          {recentTrack.artist}
                        </p>
                        {recentTrack.album && (
                          <p className="text-sm text-muted-foreground truncate">
                            {recentTrack.album}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={recentTrack.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть в Last.fm
                      </a>
                      <a
                        href={friend.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                      >
                        Профиль
                      </a>
                    </div>

                    {/* Now Playing Animation */}
                    {recentTrack.nowplaying && (
                      <motion.div 
                        className="flex justify-center items-end gap-1 py-2 h-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
                            animate={{
                              height: [4, 16, 4],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.1,
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-muted-foreground">
                      {friend.realname} еще не слушал музыку или скрыл свою активность
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};