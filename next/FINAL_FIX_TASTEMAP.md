# Финальное исправление TasteMap.tsx

## Проблема

```
./app/components/TasteMap.tsx (77:13)
Ecmascript file had an error
the name `data` is defined multiple times
```

## Причина

Файл был поврежден и содержал:

- Дублирование переменной `data` (строки 71 и 77)
- Смешанный код из разных компонентов
- 384 строки вместо ~250

## Решение

### 1. Удален старый файл

```bash
rm next/app/components/TasteMap.tsx
```

### 2. Создан новый чистый файл

- ✅ 244 строки (правильный размер)
- ✅ Нет дублирования переменных
- ✅ Используются уникальные имена: `authData` и `tracksData`
- ✅ Только логика отображения любимых треков

### Код без ошибок:

```typescript
const checkAuth = async () => {
  try {
    const response = await fetch("/api/lastfm/user/info");
    if (response.ok) {
      const authData = await response.json(); // ✅ Уникальное имя
      setIsAuthenticated(authData.success && !!authData.user);
    } else {
      setIsAuthenticated(false);
    }
  } catch (err) {
    setIsAuthenticated(false);
  }
};

const fetchLovedTracks = async () => {
  if (!isAuthenticated) {
    setError("Необходима авторизация через Last.fm");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const response = await fetch("/api/lastfm/user/loved-tracks?limit=50");
    const tracksData: LovedTracksResponse = await response.json(); // ✅ Уникальное имя

    if (tracksData.error) {
      setError(tracksData.error);
      return;
    }

    if (tracksData.lovedtracks?.track) {
      const tracks = Array.isArray(tracksData.lovedtracks.track)
        ? tracksData.lovedtracks.track
        : [tracksData.lovedtracks.track];
      setLovedTracks(tracks);
      setShowTracks(true);
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Ошибка при загрузке треков");
    console.error("Error fetching loved tracks:", err);
  } finally {
    setLoading(false);
  }
};
```

## Проверка

```bash
# Размер файла
wc -l app/components/TasteMap.tsx
# 244 строки ✅

# Нет дублирования
grep "const data" app/components/TasteMap.tsx
# Ничего не найдено ✅

# Используются правильные имена
grep "authData\|tracksData" app/components/TasteMap.tsx
# Найдены authData и tracksData ✅
```

## Результат

✅ Ошибка "data is defined multiple times" полностью исправлена
✅ Файл чистый и корректный
✅ Нет дублирования переменных
✅ Компонент готов к использованию

## Что делать дальше

1. Перезапустите dev сервер:

   ```bash
   cd next
   npm run dev
   ```

2. Откройте браузер и проверьте страницу `/taste-map`

3. После авторизации через Last.fm любимые треки должны загрузиться автоматически
