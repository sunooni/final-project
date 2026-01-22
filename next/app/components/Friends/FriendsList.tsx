"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Heart, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
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

interface FriendsListProps {
  onFriendSelect: (friend: Friend) => void;
  selectedFriendId: string | null;
}

export const FriendsList = ({ onFriendSelect, selectedFriendId }: FriendsListProps) => {
  // Друзья из Last.fm
  const { friends, isLoading, error, fetchFriends } = userFriendsStore();

  // Загружаем друзей при монтировании компонента
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Функция для получения URL аватара из массива изображений Last.fm
  const getAvatarUrl = (images: Array<{ "#text": string; size: string }>) => {
    if (!images || images.length === 0) return null;
    
    const mediumImage = images.find(img => img.size === 'medium');
    const largeImage = images.find(img => img.size === 'large');
    const anyImage = images.find(img => img["#text"]);
    
    return mediumImage?.["#text"] || largeImage?.["#text"] || anyImage?.["#text"] || null;
  };

  // Функция для получения первой буквы имени для аватара-заглушки
  const getInitial = (name: string, realname?: string) => {
    const displayName = realname || name;
    return displayName.charAt(0).toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-semibold">Ваши друзья</h3>
      </div>

      {/* Показываем состояние загрузки */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Загрузка друзей...</span>
        </div>
      )}

      {/* Показываем ошибку если не удалось загрузить друзей */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/30 rounded-lg mb-4">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* Отображаем список друзей из Last.fm или сообщение об их отсутствии */}
      {!isLoading && !error && (
        <div className="space-y-4">
          {friends.length > 0 ? (
            friends.map((friend, index) => {
              const avatarUrl = getAvatarUrl(friend.avatar);
              const displayName = friend.realname || friend.name;
              
              return (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  onClick={() => onFriendSelect(friend)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                    selectedFriendId === friend.id
                      ? "bg-primary/20 border border-primary/50"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  {/* Аватар друга - используем изображение из Last.fm или инициал */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center text-lg font-bold overflow-hidden">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={avatarUrl} 
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Если изображение не загрузилось, показываем инициал
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      getInitial(friend.name, friend.realname)
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{displayName}</p>
                    {friend.favoriteGenre && (
                      <p className="text-sm text-muted-foreground mt-0.5">Топ жанр: {friend.favoriteGenre}</p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-primary">
                      <Heart className="w-4 h-4" />
                      <span className="font-bold">{friend.compatibility}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">совпадение</p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            // Показываем сообщение если у пользователя нет друзей в Last.fm
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="mb-2">У вас пока нет друзей в Last.fm</p>
              <p className="text-sm">Добавьте друзей на Last.fm, чтобы они появились здесь</p>
            </div>
          )}
        </div>
      )}

      {/* Кнопка обновления списка друзей */}
      <Button 
        variant="glass" 
        className="w-full mt-4"
        onClick={() => fetchFriends()}
        disabled={isLoading}
      >
        <Users className="w-4 h-4 mr-2" />
        {isLoading ? "Загрузка..." : "Обновить список"}
      </Button>
    </motion.div>
  );
};
