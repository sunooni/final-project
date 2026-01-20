# План внедрения БД для EmotionalCalendar

## Цель
Перевести компонент `EmotionalCalendar` на использование данных из базы данных с возможностью дополнения из Last.fm по запросу пользователя.

## Архитектура решения

### Принцип работы:
1. **По умолчанию:** Данные загружаются из БД (быстро, надежно)
2. **По кнопке "Обновить данные":** Дополнение/синхронизация из Last.fm
3. **Fallback:** Если БД пустая, автоматически загружать из Last.fm

---

## Этап 1: Расширение Express API (Backend)

### 1.1 Добавить метод в `service.js`

**Файл:** `server/src/services/service.js`

**Новый метод:** `getUserRecentTracksByDateRange`


```javascript
async getUserRecentTracksByDateRange(userId, startDate, endDate) {
  const { Op } = require('sequelize');
  
  return this.RecentTrack.findAndCountAll({
    where: {
      userId,
      playedAt: {
        [Op.between]: [startDate, endDate]
      }
    },
    include: [
      {
        model: this.Track,
        as: 'track',
        include: [
          { model: this.Artist, as: 'artist' },
          { model: this.Album, as: 'album' },
        ],
      },
    ],
    order: [['playedAt', 'ASC']],
  });
}
```

**Зачем:** Позволяет получать треки за конкретный период для анализа настроений.

---

### 1.2 Добавить endpoint в `music.controller.js`

**Файл:** `server/src/controllers/music.controller.js`

**Новый метод:** `getUserRecentTracksByDateRange`

```javascript
getUserRecentTracksByDateRange = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'startDate and endDate are required' 
      });
    }
    
    const result = await this.service.getUserRecentTracksByDateRange(
      parseInt(userId),
      new Date(startDate),
      new Date(endDate)
    );
    
    // Сериализация данных (аналогично getUserRecentTracks)
    const tracks = result.rows.map(recentTrack => ({
      id: recentTrack.id,
      userId: recentTrack.userId,
      trackId: recentTrack.trackId,
      playedAt: recentTrack.playedAt,
      createdAt: recentTrack.createdAt,
      updatedAt: recentTrack.updatedAt,
      track: recentTrack.track ? {
        id: recentTrack.track.id,
        name: recentTrack.track.name,
        mbid: recentTrack.track.mbid,
        url: recentTrack.track.url,
        image: recentTrack.track.image,
        duration: recentTrack.track.duration,
        artist: recentTrack.track.artist ? {
          id: recentTrack.track.artist.id,
          name: recentTrack.track.artist.name,
          mbid: recentTrack.track.artist.mbid,
          url: recentTrack.track.artist.url,
        } : null,
        album: recentTrack.track.album ? {
          id: recentTrack.track.album.id,
          title: recentTrack.track.album.title,
          mbid: recentTrack.track.album.mbid,
          image: recentTrack.track.album.image,
        } : null,
      } : null,
    }));
    
    res.json({
      tracks,
      total: result.count,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
```

---

### 1.3 Добавить роут в `music.router.js`

**Файл:** `server/src/routes/music.router.js`

```javascript
// Добавить после существующего роута recent-tracks
musicRouter.route('/users/:userId/recent-tracks/date-range')
  .get(musicController.getUserRecentTracksByDateRange);
```

---

## Этап 2: Создание Next.js API endpoints

### 2.1 Endpoint для получения mood-history из БД

**Файл:** `next/app/api/database/user/mood-history/route.ts`

**Функционал:**
- Получает userId из cookies
- Запрашивает RecentTracks из БД за указанный период
- Группирует по дням
- Анализирует настроения используя `moodAnalyzer.ts`
- Возвращает `ListeningDay[]`

**Структура:**

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { analyzeTrackMood, Mood } from '@/app/utils/moodAnalyzer';

export interface ListeningDay {
  date: string;
  tracks: number;
  mood: Mood;
  intensity: number;
}

