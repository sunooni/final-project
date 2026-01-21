import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Users, Shuffle, Heart, Compass, BarChart3, Play, ExternalLink, Download } from 'lucide-react';

interface Friend {
  name: string;
  realname: string;
  url: string;
  image?: string | null;
  playcount: number;
}

interface Track {
  name: string;
  artist: string;
  url: string;
  mbid?: string | null;
  image?: string | null;
  source?: string;
}

interface PlaylistResult {
  playlist: Track[];
  strategy: string;
  participants: string[];
  totalTracks: number;
  metadata: {
    userTracksCount: number;
    friendsTracksCount: number;
    generatedAt: string;
  };
}

const strategies = [
  {
    id: 'common',
    name: 'Общие вкусы',
    description: 'Треки, которые нравятся всем участникам',
    icon: Heart,
    color: 'text-red-400'
  },
  {
    id: 'diverse',
    name: 'Разнообразие',
    description: 'Уникальные треки от каждого участника',
    icon: Shuffle,
    color: 'text-blue-400'
  },
  {
    id: 'balanced',
    name: 'Сбалансированный',
    description: 'Равное количество треков от каждого',
    icon: BarChart3,
    color: 'text-green-400'
  },
  {
    id: 'discovery',
    name: 'Открытия',
    description: 'Новые треки, которые вы еще не слушали',
    icon: Compass,
    color: 'text-purple-400'
  }
];

interface CollaborativePlaylistCreatorProps {
  friends: Friend[];
}

export const CollaborativePlaylistCreator = ({ friends }: CollaborativePlaylistCreatorProps) => {
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState('balanced');
  const [playlistSize, setPlaylistSize] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playlistResult, setPlaylistResult] = useState<PlaylistResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleFriend = (friendName: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendName)
        ? prev.filter(name => name !== friendName)
        : [...prev, friendName]
    );
  };

  const generatePlaylist = async () => {
    if (selectedFriends.length === 0) {
      setError('Выберите хотя бы одного друга');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/playlists/generate-collaborative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friends: selectedFriends,
          strategy: selectedStrategy,
          limit: playlistSize,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка генерации плейлиста');
      }

      const result = await response.json();
      setPlaylistResult(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка генерации плейлиста');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportPlaylist = () => {
    if (!playlistResult) return;

    const playlistText = [
      `# Совместный плейлист`,
      `Участники: ${playlistResult.participants.join(', ')}`,
      `Стратегия: ${strategies.find(s => s.id === playlistResult.strategy)?.name}`,
      `Создан: ${new Date(playlistResult.metadata.generatedAt).toLocaleString('ru')}`,
      '',
      ...playlistResult.playlist.map((track, index) => 
        `${index + 1}. ${track.artist} - ${track.name} (от ${track.source})`
      )
    ].join('\n');

    const blob = new Blob([playlistText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collaborative-playlist-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (playlistResult) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        {/* Заголовок результата */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gradient-nebula mb-2">
                Совместный плейлист готов! 🎉
              </h3>
              <p className="text-muted-foreground">
                {playlistResult.totalTracks} треков • {strategies.find(s => s.id === playlistResult.strategy)?.name}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportPlaylist}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Экспорт
              </button>
              <button
                onClick={() => setPlaylistResult(null)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Создать новый
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-sm text-muted-foreground">Участники</p>
              <p className="font-semibold">{playlistResult.participants.length}</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <Music className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <p className="text-sm text-muted-foreground">Треков</p>
              <p className="font-semibold">{playlistResult.totalTracks}</p>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <Heart className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <p className="text-sm text-muted-foreground">Источников</p>
              <p className="font-semibold">{playlistResult.metadata.userTracksCount + playlistResult.metadata.friendsTracksCount}</p>
            </div>
          </div>
        </div>

        {/* Список треков */}
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-lg font-semibold mb-4">Треки плейлиста</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {playlistResult.playlist.map((track, index) => (
              <motion.div
                key={`${track.artist}-${track.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="text-sm text-muted-foreground w-8">
                  {index + 1}
                </span>
                
                {track.image ? (
                  <img 
                    src={track.image} 
                    alt={`${track.artist} - ${track.name}`}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{track.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">от {track.source}</p>
                </div>

                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      {/* Заголовок */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gradient-nebula mb-2">
          Создать совместный плейлист
        </h2>
        <p className="text-muted-foreground">
          Объедините музыкальные вкусы с друзьями и создайте идеальный плейлист
        </p>
      </div>

      {/* Выбор друзей */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Выберите друзей ({selectedFriends.length} выбрано)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {friends.map((friend) => (
            <motion.button
              key={friend.name}
              onClick={() => toggleFriend(friend.name)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedFriends.includes(friend.name)
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-white/20 hover:border-purple-500/50 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {friend.image ? (
                  <img 
                    src={friend.image} 
                    alt={friend.realname}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {friend.realname.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{friend.realname}</p>
                  <p className="text-xs text-muted-foreground truncate">@{friend.name}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Выбор стратегии */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Стратегия создания</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <motion.button
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedStrategy === strategy.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 hover:border-purple-500/50 bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-6 h-6 ${strategy.color} flex-shrink-0 mt-1`} />
                  <div>
                    <h4 className="font-semibold mb-1">{strategy.name}</h4>
                    <p className="text-sm text-muted-foreground">{strategy.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Настройки */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Настройки плейлиста</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Количество треков: {playlistSize}
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={playlistSize}
              onChange={(e) => setPlaylistSize(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>10</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Кнопка генерации */}
      <div className="text-center">
        <button
          onClick={generatePlaylist}
          disabled={isGenerating || selectedFriends.length === 0}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Создаем плейлист...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Создать плейлист
            </>
          )}
        </button>
        
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm mt-2"
          >
            {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};