import { motion } from 'framer-motion';
import { TrendingUp, Music, Calendar } from 'lucide-react';
import { useUserStore } from '@/app/stores/userStore';
import { Period } from '@/app/utils/timelineBuilder';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const periodOptions: { value: Period; label: string }[] = [
  { value: '7day', label: '7 дней' },
  { value: '1month', label: 'Месяц' },
  { value: '3month', label: '3 мес' },
  { value: '6month', label: '6 мес' },
  { value: '12month', label: 'Год' },
];

export const EvolutionTimeline = () => {
  const {
    topArtistsOverall,
    timeline,
    selectedPeriod,
    statsPeriod,
    listeningStats,
    isLoadingTimeline,
    isLoadingStats,
    isLoadingTopArtists,
    timelineError,
    statsError,
    topArtistsError,
    setSelectedPeriod,
    setStatsPeriod,
    loadTimeline,
    loadListeningStats,
    loadTopArtistsOverall,
  } = useUserStore();

  // Автозагрузка при первом рендере
  useEffect(() => {
    if (timeline.length === 0 && !isLoadingTimeline && !timelineError) {
      loadTimeline();
    }
    if (Object.keys(listeningStats).length === 0 && !isLoadingStats && !statsError) {
      loadListeningStats();
    }
    if (topArtistsOverall.length === 0 && !isLoadingTopArtists && !topArtistsError) {
      loadTopArtistsOverall();
    }
  }, [
    timeline.length, 
    isLoadingTimeline, 
    timelineError, 
    listeningStats, 
    isLoadingStats, 
    statsError, 
    topArtistsOverall.length,
    isLoadingTopArtists,
    topArtistsError,
    loadTimeline, 
    loadListeningStats,
    loadTopArtistsOverall
  ]);

  // Mock top artists data if empty - теперь используем реальные данные
  const displayArtists = topArtistsOverall.length > 0 ? topArtistsOverall : [
    { name: 'Radiohead', playcount: 1250, url: '#' },
    { name: 'Daft Punk', playcount: 980, url: '#' },
    { name: 'Kendrick Lamar', playcount: 875, url: '#' },
    { name: 'Frank Ocean', playcount: 720, url: '#' },
    { name: 'Tame Impala', playcount: 650, url: '#' },
  ];

  const activeItem = timeline.find((t) => t.period === selectedPeriod);

  if (isLoadingTimeline) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка временной шкалы...</div>
          <div className="text-sm text-gray-400">Анализируем вашу музыкальную эволюцию...</div>
        </div>
      </div>
    );
  }

  if (timelineError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">{timelineError}</p>
          <button 
            onClick={loadTimeline}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold text-gradient-nebula mb-2">Эволюция Вкуса</h2>
          <p className="text-muted-foreground">Как менялся ваш музыкальный путь через время</p>
        </div>

        {/* Переключатель периодов */}
        <div className="inline-flex rounded-full bg-black/20 p-1 glass-card">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedPeriod(opt.value)}
              className={cn(
                'px-3 py-1 text-xs md:text-sm rounded-full transition-colors',
                selectedPeriod === opt.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'text-gray-300 hover:bg-white/10'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="flex-1 flex gap-8">
        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card rounded-2xl p-6"
        >
          <div className="relative">
            {/* Линия */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-pink-500" />

            {activeItem ? (
              <motion.div
                key={activeItem.period}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative pl-20"
              >
                {/* Маркер периода */}
                <div
                  className="absolute left-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
                  style={{ backgroundColor: activeItem.color }}
                >
                  <Calendar className="w-4 h-4 text-white" />
                </div>

                {/* Контент */}
                <div className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-transform">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: activeItem.color }}
                    >
                      {activeItem.label}
                    </span>
                    <TrendingUp className="w-6 h-6 text-muted-foreground" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Топ жанр</p>
                      <p className="text-xl font-medium">{activeItem.topGenre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Топ артист</p>
                      <p className="text-xl font-medium">{activeItem.topArtist}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <p>Нет данных для выбранного периода</p>
                <button 
                  onClick={loadTimeline}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Обновить данные
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="w-80 space-y-6"
        >
          {/* Переключатель периодов для статистики */}
          <div className="mb-4 inline-flex rounded-full bg-black/20 p-1 glass-card">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatsPeriod(opt.value)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full transition-colors',
                  statsPeriod === opt.value
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'text-gray-300 hover:bg-white/10'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Total listening time */}
          <div className="glass-card rounded-2xl p-6 text-center">
            <Music className="w-10 h-10 mx-auto mb-4 text-purple-500" />
            <p className="text-4xl font-bold text-gradient-nebula">
              {Math.round((listeningStats[statsPeriod]?.minutes || 0) / 60).toLocaleString()}
            </p>
            <p className="text-muted-foreground mt-1">часов музыки</p>
            <p className="text-sm text-muted-foreground mt-3">
              Это {Math.round((listeningStats[statsPeriod]?.minutes || 0) / 60 / 24)} дней непрерывного прослушивания
              <br />
              <span className="text-xs">за {periodOptions.find(p => p.value === statsPeriod)?.label}</span>
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-muted-foreground">Всего треков</p>
              <p className="text-2xl font-bold text-gradient-nebula">
                {(listeningStats[statsPeriod]?.playcount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Top artists all time */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Топ артисты всех времён</h3>
            <div className="space-y-3">
              {displayArtists.slice(0, 5).map((artist, index) => (
                <motion.div 
                  key={artist.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-2xl font-bold text-muted-foreground w-8">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{artist.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {artist.playcount.toLocaleString()} прослушиваний
                    </p>
                  </div>
                  <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      style={{ 
                        width: `${(artist.playcount / displayArtists[0].playcount) * 100}%` 
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
  