export async function GET(request: Request) {
  try {
    // 1. Получить userId из cookies
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // 2. Получить параметры запроса
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 3. Запросить данные из Express API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';
    const response = await fetch(
      `${apiUrl}/users/${userId}/recent-tracks/date-range?` +
      `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch tracks from database');
    }

    const data = await response.json();
    const tracks = data.tracks || [];

    if (tracks.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // 4. Группировка по дням
    const daysMap = new Map<string, {
      tracks: number;
      moodCounts: Record<Mood, number>;
      analyzedTracks: number;
    }>();

    // 5. Собрать уникальные треки для анализа
    const uniqueTracks = new Map<string, any>();
    
    tracks.forEach((recentTrack: any) => {
      if (!recentTrack.playedAt || !recentTrack.track?.artist) return;
      
      const artistName = recentTrack.track.artist.name;
      const trackName = recentTrack.track.name;
      const key = `${artistName}-${trackName}`;
      
      if (!uniqueTracks.has(key)) {
        uniqueTracks.set(key, {
          artist: artistName,
          track: trackName,
          recentTracks: []
        });
      }
      
      const dateStr = new Date(recentTrack.playedAt).toISOString().split('T')[0];
      uniqueTracks.get(key)!.recentTracks.push({
        date: dateStr,
        recentTrack
      });

      if (!daysMap.has(dateStr)) {
        daysMap.set(dateStr, {
          tracks: 0,
          moodCounts: { joy: 0, energy: 0, calm: 0, sad: 0, love: 0 },
          analyzedTracks: 0
        });
      }
      daysMap.get(dateStr)!.tracks++;
    });

    // 6. Анализ настроений (ограничиваем до 100 уникальных треков)
    const trackList = Array.from(uniqueTracks.values()).slice(0, 100);
    
    for (let i = 0; i < trackList.length; i += 10) {
      const batch = trackList.slice(i, i + 10);
      
      await Promise.all(batch.map(async ({ artist, track, recentTracks }) => {
        try {
          const moods = await analyzeTrackMood(artist, track);
          
          // Распределяем настроения по дням
          recentTracks.forEach(({ date }) => {
            const dayData = daysMap.get(date);
            if (dayData) {
              Object.entries(moods).forEach(([mood, count]) => {
                if (count > 0) {
                  dayData.moodCounts[mood as Mood] += count;
                  dayData.analyzedTracks++;
                }
              });
            }
          });
        } catch (error) {
          console.error(`Error analyzing track ${artist} - ${track}:`, error);
        }
      }));

      if (i + 10 < trackList.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 7. Преобразование в ListeningDay[]
    const history: ListeningDay[] = [];
    daysMap.forEach((data, dateStr) => {
      const totalMood = Object.values(data.moodCounts).reduce((a, b) => a + b, 0);
      
      if (data.tracks > 0) {
        let dominantMood: Mood = 'calm';
        
        if (totalMood > 0) {
          const dominantMoodEntry = Object.entries(data.moodCounts)
            .reduce((a, b) => (b[1] as number) > (a[1] as number) ? b : a);
          dominantMood = dominantMoodEntry[0] as Mood;
        }

        history.push({
          date: dateStr,
          tracks: data.tracks,
          mood: dominantMood,
          intensity: Math.min(data.tracks / 20, 1)
        });
      }
    });

    const sortedHistory = history.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return NextResponse.json({ history: sortedHistory });
  } catch (error) {
    console.error('Error fetching mood history from database:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch mood history' 
      },
      { status: 500 }
    );
  }
}
```

---

### 2.2 Endpoint для синхронизации из Last.fm

**Файл:** `next/app/api/database/user/mood-history/sync/route.ts`

**Функционал:**
- Синхронизирует RecentTracks из Last.fm в БД
- После синхронизации возвращает обновленную mood-history

**Структура:**

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';
import { recentTracksApi } from '@/app/lib/api';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const username = await getLastfmUsername();

    if (!userId || !username) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Получить параметры
    const body = await request.json().catch(() => ({}));
    const days = body.days || 90;

    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = endTimestamp - (days * 24 * 60 * 60);

    // 1. Получить треки из Last.fm
    const fetchRecentTracks = async (from: number, to: number, page = 1): Promise<any[]> => {
      const data = await callLastfmApi('user.getRecentTracks', {
        user: username,
        from: from.toString(),
        to: to.toString(),
        limit: '200',
        page: page.toString(),
      });

      const tracks = data.recenttracks?.track || [];
      const totalPages = parseInt(data.recenttracks?.['@attr']?.totalPages || '1');

      if (page < Math.min(totalPages, 5)) {
        const nextPage = await fetchRecentTracks(from, to, page + 1);
        return [...tracks, ...nextPage];
      }

      return tracks;
    };

    const lastfmTracks = await fetchRecentTracks(startTimestamp, endTimestamp);

    // 2. Синхронизировать с БД
    const syncResult = await recentTracksApi.syncRecentTracks(
      parseInt(userId),
      lastfmTracks
    );

    if (syncResult.error) {
      return NextResponse.json(
        { error: syncResult.error },
        { status: 500 }
      );
    }

    // 3. Перенаправить на получение обновленной истории
    // Или вернуть успешный статус и фронтенд сам запросит обновленные данные
    return NextResponse.json({
      success: true,
      message: 'Data synced successfully',
      syncedCount: syncResult.data?.count || lastfmTracks.length
    });
  } catch (error) {
    console.error('Error syncing mood history:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to sync mood history' 
      },
      { status: 500 }
    );
  }
}
```

---

## Этап 3: Обновление userStore

### 3.1 Обновить `loadMoodHistory` в `userStore.ts`

**Файл:** `next/app/stores/userStore.ts`

**Изменения:**

```typescript
loadMoodHistory: async () => {
  set({ isLoadingMoodHistory: true, moodHistoryError: null });
  
  try {
    // Сначала пытаемся загрузить из БД
    let response = await fetch('/api/database/user/mood-history?days=90');
    
    // Если БД пустая или ошибка, используем Last.fm как fallback
    if (!response.ok || response.status === 404) {
      console.log('Database empty, falling back to Last.fm');
      response = await fetch('/api/lastfm/user/mood-history?days=90');
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Необходима авторизация через Last.fm');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка загрузки данных');
    }

    const data = await response.json();
    set({ 
      listeningHistory: data.history || [], 
      isLoadingMoodHistory: false 
    });
  } catch (error) {
    set({ 
      moodHistoryError: error instanceof Error ? error.message : 'Ошибка загрузки истории настроения',
      isLoadingMoodHistory: false 
    });
  }
},
```

---

### 3.2 Добавить метод для синхронизации

**Файл:** `next/app/stores/userStore.ts`

**Новый метод в интерфейсе:**

```typescript
interface UserStore {
  // ... существующие поля
  syncMoodHistory: () => Promise<void>;
}
```

**Реализация:**

```typescript
syncMoodHistory: async () => {
  set({ isLoadingMoodHistory: true, moodHistoryError: null });
  
  try {
    // Синхронизируем из Last.fm
    const syncResponse = await fetch('/api/database/user/mood-history/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days: 90 }),
    });

    if (!syncResponse.ok) {
      const errorData = await syncResponse.json();
      throw new Error(errorData.error || 'Ошибка синхронизации');
    }

    // После синхронизации загружаем обновленные данные из БД
    const response = await fetch('/api/database/user/mood-history?days=90');
    
    if (!response.ok) {
      throw new Error('Ошибка загрузки обновленных данных');
    }

    const data = await response.json();
    set({ 
      listeningHistory: data.history || [], 
      isLoadingMoodHistory: false 
    });
  } catch (error) {
    set({ 
      moodHistoryError: error instanceof Error ? error.message : 'Ошибка синхронизации истории настроения',
      isLoadingMoodHistory: false 
    });
  }
},
```

---

## Этап 4: Обновление компонента EmotionalCalendar

### 4.1 Изменить обработчик кнопки "Обновить данные"

**Файл:** `next/app/components/Emotion/EmotionalCalendar.tsx`

**Изменения:**

```typescript
const { 
  listeningHistory, 
  isLoadingMoodHistory, 
  moodHistoryError, 
  loadMoodHistory,
  syncMoodHistory  // Добавить новый метод
} = useUserStore();

