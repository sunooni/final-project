import { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUserStore, ListeningDay } from '@/app/stores/userStore';

const moodColors = {
  joy: 'bg-emotion-joy',
  energy: 'bg-emotion-energy',
  calm: 'bg-emotion-calm',
  sad: 'bg-emotion-sad',
  love: 'bg-emotion-love',
};

const moodLabels = {
  joy: 'Радость',
  energy: 'Энергия',
  calm: 'Спокойствие',
  sad: 'Меланхолия',
  love: 'Любовь',
};

const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const EmotionalCalendar = () => {
  const { 
    listeningHistory, 
    isLoadingMoodHistory, 
    moodHistoryError, 
    loadMoodHistory 
  } = useUserStore();

  // Автозагрузка при первом рендере
  useEffect(() => {
    if (listeningHistory.length === 0 && !isLoadingMoodHistory && !moodHistoryError) {
      loadMoodHistory();
    }
  }, [listeningHistory.length, isLoadingMoodHistory, moodHistoryError, loadMoodHistory]);

  const calendarData = useMemo(() => {
    if (listeningHistory.length === 0) return [];
    
    const weeks: ListeningDay[][] = [];
    let currentWeek: ListeningDay[] = [];

    // Get the first day and pad if necessary
    const firstDate = new Date(listeningHistory[0]?.date);
    const startPadding = (firstDate.getDay() + 6) % 7; // Convert to Monday-based

    for (let i = 0; i < startPadding; i++) {
      currentWeek.push({ date: '', tracks: 0, mood: 'calm', intensity: 0 });
    }

    listeningHistory.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', tracks: 0, mood: 'calm', intensity: 0 });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [listeningHistory]);

  const moodStats = useMemo(() => {
    if (listeningHistory.length === 0) return [];
    
    const stats = { joy: 0, energy: 0, calm: 0, sad: 0, love: 0 };
    listeningHistory.forEach(day => {
      stats[day.mood]++;
    });
    const total = listeningHistory.length;
    return Object.entries(stats).map(([mood, count]) => ({
      mood: mood as keyof typeof moodColors,
      count,
      percentage: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [listeningHistory]);

  if (isLoadingMoodHistory) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка эмоционального календаря...</div>
          <div className="text-sm text-gray-400">Анализируем ваши треки и настроение...</div>
        </div>
      </div>
    );
  }

  if (moodHistoryError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center max-w-md">
          <p className="text-red-400 mb-4">{moodHistoryError}</p>
          <button 
            onClick={loadMoodHistory}
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-gradient-nebula mb-2">Эмоциональный Календарь</h2>
          <p className="text-muted-foreground">Ваш музыкальный настрой за последние 90 дней</p>
        </div>
        <button
          onClick={loadMoodHistory}
          disabled={isLoadingMoodHistory}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoadingMoodHistory ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Загрузка...
            </>
          ) : (
            'Обновить данные'
          )}
        </button>
      </motion.div>

      <div className="flex-1 flex gap-8">
        {/* Calendar Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card rounded-2xl p-6 overflow-auto"
        >
          <div className="flex gap-1 mb-4">
            {months.map((month) => (
              <span 
                key={month} 
                className="text-xs text-muted-foreground"
                style={{ width: `${100 / 12}%`, textAlign: 'center' }}
              >
                {month}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1 mr-2">
              {weekDays.map(day => (
                <span key={day} className="text-xs text-muted-foreground h-3 flex items-center">
                  {day}
                </span>
              ))}
            </div>

            <div className="flex-1 flex gap-1">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <motion.div
                      key={`${weekIndex}-${dayIndex}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: weekIndex * 0.01 + dayIndex * 0.005 }}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-150 ${
                        day.date ? moodColors[day.mood] : 'bg-muted/20'
                      }`}
                      style={{ opacity: day.date ? 0.3 + day.intensity * 0.7 : 0.1 }}
                      title={day.date ? `${day.date}: ${day.tracks} треков, ${moodLabels[day.mood]}` : ''}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="w-64 glass-card rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Распределение эмоций</h3>
          
          <div className="space-y-4">
            {moodStats.map(({ mood, percentage }) => (
              <div key={mood} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${moodColors[mood]}`} />
                    <span className="text-sm">{moodLabels[mood]}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className={`h-full ${moodColors[mood]} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-3xl font-bold text-gradient-nebula">
                {listeningHistory.reduce((sum, d) => sum + d.tracks, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">треков за период</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Legend */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 flex items-center gap-6"
      >
        <span className="text-sm text-muted-foreground">Меньше</span>
        <div className="flex gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
            <div 
              key={opacity}
              className="w-3 h-3 rounded-sm bg-emotion-calm"
              style={{ opacity }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Больше</span>
      </motion.div>
    </div>
  );
};