import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Gamepad2, Music, Shuffle, Trophy, Heart } from "lucide-react";
import { Button } from "@/app/components/ui/button";
interface Friend {
  id: string;
  name: string;
  avatar: string;
  compatibility: number;
  topArtist: string;
}

// const mockFriends: Friend[] = [
//   {
//     id: "1",
//     name: "Алекс",
//     avatar: "A",
//     compatibility: 87,
//     topArtist: "Radiohead",
//   },
//   {
//     id: "2",
//     name: "Мария",
//     avatar: "М",
//     compatibility: 73,
//     topArtist: "Daft Punk",
//   },
//   {
//     id: "3",
//     name: "Дима",
//     avatar: "Д",
//     compatibility: 65,
//     topArtist: "Tyler, The Creator",
//   },
//   {
//     id: "4",
//     name: "Катя",
//     avatar: "К",
//     compatibility: 82,
//     topArtist: "Tame Impala",
//   },
// ];

export const Friends = () => {
  const [gameActive, setGameActive] = useState(false);
  const [gameArtist, setGameArtist] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

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
          Социальный Хаб
        </h2>
        <p className="text-muted-foreground">
          Сравните вкусы с друзьями и играйте вместе
        </p>
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Friends List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold">Музыкальные друзья</h3>
          </div>

          <div className="space-y-4">
            {mockFriends.map((friend, index) => (
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center text-lg font-bold">
                  {friend.avatar}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Топ: {friend.topArtist}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary">
                    <Heart className="w-4 h-4" />
                    <span className="font-bold">{friend.compatibility}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">совпадение</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button variant="glass" className="w-full mt-4">
            <Users className="w-4 h-4 mr-2" />
            Найти друзей
          </Button>
        </motion.div>

        {/* Game & Playlist Generator */}
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
                <Button variant="hero" size="lg" onClick={startGame}>
                  Начать игру
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

                <div className="grid grid-cols-2 gap-3">
                  {mockFriends.slice(0, 4).map((friend) => (
                    <Button
                      key={friend.id}
                      variant="glass"
                      className="h-auto py-4"
                      onClick={() => {
                        setTimeout(() => setGameActive(false), 1500);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center text-sm font-bold">
                          {friend.avatar}
                        </div>
                        <span>{friend.name}</span>
                      </div>
                    </Button>
                  ))}
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

          {/* Playlist Generator */}
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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center font-bold">
                    {selectedFriend.avatar}
                  </div>
                  <div>
                    <p className="font-medium">С {selectedFriend.name}</p>
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