// Изменить onClick кнопки:
<button
  onClick={syncMoodHistory}  // Вместо loadMoodHistory
  disabled={isLoadingMoodHistory}
  className="..."
>
  {isLoadingMoodHistory ? (
    <>
      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        {/* spinner */}
      </svg>
      Синхронизация...
    </>
  ) : (
    'Обновить данные'
  )}
</button>
```

---

## Этап 5: Обновление API клиента (опционально)

### 5.1 Добавить метод в `api.ts`

**Файл:** `next/app/lib/api.ts`

```typescript
export const moodHistoryApi = {
  /**
   * Получить историю настроений из БД
   */
  getMoodHistoryFromDB: async (days = 90) => {
    return fetchApi(`/database/user/mood-history?days=${days}`);
  },

  /**
   * Синхронизировать историю настроений из Last.fm
   */
  syncMoodHistory: async (days = 90) => {
    return fetchApi(`/database/user/mood-history/sync`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    });
  },
};
```

---

## Этап 6: Тестирование

### Чеклист тестирования:

1. **Загрузка из БД:**
   - [ ] Проверить загрузку данных из БД при наличии данных
   - [ ] Проверить fallback на Last.fm при пустой БД
   - [ ] Проверить обработку ошибок

2. **Синхронизация:**
   - [ ] Проверить синхронизацию из Last.fm
   - [ ] Проверить обновление данных после синхронизации
   - [ ] Проверить индикацию загрузки

3. **Анализ настроений:**
   - [ ] Проверить корректность анализа настроений из БД
   - [ ] Проверить группировку по дням
   - [ ] Проверить вычисление интенсивности

4. **Производительность:**
   - [ ] Сравнить скорость загрузки из БД vs Last.fm
   - [ ] Проверить ограничение на количество анализируемых треков

---

## Порядок реализации (рекомендуемый)

1. ✅ **Этап 1:** Расширение Express API (Backend)
   - Добавить метод в service.js
   - Добавить endpoint в controller.js
   - Добавить роут в router.js

2. ✅ **Этап 2.1:** Создать endpoint для получения mood-history из БД
   - Создать файл route.ts
   - Протестировать получение данных

3. ✅ **Этап 2.2:** Создать endpoint для синхронизации
   - Создать файл sync/route.ts
   - Протестировать синхронизацию

4. ✅ **Этап 3:** Обновить userStore
   - Обновить loadMoodHistory
   - Добавить syncMoodHistory

5. ✅ **Этап 4:** Обновить компонент
   - Изменить обработчик кнопки

6. ✅ **Этап 5:** Тестирование
   - Проверить все сценарии

---

## Дополнительные улучшения (будущее)

### 1. Кэширование результатов анализа

Создать таблицу для кэширования результатов анализа настроений:

```sql
CREATE TABLE TrackMoodAnalysis (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  trackId INTEGER,
  artistName VARCHAR(255),
  trackName VARCHAR(255),
  moodCounts JSON,
  analyzedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_track_artist (trackId, artistName, trackName)
);
```

### 2. Оптимизация запросов

- Добавить индексы на `playedAt` в таблице `RecentTracks`
- Использовать агрегацию на уровне БД для подсчета треков по дням

### 3. Инкрементальная синхронизация

- Синхронизировать только новые треки (после последней синхронизации)
- Использовать фоновые задачи для периодической синхронизации

---

## Примечания

- Все изменения обратно совместимы с существующим кодом
- Fallback на Last.fm обеспечивает надежность
- Кнопка "Обновить данные" теперь синхронизирует из Last.fm и обновляет БД
- По умолчанию данные загружаются из БД (быстрее и надежнее)
