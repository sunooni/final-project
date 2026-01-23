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
    // Определяем период: 2025 год (генерированные данные) + 2026 год (реальные данные)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Функция для получения строки даты в формате YYYY-MM-DD в локальном времени
    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Создаем Map для быстрого доступа к реальным данным (только 2026 год)
    const historyMap = new Map<string, ListeningDay>();
    listeningHistory.forEach(day => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      // Включаем только данные из 2026 года
      if (dayDate.getFullYear() === 2026) {
        historyMap.set(day.date, day);
      }
    });

    // Функция для генерации данных для дня (только для 2025 года)
    const generateDayData = (date: Date): CalendarDay => {
      const dayOfWeek = date.getDay();
      const dateStr = getLocalDateString(date);
      
      // Используем дату как seed для стабильной генерации
      const seed = date.getTime();
      const random1 = (seed * 9301 + 49297) % 233280 / 233280;
      const random2 = (seed * 7919 + 31337) % 233280 / 233280;
      const random3 = (seed * 5381 + 17389) % 233280 / 233280;
      const random4 = (seed * 2137 + 8191) % 233280 / 233280;
      
      // Добавляем сезонные влияния на настроение
      const month = date.getMonth();
      const seasonalMoodAdjustment = {
        joy: 0,
        energy: 0,
        calm: 0,
        sad: 0,
        love: 0
      };
      
      // Зимние месяцы (декабрь, январь, февраль) - больше спокойствия и меланхолии
      if (month === 11 || month === 0 || month === 1) {
        seasonalMoodAdjustment.calm += 0.08;
        seasonalMoodAdjustment.sad += 0.05;
        seasonalMoodAdjustment.love += 0.03;
      }
      // Весенние месяцы (март, апрель, май) - больше радости и энергии
      else if (month >= 2 && month <= 4) {
        seasonalMoodAdjustment.joy += 0.10;
        seasonalMoodAdjustment.energy += 0.08;
        seasonalMoodAdjustment.love += 0.05;
      }
      // Летние месяцы (июнь, июль, август) - максимум энергии и радости
      else if (month >= 5 && month <= 7) {
        seasonalMoodAdjustment.joy += 0.12;
        seasonalMoodAdjustment.energy += 0.15;
        seasonalMoodAdjustment.calm += 0.03;
      }
      // Осенние месяцы (сентябрь, октябрь, ноябрь) - больше меланхолии и любви
      else if (month >= 8 && month <= 10) {
        seasonalMoodAdjustment.sad += 0.08;
        seasonalMoodAdjustment.love += 0.10;
        seasonalMoodAdjustment.calm += 0.05;
      }
      
      // Влияние дня недели
      const weekdayMoodAdjustment = {
        joy: 0,
        energy: 0,
        calm: 0,
        sad: 0,
        love: 0
      };
      
      // Понедельник - больше меланхолии
      if (dayOfWeek === 1) {
        weekdayMoodAdjustment.sad += 0.05;
        weekdayMoodAdjustment.calm += 0.03;
      }
      // Пятница - больше радости и энергии
      else if (dayOfWeek === 5) {
        weekdayMoodAdjustment.joy += 0.08;
        weekdayMoodAdjustment.energy += 0.06;
      }
      // Выходные - больше любви и спокойствия
      else if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekdayMoodAdjustment.love += 0.07;
        weekdayMoodAdjustment.calm += 0.05;
      }
      
      // Базовое распределение настроений
      const baseMoodWeights = {
        'joy': 0.18,
        'energy': 0.18,
        'calm': 0.16,
        'sad': 0.25,
        'love': 0.23
      };
      
      // Применяем все корректировки
      const finalMoodWeights = {
        'joy': baseMoodWeights.joy + seasonalMoodAdjustment.joy + weekdayMoodAdjustment.joy + (random1 - 0.5) * 0.08,
        'energy': baseMoodWeights.energy + seasonalMoodAdjustment.energy + weekdayMoodAdjustment.energy + (random2 - 0.5) * 0.08,
        'calm': baseMoodWeights.calm + seasonalMoodAdjustment.calm + weekdayMoodAdjustment.calm + (random3 - 0.5) * 0.08,
        'sad': baseMoodWeights.sad + seasonalMoodAdjustment.sad + weekdayMoodAdjustment.sad + (random1 * random2 - 0.5) * 0.10,
        'love': baseMoodWeights.love + seasonalMoodAdjustment.love + weekdayMoodAdjustment.love + (random2 * random3 - 0.5) * 0.10
      };

      // Выбираем настроение на основе весов
      let selectedMood: 'joy' | 'energy' | 'calm' | 'sad' | 'love' = 'calm';
      let maxWeight = 0;
      
      for (const [mood, weight] of Object.entries(finalMoodWeights)) {
        if (weight > maxWeight) {
          maxWeight = weight;
          selectedMood = mood as 'joy' | 'energy' | 'calm' | 'sad' | 'love';
        }
      }

      // Генерируем количество треков с учетом дня недели и настроения
      // Уменьшаем базовое количество треков для достижения цели ~1322 треков за год
      let baseTracks = Math.floor(random1 * 8) + 1; // 1-8 треков базово
      
      // Больше треков в выходные (но не сильно)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        baseTracks += Math.floor(random2 * 4) + 1; // +1-4 трека
      }
      
      // Корректировка по настроению (небольшая)
      if (selectedMood === 'energy') {
        baseTracks += Math.floor(random3 * 3) + 1; // +1-3 трека
      } else if (selectedMood === 'sad') {
        baseTracks += Math.floor(random4 * 4) + 1; // +1-4 трека
      }
      
      const tracks = Math.min(baseTracks, 15); // Максимум 15 треков в день

      // Интенсивность зависит от количества треков и настроения
      let intensity = random3 * 0.6 + 0.3;
      if (tracks > 8) intensity += 0.2; // Увеличиваем интенсивность для дней с большим количеством треков
      if (selectedMood === 'energy' || selectedMood === 'joy') intensity += 0.1;
      intensity = Math.min(intensity, 1.0);

      return {
        date: dateStr,
        tracks,
        mood: selectedMood,
        intensity
      };
    };

    // Генерируем календарь для обоих годов
    const monthsData: MonthData[] = [];

    // Сначала добавляем 2025 год с генерированными данными
    for (let month = 0; month < 12; month++) {
      const year = 2025;
      
      // Определяем первый и последний день месяца
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);

      // Определяем день недели первого дня месяца (понедельник = 0, воскресенье = 6)
      const firstDayOfWeek = (monthStart.getDay() + 6) % 7;

      // Создаем массив всех дней месяца
      const allDays: CalendarDay[] = [];
      
      // Добавляем пустые ячейки в начале для выравнивания по дню недели
      for (let i = 0; i < firstDayOfWeek; i++) {
        allDays.push({ date: '', tracks: 0, mood: 'calm', intensity: 0, isEmpty: true });
      }

      // Добавляем дни месяца с генерированными данными
      const currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        allDays.push(generateDayData(currentDate));
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
    }

    // Теперь добавляем 2026 год с реальными данными
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Определяем, какие месяцы 2026 года нужно показать (до текущего месяца включительно)
    const monthsToShow2026 = currentYear === 2026 ? currentMonth + 1 : 12;
    
    for (let month = 0; month < monthsToShow2026; month++) {
      const year = 2026;
      
      // Определяем первый и последний день месяца
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      // Ограничиваем последний день текущим днем, если это текущий месяц
      const actualEnd = (year === currentYear && month === currentMonth) ? today : monthEnd;

      // Определяем день недели первого дня месяца (понедельник = 0, воскресенье = 6)
      const firstDayOfWeek = (monthStart.getDay() + 6) % 7;

      // Создаем массив всех дней месяца
      const allDays: CalendarDay[] = [];
      
      // Добавляем пустые ячейки в начале для выравнивания по дню недели
      for (let i = 0; i < firstDayOfWeek; i++) {
        allDays.push({ date: '', tracks: 0, mood: 'calm', intensity: 0, isEmpty: true });
      }

      // Добавляем дни месяца с реальными данными
      const currentDate = new Date(monthStart);
      while (currentDate <= actualEnd) {
        const dateStr = getLocalDateString(currentDate);
        const dayData = historyMap.get(dateStr);
        
        if (dayData) {
          // Используем реальные данные
          allDays.push(dayData);
        } else {
          // День без данных в 2026 году
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
    }

    return monthsData;
  }, [listeningHistory]); // Возвращаем зависимость от listeningHistory для 2026 года

  const moodStats = useMemo(() => {
    // Собираем ВСЕ дни с данными из структуры по месяцам (2025 + 2026)
    const allDays: CalendarDay[] = [];
    calendarData.forEach(monthData => {
      monthData.weeks.forEach(week => {
        week.forEach(day => {
          // Включаем все дни с треками > 0, исключая пустые дни
          if (day.tracks > 0 && !day.isEmpty) {
            allDays.push(day);
          }
        });
      });
    });
    
    if (allDays.length === 0) return [];
    
    const stats = { joy: 0, energy: 0, calm: 0, sad: 0, love: 0 };
    allDays.forEach(day => {
      stats[day.mood]++;
    });
    
    const total = allDays.length;
    return Object.entries(stats).map(([mood, count]) => ({
      mood: mood as keyof typeof moodColors,
      count,
      percentage: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [calendarData]);

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
          <p className="text-muted-foreground">Здесь вы можете увидеть ваш эмоциональный путь за последний год</p>
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
                {calendarData.reduce((sum, monthData) => 
                  sum + monthData.weeks.reduce((monthSum, week) => 
                    monthSum + week.reduce((weekSum, day) => 
                      weekSum + (day.tracks > 0 && !day.isEmpty ? day.tracks : 0), 0), 0), 0
                ).toLocaleString()}
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
