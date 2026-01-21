import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Gamepad2, Music, Shuffle, Trophy, Heart, AlertCircle } from "lucide-react";
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
  topArtist?: string; // Любимый артист друга
}

export const Friends = () => {
  const [gameActive, setGameActive] = useState(false);
  const [gameArtist, setGameArtist] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendsWithArtists, setFriendsWithArtists] = useState<Map<string, string>>(new Map());
  const [loadingArtists, setLoadingArtists] = useState<Set<string>>(new Set());

  // Store теперь обращается к  Last.fm API через наш бэкенд
  const { friends, isLoading, error, fetchFriends } = userFriendsStore();

  // Получаем друзей из LastFm
  useEffect(() => {
    fetchFriends();
  }, []);

  // Функция для загрузки топ артиста друга
  const fetchFriendTopArtist = async (friendName: string) => {
    // Если уже загружаем или уже загрузили, пропускаем
    if (loadingArtists.has(friendName) || friendsWithArtists.has(friendName)) {
      return;
    }

    setLoadingArtists(prev => new Set(prev).add(friendName));

    try {
      const response = await fetch(`/api/lastfm/user/top-artist?username=${encodeURIComponent(friendName)}&period=overall`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.artist?.name) {
          setFriendsWithArtists(prev => new Map(prev).set(friendName, data.artist.name));
        }
      }
    } catch (error) {
      console.error(`Error fetching top artist for ${friendName}:`, error);
    } finally {
      setLoadingArtists(prev => {
        const next = new Set(prev);
        next.delete(friendName);
        return next;
      });
    }
  };

  // Загружаем топ артистов для всех друзей с задержкой между запросами
  useEffect(() => {
    if (friends.length > 0) {
      friends.forEach((friend, index) => {
        // Задержка между запросами, чтобы не перегружать API
        setTimeout(() => {
          fetchFriendTopArtist(friend.name);
        }, index * 300); // 300ms между запросами
      });
    }
  }, [friends]);

  // Функция для получения URL аватара из массива изображений Last.fm
  // Last.fm возвращает массив изображений разных размеров, выбираем подходящий
  const getAvatarUrl = (images: Array<{ "#text": string; size: string }>) => {
    if (!images || images.length === 0) return null;
    
    // Ищем изображение среднего размера, если нет - берем любое доступное
    const mediumImage = images.find(img => img.size === 'medium');
    const largeImage = images.find(img => img.size === 'large');
    const anyImage = images.find(img => img["#text"]);
    
    return mediumImage?.["#text"] || largeImage?.["#text"] || anyImage?.["#text"] || null;
  };

  // Функция для получения первой буквы имени для аватара-заглушки
  // Используется когда у пользователя нет изображения профиля
  const getInitial = (name: string, realname?: string) => {
    const displayName = realname || name;
    return displayName.charAt(0).toUpperCase();
  };

  const startGame = () => {
    const artists = [
      "Radiohead",
      "Daft Punk",
      "Kendrick Lamar",
      "Frank Ocean",
      "The Weeknd",
    ];
    setGameArtist(artists[Math.floor(Math.random() * artists.length)]);
    setGameActive(true);
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
        {/* Friends List - теперь использует данные из Last.fm */}
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
                      onClick={() => setSelectedFriend(friend)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                        selectedFriend?.id === friend.id
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
                        <div className="text-sm text-muted-foreground">
                         {friendsWithArtists.has(friend.name) ? (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                           Топ Исполнитель - <Music className="w-3 h-3" />
                            {friendsWithArtists.get(friend.name)}
                          </p>
                        ) : loadingArtists.has(friend.name) ? (
                          <p className="text-xs text-muted-foreground mt-1">Загрузка...</p>
                        ) : null}
                        </div>
                        
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
            onClick={fetchFriends}
            disabled={isLoading}
          >
            <Users className="w-4 h-4 mr-2" />
            {isLoading ? "Загрузка..." : "Обновить список"}
          </Button>
        </motion.div>

        {/* Game & Playlist Generator - стили не изменены, как запрошено */}
        <div className="space-y-6">
          {/* Guess the Friend Game */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Gamepad2 className="w-6 h-6 text-accent" />
              <h3 className="text-xl font-semibold">Угадай друга</h3>
            </div>

            {!gameActive ? (
              <div className="text-center py-8">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-star-gold" />
                <p className="text-muted-foreground mb-6">
                  Кто из друзей больше слушал случайного артиста? Проверь свою
                  интуицию!
                </p>
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={startGame}
                  disabled={friends.length < 2}
                >
                  {friends.length < 2 ? "Нужно минимум 2 друга" : "Начать игру"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Кто больше слушал:
                  </p>
                  <p className="text-2xl font-bold text-gradient-nebula">
                    {gameArtist}?
                  </p>
                </div>

                {/* Используем реальных друзей вместо моковых данных */}
                <div className="grid grid-cols-2 gap-3">
                  {friends.slice(0, 4).map((friend) => {
                    const avatarUrl = getAvatarUrl(friend.avatar);
                    const displayName = friend.realname || friend.name;
                    
                    return (
                      <Button
                        key={friend.id}
                        variant="glass"
                        className="h-auto py-4"
                        onClick={() => {
                          setTimeout(() => setGameActive(false), 1500);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center text-sm font-bold overflow-hidden">
                            {avatarUrl ? (
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
                              getInitial(friend.name, friend.realname)
                            )}
                          </div>
                          <span className="truncate">{displayName}</span>
                        </div>
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setGameActive(false)}
                >
                  Пропустить
                </Button>
              </div>
            )}
          </motion.div>

          {/* Playlist Generator - обновлен для работы с реальными данными */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Music className="w-6 h-6 text-secondary" />
              <h3 className="text-xl font-semibold">Совместный плейлист</h3>
            </div>

            {selectedFriend ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
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
                  <div>
                    <p className="font-medium">С {selectedFriend.realname || selectedFriend.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFriend.compatibility}% совпадение вкусов
                    </p>
                  </div>
                </div>

                <Button variant="cosmic" className="w-full">
                  <Shuffle className="w-4 h-4 mr-2" />
                  Создать плейлист
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Найдём треки, которые понравятся вам обоим
                </p>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Выберите друга слева, чтобы создать совместный плейлист</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};