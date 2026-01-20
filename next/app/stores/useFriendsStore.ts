import { create } from "zustand";

interface LastfmFriend {
  id: string;
  name: string;
  realname?: string;
  avatar: Array<{ "#text": string; size: string }>; // Массив изображений разных размеров
  url: string;
  playcount: string;
  registered?: {
    "#text": string;
    unixtime: string;
  };
  compatibility: number; // Процент совместимости музыкальных вкусов
}

interface FriendsState {
  friends: LastfmFriend[];
  isLoading: boolean;
  error: string | null;
  fetchFriends: () => Promise<void>;
}

// Теперь store обращается к нашему бэкенду, который использует Last.fm API
export const userFriendsStore = create<FriendsState>((set) => ({
  friends: [],
  isLoading: false,
  error: null,
  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {

      // Этот эндпоинт использует apiKey из конфига и вызывает user.getFriends
      const response = await fetch("/api/lastfm/user/friends");
      
      if (!response.ok) {
        throw new Error("Ошибка при загрузке друзей из Last.fm");
      }
      
      const data = await response.json();
      
      // Проверяем успешность ответа и наличие данных
      if (data.success && data.friends) {
        set({ friends: data.friends, isLoading: false });
      } else {
        // Если друзей нет, устанавливаем пустой массив
        set({ friends: [], isLoading: false });
      }
    } catch (err: unknown) {
      // Обрабатываем ошибки и сохраняем сообщение для пользователя
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      set({ error: errorMessage, isLoading: false, friends: [] });
    }
  },
}));