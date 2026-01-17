# План оптимизации проекта

## Цели оптимизации

1. **Унификация источников данных**: Все данные должны браться из базы данных, а не из куки
2. **Автоматическая синхронизация**: При входе пользователя данные должны автоматически синхронизироваться с Last.fm и сохраняться в БД

---

## Текущая ситуация

### Проблема 1: Карта вкуса использует данные из куки
- **Файл**: `next/app/components/TasteMap.tsx`
- **Текущее поведение**: Компонент делает запрос к `/api/lastfm/galaxy`, который получает данные напрямую из Last.fm API (используя куки для авторизации)
- **Проблема**: Данные не сохраняются в БД, каждый раз делаются запросы к Last.fm API

### Проблема 2: Треки пользователя требуют ручного действия
- **Файл**: `next/app/components/TraksUser.tsx`
- **Текущее поведение**: Пользователь должен нажать кнопку "Показать любимые треки" для загрузки данных
- **Проблема**: Данные не загружаются автоматически при входе

### Проблема 3: Нет автоматической синхронизации при входе
- **Файл**: `next/app/api/auth/lastfm/callback/route.ts`
- **Текущее поведение**: При авторизации только сохраняются куки (`lastfm_session_key`, `lastfm_username`)
- **Проблема**: 
  - Пользователь не создается/обновляется в БД
  - Данные не синхронизируются с Last.fm
  - `user_id` не сохраняется в куки

---

## План реализации

### Этап 1: Создание/обновление пользователя в БД при авторизации

**Файл**: `next/app/api/auth/lastfm/callback/route.ts`

**Задачи**:
1. После получения session key и username от Last.fm:
   - Получить информацию о пользователе через `user.getInfo` API
   - Создать или обновить пользователя в БД через `userApi.createOrUpdateUser`
   - Сохранить `user_id` в куки для быстрого доступа

**Изменения**:
```typescript
// После получения sessionKey и username:
// 1. Получить user info из Last.fm
const userInfo = await callLastfmApi('user.getInfo', { user: username });

// 2. Создать/обновить пользователя в БД
const userResult = await userApi.createOrUpdateUser({
  lastfmUsername: username,
  lastfmSessionKey: sessionKey,
  provider: 'lastfm',
  playcount: parseInt(userInfo.user?.playcount || '0'),
  country: userInfo.user?.country || '',
  realname: userInfo.user?.realname || '',
  image: userInfo.user?.image?.[2]?.['#text'] || '',
  url: userInfo.user?.url || '',
});

// 3. Сохранить user_id в куки
if (userResult.data?.id) {
  cookieStore.set("user_id", userResult.data.id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400 * 365,
  });
}
```

---

### Этап 2: Автоматическая синхронизация данных при входе

**Файл**: `next/app/api/auth/lastfm/callback/route.ts`

**Задачи**:
1. После создания/обновления пользователя:
   - Автоматически вызвать синхронизацию любимых треков
   - (Опционально) Синхронизировать недавние треки

**Изменения**:
```typescript
// После создания пользователя, запустить синхронизацию в фоне
// Можно использовать queue или просто await (если не критично время ответа)
if (userResult.data?.id) {
  // Синхронизация любимых треков
  try {
    const lovedTracksData = await callLastfmApi('user.getLovedTracks', {
      user: username,
      limit: '50',
    });
    
    const tracks = Array.isArray(lovedTracksData.lovedtracks?.track)
      ? lovedTracksData.lovedtracks.track
      : lovedTracksData.lovedtracks?.track
      ? [lovedTracksData.lovedtracks.track]
      : [];

    if (tracks.length > 0) {
      await lovedTracksApi.syncLovedTracks(userResult.data.id, tracks);
    }
  } catch (error) {
    console.error('Error syncing loved tracks on login:', error);
    // Не прерываем процесс авторизации при ошибке синхронизации
  }
}
```

**Альтернативный подход** (рекомендуется):
Создать отдельный API endpoint для фоновой синхронизации и вызывать его асинхронно:
```typescript
// Запустить синхронизацию в фоне (не блокируя редирект)
fetch('/api/sync/initial-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: userResult.data.id }),
}).catch(err => console.error('Background sync error:', err));
```

---

### Этап 3: Создание API endpoint для получения galaxy данных из БД

**Новый файл**: `next/app/api/database/galaxy/route.ts`

**Задачи**:
1. Создать endpoint, который:
   - Получает `user_id` из куки
   - Загружает любимые треки из БД
   - Группирует треки по артистам
   - Получает жанры для артистов (можно кешировать или получать из БД, если есть)
   - Возвращает данные в формате, совместимом с текущим форматом

