# Интеграция Frontend (Next.js) с Backend (Express)

## Настройка

### 1. Переменные окружения

Создайте файл `next/.env.local` и добавьте:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/music
```

### 2. Запуск серверов

**Терминал 1 - Next.js (Frontend):**
```bash
cd next
npm run dev
```
Запустится на `http://localhost:3000`

**Терминал 2 - Express (Backend):**
```bash
cd server
npm run dev
```
Запустится на `http://localhost:3001`

### 3. База данных

Убедитесь, что база данных создана и миграции применены:

```bash
cd server
npm run db
```

## Как работает интеграция

### Авторизация через Last.fm

1. Пользователь авторизуется через Last.fm
2. Callback (`/api/auth/lastfm/callback`) получает session key
3. Получает информацию о пользователе из Last.fm API
4. **Автоматически сохраняет пользователя в базу данных через Express API**
5. Сохраняет `user_id` в cookie для быстрого доступа

### Синхронизация данных

#### Любимые треки:
```typescript
// POST /api/sync/loved-tracks
// Автоматически получает данные из Last.fm и сохраняет в Express API
```

#### Недавние треки:
```typescript
// POST /api/sync/recent-tracks
// Автоматически получает данные из Last.fm и сохраняет в Express API
```

### Получение данных из базы

```typescript
import { lovedTracksApi, recentTracksApi } from '@/app/lib/api';

// Получить любимые треки из базы данных
const result = await lovedTracksApi.getUserLovedTracks(userId, 50, 0);

// Получить недавние треки из базы данных
const result = await recentTracksApi.getUserRecentTracks(userId, 50, 0);
```

## API Endpoints

### Frontend API (Next.js)

- `POST /api/sync/loved-tracks` - Синхронизировать любимые треки
- `POST /api/sync/recent-tracks` - Синхронизировать недавние треки

### Backend API (Express)

- `GET /api/music/users/:username` - Получить пользователя
- `POST /api/music/users` - Создать/обновить пользователя
- `GET /api/music/users/:userId/loved-tracks` - Получить любимые треки
- `POST /api/music/users/:userId/loved-tracks/sync` - Синхронизировать любимые треки
- `GET /api/music/users/:userId/recent-tracks` - Получить недавние треки
- `POST /api/music/users/:userId/recent-tracks/sync` - Синхронизировать недавние треки

## Пример использования в компонентах

```typescript
'use client';

import { useEffect, useState } from 'react';
import { lovedTracksApi } from '@/app/lib/api';

export default function MyComponent() {
  const [tracks, setTracks] = useState([]);
  const userId = 1; // Получить из cookie или контекста

  useEffect(() => {
    const fetchTracks = async () => {
      const result = await lovedTracksApi.getUserLovedTracks(userId);
      if (result.data) {
        setTracks(result.data.tracks);
      }
    };
    fetchTracks();
  }, [userId]);

  return (
    <div>
      {tracks.map(track => (
        <div key={track.id}>
          {track.track.name} - {track.track.artist.name}
        </div>
      ))}
    </div>
  );
}
```

## CORS

CORS уже настроен в Express сервере (`app.js`), поэтому запросы с `localhost:3000` будут работать.
