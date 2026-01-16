# Last.fm API - Руководство по использованию

## Созданные API Endpoints

После успешной авторизации через Last.fm вы можете использовать следующие endpoints:

### 1. Получить информацию о пользователе

**GET** `/api/lastfm/user/info`

Возвращает информацию о текущем авторизованном пользователе Last.fm.

**Пример использования:**

```typescript
const response = await fetch("/api/lastfm/user/info");
const data = await response.json();
console.log(data.user); // Информация о пользователе
```

**Ответ:**

```json
{
  "success": true,
  "user": {
    "name": "username",
    "realname": "Real Name",
    "country": "Country",
    "playcount": "12345",
    "url": "https://www.last.fm/user/username",
    ...
  }
}
```

### 2. Получить любимые треки

**GET** `/api/lastfm/user/loved-tracks`

Возвращает список любимых треков пользователя.

**Параметры запроса:**

- `page` (опционально) - номер страницы (по умолчанию: 1)
- `limit` (опционально) - количество треков на странице (по умолчанию: 50)

**Пример использования:**

```typescript
const response = await fetch("/api/lastfm/user/loved-tracks?page=1&limit=10");
const data = await response.json();
console.log(data.lovedtracks.track); // Массив любимых треков
```

**Ответ:**

```json
{
  "success": true,
  "lovedtracks": {
    "track": [
      {
        "name": "Track Name",
        "artist": { "#text": "Artist Name" },
        "url": "https://www.last.fm/...",
        ...
      }
    ]
  }
}
```

### 3. Получить недавние треки

**GET** `/api/lastfm/user/recent-tracks`

Возвращает список недавно прослушанных треков.

**Параметры запроса:**

- `page` (опционально) - номер страницы (по умолчанию: 1)
- `limit` (опционально) - количество треков на странице (по умолчанию: 50)
- `from` (опционально) - Unix timestamp начала периода
- `to` (опционально) - Unix timestamp конца периода
- `extended` (опционально) - "0" или "1" для получения расширенной информации

**Пример использования:**

```typescript
const response = await fetch("/api/lastfm/user/recent-tracks?limit=20");
const data = await response.json();
console.log(data.recenttracks.track); // Массив недавних треков
```

**Ответ:**

```json
{
  "success": true,
  "recenttracks": {
    "track": [
      {
        "name": "Track Name",
        "artist": { "#text": "Artist Name" },
        "date": { "#text": "1 Jan 2024, 12:00", "uts": "1704110400" },
        "url": "https://www.last.fm/...",
        ...
      }
    ]
  }
}
```

## Утилиты

### Функция `callLastfmApi`

Для создания новых API endpoints используйте функцию `callLastfmApi` из `@/app/lib/lastfm`:

```typescript
import { callLastfmApi } from "@/app/lib/lastfm";

// Пример: получение топ-артистов
const data = await callLastfmApi("user.getTopArtists", {
  user: username,
  period: "7day",
  limit: "10",
});
```

### Функция `generateApiSignature`

Для генерации подписи API запросов:

```typescript
import { generateApiSignature } from "@/app/lib/lastfm";
import { lastfmConfig } from "@/config/lastfm";

const signature = generateApiSignature(
  {
    method: "user.getInfo",
    api_key: lastfmConfig.apiKey,
    user: "username",
  },
  lastfmConfig.sharedSecret
);
```

## Пример компонента

Создан компонент `LastfmData.tsx`, который демонстрирует использование всех трех endpoints. Вы можете использовать его в своем приложении:

```tsx
import LastfmData from "@/app/components/LastfmData";

export default function MyPage() {
  return (
    <div>
      <LastfmData />
    </div>
  );
}
```

## Обработка ошибок

Все endpoints возвращают ошибки в следующем формате:

```json
{
  "error": "Описание ошибки"
}
```

Статус коды:

- `401` - Пользователь не авторизован через Last.fm
- `500` - Ошибка при запросе к Last.fm API

## Дополнительные методы Last.fm API

Вы можете легко добавить поддержку других методов Last.fm API, используя функцию `callLastfmApi`. Примеры:

- `user.getTopArtists` - топ артисты
- `user.getTopTracks` - топ треки
- `user.getTopAlbums` - топ альбомы
- `user.getFriends` - друзья пользователя
- И многие другие...

См. [документацию Last.fm API](https://www.last.fm/api) для полного списка методов.
