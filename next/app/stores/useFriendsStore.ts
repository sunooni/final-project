import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  topArtist?: string; // Любимый артист друга
  favoriteGenre?: string; // Любимый жанр друга
}

interface FriendsState {
  friends: LastfmFriend[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchFriends: (forceRefresh?: boolean) => Promise<void>;
}

// Время жизни кэша (10 минут)
const CACHE_TTL = 10 * 60 * 1000;

// Теперь store обращается к нашему бэкенду, который использует Last.fm API
export const userFriendsStore = create<FriendsState>()(
  persist(
    (set, get) => ({
      friends: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      lastFetchedAt: null,
      fetchFriends: async (forceRefresh = false) => {
        const state = get();
        const now = Date.now();
        
        // Если есть кэшированные данные и они свежие, и не требуется принудительное обновление
        if (!forceRefresh && state.friends.length > 0 && state.lastFetchedAt) {
          const timeSinceFetch = now - state.lastFetchedAt;
          
          // Если данные свежие, показываем их сразу и обновляем в фоне
          if (timeSinceFetch < CACHE_TTL) {
            // Обновляем в фоне без блокировки UI
            set({ isRefreshing: true });
            
            try {
              const response = await fetch("/api/lastfm/user/friends");
              
              if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.friends) {
                  set({ 
                    friends: data.friends, 
                    isRefreshing: false,
                    lastFetchedAt: now,
                    error: null 
                  });
                }
              }
            } catch (err) {
              // Игнорируем ошибки при фоновом обновлении
              set({ isRefreshing: false });
            }
            
            return;
          }
        }
        
        // Первая загрузка или данные устарели
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
            set({ 
              friends: data.friends, 
              isLoading: false,
              lastFetchedAt: now,
              error: null 
            });
          } else {
            // Если друзей нет, устанавливаем пустой массив
            set({ 
              friends: [], 
              isLoading: false,
              lastFetchedAt: now,
              error: null 
            });
          }
        } catch (err: unknown) {
          // Обрабатываем ошибки и сохраняем сообщение для пользователя
          const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
          set({ 
            error: errorMessage, 
            isLoading: false, 
            friends: state.friends.length > 0 ? state.friends : [], // Сохраняем кэш при ошибке
            isRefreshing: false 
          });
        }
      },
    }),
    {
      name: 'friends-storage',
      partialize: (state) => ({ 
        friends: state.friends, 
        lastFetchedAt: state.lastFetchedAt 
      }),
    }
  )
);