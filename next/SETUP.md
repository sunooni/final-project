# Инструкция по подключению Frontend и Backend

## Шаг 1: Настройка переменных окружения

### Next.js (Frontend)

Создайте файл `next/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/music
LASTFM_API_KEY=d38420f1e6d8a0c76363a8f9b218040f
LASTFM_SHARED_SECRET=eed0d8ec74e9e7393be602ebc50cb8cc
LASTFM_REDIRECT_URI=http://localhost:3000/api/auth/lastfm/callback
```

### Express (Backend)

Создайте файл `server/.env`:

```env
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=your_db_name
DB_HOST=localhost
PORT=3001
```

## Шаг 2: Создание базы данных

```bash
cd server
npm run db
```

Эта команда:
1. Удалит старую базу (если есть)
2. Создаст новую базу
3. Применит все миграции
4. Запустит seeders (если есть)

## Шаг 3: Запуск серверов

### Терминал 1 - Express Backend:
```bash
cd server
npm run dev
```
Сервер запустится на `http://localhost:3001`

### Терминал 2 - Next.js Frontend:
```bash
cd next
npm run dev
```
Приложение запустится на `http://localhost:3000`

## Шаг 4: Проверка работы

1. Откройте `http://localhost:3000`
2. Авторизуйтесь через Last.fm
3. После авторизации пользователь автоматически сохранится в базу данных
4. На странице "Карта вкуса" нажмите "Показать любимые треки"
5. Нажмите "Синхронизировать с БД" для сохранения треков в базу

## Как это работает

### Автоматическое сохранение пользователя

При авторизации через Last.fm:
1. Получаем session key от Last.fm
2. Получаем информацию о пользователе через `user.getInfo`
3. **Автоматически сохраняем в Express API** (`POST /api/music/users`)
4. Сохраняем `user_id` в cookie

### Синхронизация треков

1. Нажимаете "Синхронизировать с БД"
2. Next.js получает треки из Last.fm API
3. Отправляет их в Express API (`POST /api/sync/loved-tracks`)
4. Express API сохраняет треки, артистов, альбомы в базу данных
5. После этого можно загружать треки из базы (быстрее!)

## API Endpoints

### Frontend (Next.js)
- `POST /api/sync/loved-tracks` - Синхронизировать любимые треки
- `POST /api/sync/recent-tracks` - Синхронизировать недавние треки

### Backend (Express)
- `GET /api/music/users/:username` - Получить пользователя
- `POST /api/music/users` - Создать/обновить пользователя
- `GET /api/music/users/:userId/loved-tracks` - Получить любимые треки из БД
- `POST /api/music/users/:userId/loved-tracks/sync` - Синхронизировать любимые треки
- `GET /api/music/users/:userId/recent-tracks` - Получить недавние треки из БД
- `POST /api/music/users/:userId/recent-tracks/sync` - Синхронизировать недавние треки

## Устранение проблем

### CORS ошибки
CORS уже настроен в Express (`app.js`), но если возникают проблемы, проверьте:
- Express сервер запущен на порту 3001
- Next.js запущен на порту 3000
- `NEXT_PUBLIC_API_URL` указан правильно

### База данных не создается
Проверьте:
- PostgreSQL установлен и запущен
- Переменные окружения в `server/.env` правильные
- База данных существует (или права на создание)

### Пользователь не сохраняется
Проверьте:
- Express сервер запущен
- В консоли нет ошибок
- `NEXT_PUBLIC_API_URL` указан в `.env.local`
