# Music Server API

Express сервер для музыкального приложения с интеграцией Last.fm.

## Структура базы данных

### Модели:
- **User** - пользователи с Last.fm данными
- **Artist** - артисты
- **Album** - альбомы
- **Track** - треки
- **LovedTrack** - любимые треки пользователей
- **RecentTrack** - недавние треки пользователей

## Установка и настройка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` в корне папки `server`:
```env
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name
DB_HOST=localhost
PORT=3001
```

3. Создайте и заполните базу данных:
```bash
npm run db
```

## API Endpoints

### Пользователи

#### Получить пользователя по Last.fm username
```
GET /api/music/users/:username
```

#### Создать или обновить пользователя
```
POST /api/music/users
Body: {
  lastfmUsername: string,
  lastfmSessionKey: string,
  provider: 'lastfm' | 'yandex',
  playcount?: number,
  country?: string,
  realname?: string,
  image?: string,
  url?: string
}
```

### Любимые треки

#### Получить любимые треки пользователя
```
GET /api/music/users/:userId/loved-tracks?limit=50&offset=0
```

#### Синхронизировать любимые треки с Last.fm
```
POST /api/music/users/:userId/loved-tracks/sync
Body: {
  tracks: Array<{
    name: string,
    artist: { "#text": string, mbid?: string, url?: string },
    album?: { title: string, mbid?: string, url?: string, image?: Array },
    mbid?: string,
    url?: string,
    image?: Array<{ "#text": string, size: string }>,
    duration?: number,
    date?: { uts: string }
  }>
}
```

### Недавние треки

#### Получить недавние треки пользователя
```
GET /api/music/users/:userId/recent-tracks?limit=50&offset=0
```

#### Синхронизировать недавние треки с Last.fm
```
POST /api/music/users/:userId/recent-tracks/sync
Body: {
  tracks: Array<{
    name: string,
    artist: { "#text": string, mbid?: string, url?: string },
    album?: { title: string, mbid?: string, url?: string, image?: Array },
    mbid?: string,
    url?: string,
    image?: Array<{ "#text": string, size: string }>,
    duration?: number,
    date?: { uts: string }
  }>
}
```

## Запуск

### Режим разработки
```bash
npm run dev
```

Сервер запустится на порту, указанном в `.env` (по умолчанию 3000).

## Структура проекта

```
server/
├── db/
│   ├── migrations/     # Миграции базы данных
│   ├── models/         # Sequelize модели
│   └── seeders/        # Начальные данные
├── src/
│   ├── app.js          # Настройка Express приложения
│   ├── server.js       # Точка входа сервера
│   ├── controllers/    # Контроллеры
│   ├── routes/         # Роуты API
│   └── services/       # Бизнес-логика
└── package.json
```

## Примеры использования

### Создание пользователя
```javascript
const response = await fetch('http://localhost:3001/api/music/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lastfmUsername: 'username',
    lastfmSessionKey: 'session_key',
    provider: 'lastfm',
    playcount: 1000
  })
});
```

### Синхронизация любимых треков
```javascript
const response = await fetch('http://localhost:3001/api/music/users/1/loved-tracks/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tracks: [
      {
        name: 'Track Name',
        artist: { '#text': 'Artist Name' },
        url: 'https://last.fm/...',
        image: [{ '#text': 'image_url', size: 'medium' }]
      }
    ]
  })
});
```
