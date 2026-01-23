'use client';

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

interface CalendarDay extends ListeningDay {
  isEmpty?: boolean;
}

interface MonthData {
  month: number;
  year: number;
  weeks: CalendarDay[][];
}

export const EmotionalCalendar = () => {
  const { 
    listeningHistory, 
    isLoadingMoodHistory, 
    moodHistoryError, 
    loadMoodHistory,
    syncMoodHistory 
  } = useUserStore();

  // Автозагрузка при первом рендере (только на клиенте)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (listeningHistory.length === 0 && !isLoadingMoodHistory && !moodHistoryError) {
      loadMoodHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningHistory.length, isLoadingMoodHistory, moodHistoryError]);

  const calendarData = useMemo(() => {
    // Определяем период: последний год (365 дней)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 365);

    // Функция для получения строки даты в формате YYYY-MM-DD в локальном времени
    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Создаем Map для быстрого доступа к данным по дате
    const historyMap = new Map<string, ListeningDay>();
    listeningHistory.forEach(day => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      if (dayDate >= startDate && dayDate <= today) {
        historyMap.set(day.date, day);
      }
    });

    // Генерируем календарь для каждого месяца
    const monthsData: MonthData[] = [];
    const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let currentMonth = new Date(startMonth);

    while (currentMonth <= endMonth) {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      // Определяем первый и последний день месяца
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      // Ограничиваем период актуальными датами
      const actualStart = monthStart < startDate ? startDate : monthStart;
      const actualEnd = monthEnd > today ? today : monthEnd;

      // Определяем день недели первого отображаемого дня (понедельник = 0, воскресенье = 6)
      const firstDayOfWeek = (actualStart.getDay() + 6) % 7;

      // Создаем массив всех дней месяца
      const allDays: CalendarDay[] = [];
      
      // Добавляем пустые ячейки в начале для выравнивания по дню недели
      for (let i = 0; i < firstDayOfWeek; i++) {
        allDays.push({ date: '', tracks: 0, mood: 'calm', intensity: 0, isEmpty: true });
      }

      // Добавляем дни месяца
      const currentDate = new Date(actualStart);
      while (currentDate <= actualEnd) {
        const dateStr = getLocalDateString(currentDate);
        const dayData = historyMap.get(dateStr);
        
        if (dayData) {
          allDays.push(dayData);
        } else {
          // День без данных, но в пределах периода
          allDays.push({ 
            date: dateStr, 
            tracks: 0, 
            mood: 'calm', 
            intensity: 0.1 
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Добавляем пустые ячейки в конце месяца для завершения последней недели
      const remainingDays = 7 - (allDays.length % 7);
      if (remainingDays < 7) {
        for (let i = 0; i < remainingDays; i++) {
          allDays.push({ date: '', tracks: 0, mood: 'calm', intensity: 0, isEmpty: true });
        }
      }

      // Разбиваем на недели (массивы по 7 дней)
      const weeks: CalendarDay[][] = [];
      for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7));
      }

      monthsData.push({
        month,
        year,
        weeks
      });

      // Переходим к следующему месяцу
      currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    return monthsData;
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
        className="mb-6 flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold text-gradient-nebula mb-2">Эмоциональный Календарь</h2>
          <p className="text-muted-foreground">Ваш музыкальный настрой за последний год</p>
        </div>
        <button
          onClick={syncMoodHistory}
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

      <div className="flex-1 flex flex-col lg:flex-row gap-8">
        {/* Calendar Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card rounded-2xl p-6 overflow-auto"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {calendarData.map((monthData, monthIndex) => (
              <div 
                key={`${monthData.year}-${monthData.month}`}
                className="flex flex-col"
              >
                {/* Заголовок месяца */}
                <div className="text-sm font-semibold text-muted-foreground mb-2 text-center">
                  {months[monthData.month]} {monthData.year}
                </div>

                {/* Заголовки дней недели */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((day) => (
                    <div 
                      key={day}
                      className="text-xs text-muted-foreground text-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Недели месяца */}
                <div className="flex flex-col gap-1">
                  {monthData.weeks.map((week, weekIndex) => (
                    <div 
                      key={weekIndex}
                      className="grid grid-cols-7 gap-1"
                    >
                      {week.map((day, dayIndex) => {
                        if (day.isEmpty || !day.date) {
                          return (
                            <div 
                              key={`${monthIndex}-${weekIndex}-${dayIndex}`}
                              className="w-4 h-4 rounded-sm bg-transparent"
                            />
                          );
                        }

                        const hasTracks = day.tracks > 0;
                        const opacity = hasTracks 
                          ? 0.3 + day.intensity * 0.7 
                          : 0.4;

                        return (
                          <motion.div
                            key={`${monthIndex}-${weekIndex}-${dayIndex}`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              delay: (monthIndex * 0.05) + (weekIndex * 0.01) + (dayIndex * 0.001) 
                            }}
                            className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-125 hover:z-10 hover:shadow-lg ${
                              hasTracks 
                                ? moodColors[day.mood] 
                                : 'bg-gray-500/20'
                            }`}
                            style={{ opacity }}
                            title={
                              hasTracks
                                ? `${day.date}: ${day.tracks} треков, ${moodLabels[day.mood]}` 
                                : `${day.date}: нет прослушиваний`
                            }
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full lg:w-64 glass-card rounded-2xl p-6 shrink-0"
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
        className="mt-4 flex items-center gap-6 flex-wrap"
      >
        <span className="text-sm text-muted-foreground">Меньше</span>
        <div className="flex gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
            <div 
              key={opacity}
              className="w-4 h-4 rounded-sm bg-emotion-calm"
              style={{ opacity }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Больше</span>
      </motion.div>
    </div>
  );
};
