"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Music } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { FriendsList } from "./FriendsList";
import { GuessTheFriendGame } from "./GuessTheFriendGame";
import { userFriendsStore } from "@/app/stores/useFriendsStore";

interface Friend {
  id: string;
  name: string;
  realname?: string;
  avatar: Array<{ "#text": string; size: string }>;
  url: string;
  playcount: string;
  compatibility: number;
  favoriteGenre?: string;
}

interface RecentTrack {
  name: string;
  artist: string;
  album?: string;
  image?: string;
  url?: string;
  nowplaying?: boolean;
  date?: { uts: string; text: string };
}

export const Friends = () => {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [recentTrack, setRecentTrack] = useState<RecentTrack | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Друзья из Last.fm
  const { friends } = userFriendsStore();

  const handleFriendClick = async (friend: Friend) => {
    setSelectedFriend(friend);
    setIsLoadingTrack(true);
    setTrackError(null);
    setRecentTrack(null);
    
    try {
      const response = await fetch(`/api/lastfm/user/friend-recent-tracks?id=${encodeURIComponent(friend.id)}&limit=1`);
      
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
      setTrackError(error instanceof Error ? error.message : 'Ошибка загрузки трека');
    } finally {
      setIsLoadingTrack(false);
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

  // Вспомогательные функции для отображения аватара
  const getAvatarUrl = (images: Array<{ "#text": string; size: string }>) => {
    if (!images || images.length === 0) return null;
    
    const mediumImage = images.find(img => img.size === 'medium');
    const largeImage = images.find(img => img.size === 'large');
    const anyImage = images.find(img => img["#text"]);
    
    return mediumImage?.["#text"] || largeImage?.["#text"] || anyImage?.["#text"] || null;
  };

  const getInitial = (name: string, realname?: string) => {
    const displayName = realname || name;
    return displayName.charAt(0).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-bold text-gradient-nebula mb-2">
          Друзья
        </h2>
        <p className="text-muted-foreground">
          Сравните вкусы с друзьями и играйте вместе
        </p>
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Список друзей из Last.fm */}
        <FriendsList 
          onFriendSelect={handleFriendClick}
          selectedFriendId={selectedFriend?.id || null}
        />

        {/* Игра и последний трек */}
        <div className="space-y-6">
          {/* Игра "Угадай друга" */}
          <GuessTheFriendGame friends={friends} />

          {/* Последний трек друга */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Music className="w-6 h-6 text-secondary" />
              <h3 className="text-xl font-semibold">Последний трек</h3>
            </div>

            {selectedFriend ? (
              <div className="space-y-4">
                {/* Информация о друге — клик открывает профиль */}
                <button
                  type="button"
                  onClick={() => window.open(selectedFriend.url, '_blank')}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg w-full text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center font-bold overflow-hidden">
                    {(() => {
                      const avatarUrl = getAvatarUrl(selectedFriend.avatar);
                      const displayName = selectedFriend.realname || selectedFriend.name;
                      
                      return avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={avatarUrl} 
                          alt={displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        getInitial(selectedFriend.name, selectedFriend.realname)
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedFriend.realname || selectedFriend.name}</p>
                    <p className="text-sm text-muted-foreground">@{selectedFriend.name}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Нажмите для перехода в профиль
                  </div>
                </button>

                {/* Информация о треке */}
                {isLoadingTrack ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                    <span className="text-muted-foreground">Загружаем последний трек...</span>
                  </div>
                ) : trackError ? (
                  <div className="text-center py-6">
                    <Music className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-red-400 text-sm mb-2">{trackError}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleFriendClick(selectedFriend)}
                    >
                      Попробовать снова
                    </Button>
                  </div>
                ) : recentTrack ? (
                  <div className="space-y-4">
                    {/* Статус */}
                    <div className="text-center">
                      {recentTrack.nowplaying ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          Сейчас слушает
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">
                          <Music className="w-3 h-3" />
                          {recentTrack.date ? formatDate(recentTrack.date) : 'Недавно слушал'}
                        </div>
                      )}
                    </div>

                    {/* Детали трека */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      {recentTrack.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={recentTrack.image} 
                          alt={`${recentTrack.artist} - ${recentTrack.name}`}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Music className="w-6 h-6 text-white" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{recentTrack.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{recentTrack.artist}</p>
                        {recentTrack.album && (
                          <p className="text-xs text-muted-foreground truncate">{recentTrack.album}</p>
                        )}
                      </div>
                    </div>

                    {/* Анимация воспроизведения */}
                    {recentTrack.nowplaying && (
                      <motion.div 
                        className="flex justify-center gap-1 py-2"
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

                    {/* Действия */}
                    <div className="flex gap-2">
                      <Button 
                        variant="cosmic" 
                        className="flex-1"
                        onClick={() => window.open(recentTrack.url, '_blank')}
                      >
                        Открыть в Last.fm
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Music className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-muted-foreground text-sm">
                      {selectedFriend.realname || selectedFriend.name} еще не слушал музыку или скрыл свою активность
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="mb-2">Выберите друга слева</p>
                <p className="text-sm">Чтобы увидеть, что он слушает сейчас или слушал недавно</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};
