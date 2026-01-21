"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Trophy, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useGameStore } from "@/app/stores/useGameStore";

interface Friend {
  id: string;
  name: string;
  realname?: string;
  avatar: Array<{ "#text": string; size: string }>;
}

interface GuessTheFriendGameProps {
  friends: Friend[];
}

export const GuessTheFriendGame = ({ friends }: GuessTheFriendGameProps) => {
  // Управление состоянием игры
  const {
    isGameActive,
    currentRound,
    rounds,
    score,
    gameOver,
    gameFriends,
    startGame,
    setCurrentArtist,
    selectFriend,
    nextRound,
    resetGame,
    getCurrentRound,
  } = useGameStore();

  // Загружаем случайного артиста из объединённой истории всех друзей
  const loadRandomArtistFromAllFriends = useCallback(async (friendNames: string[]) => {
    try {
      const response = await fetch(
        `/api/lastfm/friends/random-artist-from-all?friends=${encodeURIComponent(friendNames.join(','))}`
      );

      if (!response.ok) {
        console.error('Ошибка загрузки случайного артиста из истории всех друзей');
        return null;
      }

      const data = await response.json();
      return data.artist?.name || null;
    } catch (error) {
      console.error('Ошибка загрузки случайного артиста:', error);
      return null;
    }
  }, []);

  // Загружаем статистику прослушиваний для артиста
  const loadArtistStats = useCallback(async (artistName: string, friendNames: string[]) => {
    try {
      const response = await fetch(
        `/api/lastfm/artist/stats?artist=${encodeURIComponent(artistName)}&friends=${encodeURIComponent(friendNames.join(','))}`
      );

      if (!response.ok) {
        console.error('Ошибка загрузки статистики артиста');
        return;
      }

      const data = await response.json();
      const playcounts: Record<string, number> = {};
      
      data.stats.forEach((stat: { friend: string; playcount: number }) => {
        playcounts[stat.friend] = stat.playcount;
      });

      // Устанавливаем текущего артиста с правильным другом (кто слушал больше)
      const correctFriend = data.winner.friend;
      setCurrentArtist(artistName, correctFriend, playcounts);
    } catch (error) {
      console.error('Ошибка загрузки статистики артиста:', error);
    }
  }, [setCurrentArtist]);

  // Начинаем игру с 3 раундами
  const handleStartGame = useCallback(async () => {
    if (friends.length < 2) return;

    // Инициализируем игру с выбранными друзьями (используем всех друзей или ограничиваем до 4 для лучшего UX)
    const selectedFriends = friends.slice(0, 4).map(f => ({
      id: f.id,
      name: f.name,
      realname: f.realname,
    }));

    startGame(selectedFriends);

    // Загружаем случайного артиста из объединённой истории всех друзей (раунд 1)
    const randomArtist = await loadRandomArtistFromAllFriends(selectedFriends.map(f => f.name));

    if (!randomArtist) {
      console.error('Не удалось загрузить артиста');
      resetGame();
      return;
    }

    // Загружаем статистику для этого артиста от всех друзей
    await loadArtistStats(randomArtist, selectedFriends.map(f => f.name));
  }, [friends, startGame, loadRandomArtistFromAllFriends, resetGame, loadArtistStats]);

  // Загружаем артиста для следующего раунда
  const loadNextRoundArtist = useCallback(async () => {
    if (gameFriends.length < 2) return;

    // Загружаем случайного артиста из объединённой истории всех друзей
    const randomArtist = await loadRandomArtistFromAllFriends(gameFriends.map(f => f.name));

    if (!randomArtist) {
      console.error('Не удалось загрузить артиста для следующего раунда');
      return;
    }

    // Загружаем статистику для этого артиста от всех друзей
    await loadArtistStats(randomArtist, gameFriends.map(f => f.name));
  }, [gameFriends, loadRandomArtistFromAllFriends, loadArtistStats]);

  // Обработка выбора друга в игре
  const handleGameFriendSelect = useCallback(async (friendName: string) => {
    selectFriend(friendName);

    // Показываем результат на 1.5 секунды, затем переходим к следующему раунду или завершаем игру
    setTimeout(() => {
      if (currentRound < 3) {
        nextRound();
        // Загружаем артиста для следующего раунда
        loadNextRoundArtist();
      } else {
        // Последний раунд - показываем результат, затем завершаем игру
        nextRound(); // Это переключит gameOver в true
      }
    }, 1500);
  }, [currentRound, selectFriend, nextRound, loadNextRoundArtist]);

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

      {!isGameActive && !gameOver ? (
        // Экран начала игры
        <div className="text-center py-8">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-star-gold" />
          <p className="text-muted-foreground mb-6">
            Кто из друзей больше слушал случайного артиста? Проверь свою
            интуицию!
          </p>
          <Button 
            variant="hero" 
            size="lg" 
            onClick={handleStartGame}
            disabled={friends.length < 2}
          >
            {friends.length < 2 ? "Нужно минимум 2 друга" : "Начать игру"}
          </Button>
        </div>
      ) : gameOver ? (
        // Экран конца игры с результатами
        <div className="text-center py-8 space-y-6">
          <Trophy className="w-16 h-16 mx-auto text-star-gold" />
          <div>
            <p className="text-muted-foreground mb-2">Ваш результат:</p>
            <p className="text-4xl font-bold text-gradient-nebula">
              {score} / 3
            </p>
            <p className="text-lg text-muted-foreground mt-2">
              {score === 3 && "Отлично! Ты отлично знаешь своих друзей!"}
              {score === 2 && "Хорошо! Ты хорошо знаешь своих друзей"}
              {score === 1 && "Неплохо! Попробуй еще раз"}
              {score === 0 && "Не расстраивайся! Попробуй еще раз"}
            </p>
          </div>

          {/* Показываем результаты всех раундов */}
          <div className="space-y-3 text-left">
            {rounds.map((round, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Раунд {index + 1}: {round.artist}</span>
                  {round.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Ты выбрал: {round.selectedFriend}
                </p>
                <p className="text-sm text-muted-foreground">
                  Правильный ответ: {round.correctFriend}
                </p>
              </div>
            ))}
          </div>

          <Button 
            variant="hero" 
            size="lg" 
            onClick={() => {
              resetGame();
              handleStartGame();
            }}
            className="w-full"
          >
            <Gamepad2 className="w-5 h-5 mr-2" />
            Сыграть еще раз
          </Button>
        </div>
      ) : (
        // Активный раунд игры
        <div className="space-y-6">
          {/* Прогресс игры */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Раунд {currentRound} из 3
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map((round) => (
                <div
                  key={round}
                  className={`h-2 w-8 rounded-full ${
                    round <= currentRound
                      ? 'bg-gradient-to-r from-nebula-purple to-nebula-pink'
                      : 'bg-muted/30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Текущий вопрос об артисте */}
          {getCurrentRound() && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Кто больше слушал:
              </p>
              <p className="text-3xl font-bold text-gradient-nebula mb-4">
                {getCurrentRound()!.artist}?
              </p>

              {/* Показываем результат, если друг был выбран */}
              {getCurrentRound()!.selectedFriend && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`p-4 rounded-lg mb-4 ${
                    getCurrentRound()!.isCorrect
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  {getCurrentRound()!.isCorrect ? (
                    <div className="flex items-center gap-2 justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-200">Ты хорошо знаешь друга!</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-center">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-200">Ты плохо знаешь друга!</span>
                      </div>
                      <p className="text-sm text-red-200">
                        {getCurrentRound()!.correctFriend} слушал этого артиста больше всех
                      </p>
                      {/* Показываем ссылку на отписку, если неправильно */}
                      <a
                        href={`https://www.last.fm/user/${getCurrentRound()!.correctFriend}/friends`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-300 hover:text-red-200 underline block"
                      >
                        Отписаться от {getCurrentRound()!.correctFriend} на Last.fm
                      </a>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Кнопки выбора друга */}
              {!getCurrentRound()!.selectedFriend && (
                <div className="grid grid-cols-2 gap-3">
                  {gameFriends.map((friend) => {
                    const friendData = friends.find(f => f.name === friend.name);
                    if (!friendData) return null;

                    const avatarUrl = getAvatarUrl(friendData.avatar);
                    const displayName = friendData.realname || friendData.name;
                    
                    return (
                      <Button
                        key={friend.id}
                        variant="glass"
                        className="h-auto py-4"
                        onClick={() => handleGameFriendSelect(friend.name)}
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
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
