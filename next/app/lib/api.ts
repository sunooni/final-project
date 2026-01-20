/**
 * API клиент для работы с Express сервером
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Базовый метод для выполнения запросов
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        error: data.message || data.error || 'Request failed',
      };
    }

    return { data };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * User API
 */
export const userApi = {
  /**
   * Получить пользователя по Last.fm username
   */
  getUser: async (username: string) => {
    return fetchApi(`/users/${encodeURIComponent(username)}`);
  },

  /**
   * Создать или обновить пользователя
   */
  createOrUpdateUser: async (userData: {
    lastfmUsername: string;
    lastfmSessionKey: string;
    provider?: 'lastfm';
    playcount?: number;
    country?: string;
    realname?: string;
    image?: string;
    url?: string;
  }) => {
    return fetchApi('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

/**
 * Loved Tracks API
 */
export const lovedTracksApi = {
  /**
   * Получить любимые треки пользователя
   */
  getUserLovedTracks: async (userId: number, limit = 50, offset = 0) => {
    return fetchApi(
      `/users/${userId}/loved-tracks?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Синхронизировать любимые треки с Last.fm
   */
  syncLovedTracks: async (userId: number, tracks: any[]) => {
    return fetchApi(`/users/${userId}/loved-tracks/sync`, {
      method: 'POST',
      body: JSON.stringify({ tracks }),
    });
  },
};

/**
 * Recent Tracks API
 */
export const recentTracksApi = {
  /**
   * Получить недавние треки пользователя
   */
  getUserRecentTracks: async (userId: number, limit = 50, offset = 0) => {
    return fetchApi(
      `/users/${userId}/recent-tracks?limit=${limit}&offset=${offset}`
    );
  },

  /**
   * Синхронизировать недавние треки с Last.fm
   */
  syncRecentTracks: async (userId: number, tracks: any[]) => {
    return fetchApi(`/users/${userId}/recent-tracks/sync`, {
      method: 'POST',
      body: JSON.stringify({ tracks }),
    });
  },
};

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