**Структура endpoint**:
```typescript
export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Получить любимые треки из БД
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';
  const response = await fetch(`${apiUrl}/users/${userId}/loved-tracks?limit=500`);
  const data = await response.json();

  if (!data.tracks || data.tracks.length === 0) {
    return NextResponse.json({ genres: [] });
  }

  // Группировка по артистам и получение жанров
  // (логика аналогична текущему /api/lastfm/galaxy)
  
  return NextResponse.json({ genres });
}
```

**Альтернативный подход**:
Создать endpoint на Express сервере для генерации galaxy данных из БД:
- `GET /api/music/users/:userId/galaxy`
- Этот endpoint будет делать всю обработку на сервере

---

### Этап 4: Обновление компонента TasteMap для использования БД

**Файл**: `next/app/components/TasteMap.tsx`

**Задачи**:
1. Изменить endpoint с `/api/lastfm/galaxy` на `/api/database/galaxy`
2. Убедиться, что обработка ошибок работает корректно

**Изменения**:
```typescript
// Заменить:
const response = await fetch("/api/lastfm/galaxy");

// На:
const response = await fetch("/api/database/galaxy");
```

---

### Этап 5: Автоматическая загрузка треков в TraksUser

**Файл**: `next/app/components/TraksUser.tsx`

**Задачи**:
1. Убрать кнопку "Показать любимые треки"
2. Автоматически загружать треки из БД при монтировании компонента (если пользователь авторизован)
3. Если данных нет в БД, показать сообщение о необходимости синхронизации

**Изменения**:
```typescript
// Убрать состояние showTracks и кнопку
// Автоматически загружать при наличии userId:
useEffect(() => {
  if (userId && isAuthenticated) {
    loadTracksFromDB();
  }
}, [userId, isAuthenticated, loadTracksFromDB]);

// Убрать функцию fetchLovedTracks или оставить для ручной синхронизации
// Показывать треки сразу после загрузки
```

---

### Этап 6: Обновление API для получения user_id из куки

**Файл**: `next/app/api/auth/user/route.ts`

**Задачи**:
1. Убедиться, что endpoint корректно возвращает `user_id` из БД
2. Если `user_id` есть в куки, использовать его для получения данных из БД

**Текущее состояние**: Endpoint уже пытается получить данные из БД, но может не иметь `user_id` в куки. После Этапа 1 это должно работать автоматически.

---

## Порядок выполнения

1. ✅ **Этап 1**: Создание/обновление пользователя в БД при авторизации
2. ✅ **Этап 2**: Автоматическая синхронизация данных при входе
3. ✅ **Этап 3**: Создание API endpoint для получения galaxy данных из БД
4. ✅ **Этап 4**: Обновление компонента TasteMap
5. ✅ **Этап 5**: Автоматическая загрузка треков в TraksUser
6. ✅ **Этап 6**: Проверка и обновление API для получения user_id

---

## Дополнительные улучшения (опционально)

### Кеширование galaxy данных
- Сохранять сгенерированные galaxy данные в БД (новая таблица `UserGalaxyData`)
- Обновлять при изменении любимых треков
- Использовать кеш для быстрой загрузки

### Фоновая синхронизация
- Использовать очередь задач (Bull, BullMQ) для фоновой синхронизации
- Периодическая синхронизация данных (например, раз в день)

### Обработка ошибок
- Добавить retry логику для запросов к Last.fm API
- Логирование ошибок синхронизации
- Уведомления пользователя о проблемах синхронизации

### Оптимизация запросов
- Batch запросы для получения информации об артистах
- Кеширование жанров артистов в БД
- Пагинация для больших объемов данных

---

## Тестирование

После реализации каждого этапа необходимо проверить:

1. **Авторизация**:
   - Пользователь создается/обновляется в БД
   - `user_id` сохраняется в куки
   - Данные синхронизируются автоматически

2. **Карта вкуса**:
   - Данные загружаются из БД
   - Визуализация работает корректно
   - Нет запросов к Last.fm API при загрузке страницы

3. **Треки пользователя**:
   - Треки загружаются автоматически
   - Нет необходимости нажимать кнопку
   - Данные берутся из БД

4. **Производительность**:
   - Время загрузки страниц уменьшилось
   - Меньше запросов к Last.fm API
   - Данные доступны быстрее

---

## Примечания

- При миграции существующих пользователей может потребоваться скрипт для синхронизации их данных
- Нужно убедиться, что Express сервер запущен и доступен
- Проверить переменные окружения (`NEXT_PUBLIC_API_URL`)
- Убедиться, что база данных содержит все необходимые таблицы и связи
