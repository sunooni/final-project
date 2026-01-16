# Структура маршрутов

## Структура папок

Приложение использует App Router Next.js с авторизацией через Last.fm:

```
app/
├── (dashboard)/              # Route group - не добавляет сегмент в URL
│   ├── layout.tsx           # Общий layout с Navigation для всех страниц
│   ├── taste-map/
│   │   └── page.tsx         # /taste-map
│   ├── emotions/
│   │   └── page.tsx         # /emotions
│   ├── evolution/
│   │   └── page.tsx         # /evolution
│   ├── galaxy/
│   │   └── page.tsx         # /galaxy
│   └── friends/
│       └── page.tsx         # /friends
├── auth/
│   └── lastfm/
│       └── page.tsx         # /auth/lastfm - страница авторизации
├── api/
│   ├── auth/
│   │   └── lastfm/
│   │       ├── login/       # Инициирует OAuth Last.fm
│   │       ├── callback/    # Обрабатывает callback Last.fm
│   │       └── logout/      # Выход из системы
│   └── lastfm/
│       └── user/
│           ├── info/        # Информация о пользователе
│           ├── loved-tracks/ # Любимые треки
│           └── recent-tracks/ # Недавние треки
├── components/              # Переиспользуемые компоненты
│   ├── Navigation.tsx       # Навигация с Next.js Link
│   ├── LastfmAuthButton.tsx # Кнопка авторизации Last.fm
│   ├── AuthStatus.tsx       # Статус авторизации
│   ├── TasteMap.tsx
│   ├── EmotionalCalendar.tsx
│   ├── EvolutionTimeline.tsx
│   ├── GalaxyView.tsx
│   └── SocialHub.tsx
├── lib/
│   ├── lastfm.ts           # Утилиты для работы с Last.fm API
│   └── utils.ts            # Общие утилиты (cn)
├── page.tsx                # Главная страница - проверка авторизации
└── middleware.ts           # Защита маршрутов

config/
└── lastfm.ts               # Конфигурация Last.fm API
```

## Маршруты

### Публичные маршруты

- `/` - Главная страница (проверяет авторизацию и перенаправляет)
- `/auth/lastfm` - Страница авторизации через Last.fm

### Защищенные маршруты (требуют авторизации)

- `/taste-map` - Карта вкуса (главная страница дашборда)
- `/emotions` - Эмоциональный календарь
- `/evolution` - Временная линия эволюции
- `/galaxy` - Галактика
- `/friends` - Социальный хаб

## Авторизация Last.fm

### Middleware (middleware.ts)

- Проверяет наличие токена `lastfm_session_key` в cookies
- Перенаправляет неавторизованных пользователей с защищенных маршрутов на `/auth/lastfm`
- Перенаправляет авторизованных пользователей со страницы `/auth/lastfm` на `/taste-map`

### Главная страница (/)

- Проверяет наличие cookie `lastfm_session_key`
- Если авторизован → редирект на `/taste-map`
- Если не авторизован → редирект на `/auth/lastfm`

### Страница авторизации (/auth/lastfm)

- Отображает кнопку "Войти через Last.fm"
- После успешной авторизации перенаправляет на `/taste-map`
- Показывает статус авторизации (успех/ошибка)

### API Endpoints

#### Авторизация

- `GET /api/auth/lastfm/login` - Инициирует OAuth flow с Last.fm
- `GET /api/auth/lastfm/callback` - Обрабатывает callback от Last.fm, сохраняет session key
- `POST /api/auth/lastfm/logout` - Удаляет cookies и выходит из системы

#### Данные пользователя

- `GET /api/lastfm/user/info` - Информация о пользователе
- `GET /api/lastfm/user/loved-tracks` - Любимые треки
- `GET /api/lastfm/user/recent-tracks` - Недавно прослушанные треки

### Cookies

- `lastfm_session_key` (httpOnly) - Session key от Last.fm (не истекает)
- `lastfm_username` - Имя пользователя Last.fm

## Компоненты

### Navigation.tsx

- Навигация по разделам дашборда
- Использует `usePathname()` для определения активного маршрута
- Кнопка выхода с функцией `handleLogout()`
- Анимации через framer-motion

### LastfmAuthButton.tsx

- Проверяет авторизацию при загрузке
- Кнопка входа через Last.fm
- Отображает информацию о пользователе
- Кнопка выхода

### AuthStatus.tsx

- Отображает статусы авторизации (успех/ошибка)
- Читает параметры из URL

## Удаленные файлы

Из проекта удалены:

- ❌ Авторизация через Яндекс.Музыку (API endpoints, config, компоненты)
- ❌ `zustand` пакет (не использовался)
- ❌ `app/stores/` папка (пустая)
- ❌ `Dashboard.tsx` компонент (заменен на отдельные страницы)
- ❌ `LastfmData.tsx` компонент (не использовался)

## Преимущества структуры

1. ✅ URL меняется при переходе между разделами
2. ✅ Можно делиться прямыми ссылками на конкретные разделы
3. ✅ Работает кнопка "Назад" в браузере
4. ✅ Лучше для SEO
5. ✅ Соответствует best practices Next.js App Router
6. ✅ Защита маршрутов через middleware
7. ✅ Отдельная страница авторизации Last.fm
8. ✅ Автоматическое перенаправление в зависимости от статуса авторизации
9. ✅ Чистая структура без неиспользуемого кода
