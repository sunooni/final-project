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

    // Фильтруем историю по периоду и создаем Map для быстрого доступа
    const historyMap = new Map<string, ListeningDay>();
    listeningHistory.forEach(day => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      // Включаем только дни в пределах периода
      if (dayDate >= startDate && dayDate <= today) {
        historyMap.set(day.date, day);
      }
    });

    // Функция для получения строки даты в формате YYYY-MM-DD в локальном времени
    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Группируем дни по месяцам
    interface MonthData {
      month: number;
      year: number;
      weeks: ListeningDay[][];
    }

    const monthsData: MonthData[] = [];
    const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Генерируем дни по месяцам, сохраняя непрерывность недель между месяцами
    const currentMonth = new Date(startMonth);
    let currentWeek: ListeningDay[] = [];

    while (currentMonth <= endMonth) {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      // Ограничиваем месяц периодом
      const actualStart = monthStart < startDate ? startDate : monthStart;
      const actualEnd = monthEnd > today ? today : monthEnd;

      const weeks: ListeningDay[][] = [];
      const currentDate = new Date(actualStart);
      currentDate.setHours(0, 0, 0, 0);
      const actualEndTime = actualEnd.getTime();
      const startDateTime = startDate.getTime();
      const todayTime = today.getTime();

      // Генерируем дни для текущего месяца
      while (currentDate.getTime() <= actualEndTime) {
        const dateStr = getLocalDateString(currentDate);
        const currentDateTime = currentDate.getTime();

        // Если день в пределах периода
        if (currentDateTime >= startDateTime && currentDateTime <= todayTime) {
          const dayData = historyMap.get(dateStr);
          if (dayData) {
            currentWeek.push(dayData);
          } else {
            currentWeek.push({ date: dateStr, tracks: 0, mood: 'calm', intensity: 0.1 });
          }
        } else {
          // Дни вне периода (пустые)
          currentWeek.push({ date: '', tracks: 0, mood: 'calm', intensity: 0 });
        }

        // Если неделя заполнена, сохраняем её
        if (currentWeek.length === 7) {
          weeks.push(currentWeek);
          currentWeek = [];
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Сохраняем незавершенную неделю для каждого месяца
      // Фильтруем только дни текущего месяца
      if (currentWeek.length > 0) {
        const monthStartTime = monthStart.getTime();
        const monthEndTime = monthEnd.getTime();
        
        // Фильтруем дни, которые принадлежат текущему месяцу
        const monthDaysOnly = currentWeek.filter(day => {
          if (!day.date) return false;
          const dayDate = new Date(day.date);
          dayDate.setHours(0, 0, 0, 0);
          const dayTime = dayDate.getTime();
          return dayTime >= monthStartTime && dayTime <= monthEndTime;
        });
        
        if (monthDaysOnly.length > 0) {
          weeks.push(monthDaysOnly);
        }
        
        // Сохраняем копию для продолжения в следующем месяце
        // НЕ очищаем currentWeek - она продолжит следующий месяц
      }

      if (weeks.length > 0) {
        monthsData.push({
          month: currentMonth.getMonth(),
          year: currentMonth.getFullYear(),
          weeks
        });
      }

      // Переходим к следующему месяцу
      // currentWeek уже содержит незавершенную неделю (если была)
      // При генерации следующего месяца мы продолжим добавлять дни в эту неделю
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
        className="mb-6 flex items-center justify-between"
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

      <div className="flex-1 flex gap-8">
        {/* Calendar Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 glass-card rounded-2xl p-6 overflow-auto"
        >
          <div className="flex flex-col gap-4">
            {/* Первая строка: первые 6 месяцев */}
            <div className="flex gap-2">
              {/* Дни недели - один раз слева */}
              <div className="flex flex-col gap-1 mr-2">
                <div className="h-4"></div>
                {weekDays.map(day => (
                  <span key={day} className="text-xs text-muted-foreground h-3 flex items-center">
                    {day}
                  </span>
                ))}
              </div>

              {/* Месяцы - горизонтально */}
              <div className="flex gap-6">
                {calendarData.slice(0, 7).map((monthData, monthIndex) => (
                <div 
                  key={`${monthData.year}-${monthData.month}`} 
                  className="flex flex-col gap-1"
                >
                  {/* Название месяца */}
                  <div className="text-sm font-semibold text-muted-foreground mb-1 h-4 flex items-center">
                    {months[monthData.month]}
                  </div>
                  
                  {/* Календарь месяца */}
                  <div className="flex gap-1">
                    {monthData.weeks.map((week, weekIndex) => {
                      let displayWeek = week;
                      const monthStart = new Date(monthData.year, monthData.month, 1);
                      monthStart.setHours(0, 0, 0, 0);
                      const monthStartTime = monthStart.getTime();
                      const monthEnd = new Date(monthData.year, monthData.month + 1, 0);
                      monthEnd.setHours(23, 59, 59, 999);
                      const monthEndTime = monthEnd.getTime();
                      
                      // Для первого месяца убираем пустые дни в начале первой недели
                      if (monthIndex === 0 && weekIndex === 0) {
                        const firstDayIndex = week.findIndex(day => day.date !== '');
                        if (firstDayIndex > 0) {
                          displayWeek = week.slice(firstDayIndex);
                        }
                      }
                      
                      // Для остальных месяцев: если первая неделя содержит дни предыдущего месяца,
                      // убираем их и добавляем пустые дни для правильного выравнивания по дням недели
                      if (monthIndex > 0 && weekIndex === 0) {
                        // Определяем день недели первого дня месяца (понедельник = 0, вторник = 1, ..., воскресенье = 6)
                        const firstDayDate = new Date(monthStart);
                        const dayOfWeek = (firstDayDate.getDay() + 6) % 7; // Преобразуем: понедельник = 0
                        
                        // Находим первый день текущего месяца в неделе
                        const firstDayOfMonthIndex = week.findIndex(day => {
                          if (!day.date) return false;
                          const dayDate = new Date(day.date);
                          dayDate.setHours(0, 0, 0, 0);
                          return dayDate.getTime() >= monthStartTime;
                        });
                        
                        if (firstDayOfMonthIndex >= 0) {
                          // Берем дни начиная с первого дня месяца
                          const monthDays = week.slice(firstDayOfMonthIndex);
                          
                          // Добавляем пустые дни в начале для правильного выравнивания по дням недели
                          const emptyDays: ListeningDay[] = Array(dayOfWeek).fill(null).map(() => ({ 
                            date: '', 
                            tracks: 0, 
                            mood: 'calm', 
                            intensity: 0 
                          }));
                          
                          displayWeek = [...emptyDays, ...monthDays];
                        } else {
                          // Если все дни из предыдущего месяца, добавляем пустые дни в начале
                          const emptyDays: ListeningDay[] = Array(dayOfWeek).fill(null).map(() => ({ 
                            date: '', 
                            tracks: 0, 
                            mood: 'calm', 
                            intensity: 0 
                          }));
                          
                          displayWeek = [...emptyDays, ...week];
                        }
                      }
                      
                      // Для последней недели месяца: фильтруем только дни текущего месяца
                      const isLastWeek = weekIndex === monthData.weeks.length - 1;
                      if (isLastWeek) {
                        displayWeek = displayWeek.filter(day => {
                          if (!day.date) return true; // Пустые дни оставляем
                          const dayDate = new Date(day.date);
                          dayDate.setHours(0, 0, 0, 0);
                          const dayTime = dayDate.getTime();
                          return dayTime >= monthStartTime && dayTime <= monthEndTime;
                        });
                      }
                      
                      // Пропускаем пустые недели
                      if (displayWeek.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div key={weekIndex} className="flex flex-col gap-1">
                          {displayWeek.map((day, dayIndex) => (
                            <motion.div
                              key={`${monthIndex}-${weekIndex}-${dayIndex}`}
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: (monthIndex * 0.1) + (weekIndex * 0.01) + (dayIndex * 0.005) }}
                              className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-150 ${
                                day.date && day.tracks > 0 
                                  ? moodColors[day.mood] 
                                  : day.date && day.tracks === 0
                                  ? 'bg-gray-500/20'
                                  : 'bg-muted/10'
                              }`}
                              style={{ 
                                opacity: day.date && day.tracks > 0 
                                  ? 0.3 + day.intensity * 0.7 
                                  : day.date && day.tracks === 0
                                  ? 0.4
                                  : 0.2 
                              }}
                              title={
                                day.date && day.tracks > 0 
                                  ? `${day.date}: ${day.tracks} треков, ${moodLabels[day.mood]}` 
                                  : day.date && day.tracks === 0
                                  ? `${day.date}: нет прослушиваний`
                                  : ''
                              }
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            </div>

            {/* Вторая строка: оставшиеся месяцы */}
            {calendarData.length > 7 && (
              <div className="flex gap-2">
                {/* Дни недели - один раз слева */}
                <div className="flex flex-col gap-1 mr-2">
                  <div className="h-4"></div>
                  {weekDays.map(day => (
                    <span key={day} className="text-xs text-muted-foreground h-3 flex items-center">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Месяцы - горизонтально */}
                <div className="flex gap-6">
                  {calendarData.slice(7).map((monthData, monthIndex) => {
                    const globalMonthIndex = monthIndex + 7;
                    return (
                      <div 
                        key={`${monthData.year}-${monthData.month}`} 
                        className="flex flex-col gap-1"
                      >
                        {/* Название месяца */}
                        <div className="text-sm font-semibold text-muted-foreground mb-1 h-4 flex items-center">
                          {months[monthData.month]}
                        </div>
                        
                        {/* Календарь месяца */}
                        <div className="flex gap-1">
                          {monthData.weeks.map((week, weekIndex) => {
                            let displayWeek = week;
                            const monthStart = new Date(monthData.year, monthData.month, 1);
                            monthStart.setHours(0, 0, 0, 0);
                            const monthStartTime = monthStart.getTime();
                            const monthEnd = new Date(monthData.year, monthData.month + 1, 0);
                            monthEnd.setHours(23, 59, 59, 999);
                            const monthEndTime = monthEnd.getTime();
                            
                            // Для первой недели месяца: добавляем пустые дни для правильного выравнивания
                            if (weekIndex === 0) {
                              // Определяем день недели первого дня месяца (понедельник = 0, вторник = 1, ..., воскресенье = 6)
                              const firstDayDate = new Date(monthStart);
                              const dayOfWeek = (firstDayDate.getDay() + 6) % 7; // Преобразуем: понедельник = 0
                              
                              // Находим первый день текущего месяца в неделе
                              const firstDayOfMonthIndex = week.findIndex(day => {
                                if (!day.date) return false;
                                const dayDate = new Date(day.date);
                                dayDate.setHours(0, 0, 0, 0);
                                return dayDate.getTime() >= monthStartTime;
                              });
                              
                              if (firstDayOfMonthIndex >= 0) {
                                // Берем дни начиная с первого дня месяца
                                const monthDays = week.slice(firstDayOfMonthIndex);
                                
                                // Добавляем пустые дни в начале для правильного выравнивания по дням недели
                                const emptyDays: ListeningDay[] = Array(dayOfWeek).fill(null).map(() => ({ 
                                  date: '', 
                                  tracks: 0, 
                                  mood: 'calm', 
                                  intensity: 0 
                                }));
                                
                                displayWeek = [...emptyDays, ...monthDays];
                              } else {
                                // Если все дни из предыдущего месяца, добавляем пустые дни в начале
                                const emptyDays: ListeningDay[] = Array(dayOfWeek).fill(null).map(() => ({ 
                                  date: '', 
                                  tracks: 0, 
                                  mood: 'calm', 
                                  intensity: 0 
                                }));
                                
                                displayWeek = [...emptyDays, ...week];
                              }
                            }
                            
                            // Для последней недели месяца: фильтруем только дни текущего месяца
                            const isLastWeek = weekIndex === monthData.weeks.length - 1;
                            if (isLastWeek) {
                              displayWeek = displayWeek.filter(day => {
                                if (!day.date) return true; // Пустые дни оставляем
                                const dayDate = new Date(day.date);
                                dayDate.setHours(0, 0, 0, 0);
                                const dayTime = dayDate.getTime();
                                return dayTime >= monthStartTime && dayTime <= monthEndTime;
                              });
                            }
                            
                            // Пропускаем пустые недели
                            if (displayWeek.length === 0) {
                              return null;
                            }
                            
                            return (
                              <div key={weekIndex} className="flex flex-col gap-1">
                                {displayWeek.map((day, dayIndex) => (
                                  <motion.div
                                    key={`${globalMonthIndex}-${weekIndex}-${dayIndex}`}
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (globalMonthIndex * 0.1) + (weekIndex * 0.01) + (dayIndex * 0.005) }}
                                    className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-150 ${
                                      day.date && day.tracks > 0 
                                        ? moodColors[day.mood] 
                                        : day.date && day.tracks === 0
                                        ? 'bg-gray-500/20'
                                        : 'bg-muted/10'
                                    }`}
                                    style={{ 
                                      opacity: day.date && day.tracks > 0 
                                        ? 0.3 + day.intensity * 0.7 
                                        : day.date && day.tracks === 0
                                        ? 0.4
                                        : 0.2 
                                    }}
                                    title={
                                      day.date && day.tracks > 0 
                                        ? `${day.date}: ${day.tracks} треков, ${moodLabels[day.mood]}` 
                                        : day.date && day.tracks === 0
                                        ? `${day.date}: нет прослушиваний`
                                        : ''
                                    }
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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