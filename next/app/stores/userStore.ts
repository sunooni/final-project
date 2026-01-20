import { create } from 'zustand';
import { Mood } from '@/app/utils/moodAnalyzer';
import { TimelineItem, Period } from '@/app/utils/timelineBuilder';

interface Artist {
  name: string;
  trackCount: number;
  url: string;
}

interface Genre {
  name: string;
  trackCount: number;
  artists: Artist[];
  color?: string;
}

export interface ListeningDay {
  date: string;
  tracks: number;
  mood: Mood;
  intensity: number; // 0-1
}

export interface TopArtistOverall {
  name: string;
  playcount: number;
  url: string;
  mbid?: string;
  image?: string | null;
}

interface TopTrack {
  name: string;
  artist: string;
  playcount: number;
  listeners: number;
  url: string;
  mbid?: string | null;
  image?: string | null;
}

interface RealListeningStats {
  period: Period;
  playcount: number;
  minutes: number;
  hours: number;
  days: number;
}

interface UserStore {
  username: string | null;
  topGenres: Genre[];
  topArtists: Artist[];
  topArtistsOverall: TopArtistOverall[];
  topTracks: TopTrack[];
  listeningHistory: ListeningDay[];
  totalMinutesListened: number;
  timeline: TimelineItem[];
  selectedPeriod: Period; // Единый период для всего
  realListeningStats: RealListeningStats | null;
  isLoadingMoodHistory: boolean;
  isLoadingTimeline: boolean;
  isLoadingRealStats: boolean;
  isLoadingTopArtists: boolean;
  isLoadingTopTracks: boolean;
  moodHistoryError: string | null;
  timelineError: string | null;
  realStatsError: string | null;
  topArtistsError: string | null;
  topTracksError: string | null;
  dataTimestamp?: number;
  setGalaxyData: (genres: Genre[]) => void;
  clearGalaxyData: () => void;
  setListeningHistory: (history: ListeningDay[]) => void;
  loadMoodHistory: () => Promise<void>;
  setTotalMinutesListened: (minutes: number) => void;
  setSelectedPeriod: (period: Period) => void;
  loadTimeline: () => Promise<void>;
  loadRealListeningStats: (period: Period) => Promise<void>;
  loadTopArtistsOverall: () => Promise<void>;
  loadTopTracks: () => Promise<void>;
  loadUserInfo: () => Promise<void>;
  setUsername: (username: string | null) => void;
  syncMoodHistory: () => Promise<void>;
}

// Pastel colors for planets
const pastelColors = [
  '#FFB3BA', // pastel pink
  '#FFDFBA', // pastel peach
  '#FFFFBA', // pastel yellow
  '#BAFFC9', // pastel mint
  '#BAE1FF', // pastel blue
  '#E0BBE4', // pastel lavender
  '#FFDFD3', // pastel coral
  '#D4F1F4', // pastel cyan
  '#FFE5B4', // pastel apricot
  '#E8D5C4', // pastel beige
];

export const useUserStore = create<UserStore>((set) => ({
  username: null,
  topGenres: [],
  topArtists: [],
  topArtistsOverall: [],
  topTracks: [],
  listeningHistory: [],
  totalMinutesListened: 125000, // Mock data
  timeline: [],
  selectedPeriod: '12month', // Единый период
  realListeningStats: null,
  isLoadingMoodHistory: false,
  isLoadingTimeline: false,
  isLoadingRealStats: false,
  isLoadingTopArtists: false,
  isLoadingTopTracks: false,
  moodHistoryError: null,
  timelineError: null,
  realStatsError: null,
  topArtistsError: null,
  topTracksError: null,
  dataTimestamp: undefined,
  syncMoodHistory: async () => {
    set({ isLoadingMoodHistory: true, moodHistoryError: null });
    
    try {
      // Синхронизируем из Last.fm
      const syncResponse = await fetch('/api/database/user/mood-history/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: 365 }),
      });
  
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || 'Ошибка синхронизации');
      }
  
      // После синхронизации загружаем обновленные данные из БД
      let response;
      try {
        response = await fetch('/api/database/user/mood-history?days=365');
        
        // Если БД недоступна после синхронизации, загружаем из Last.fm
        if (!response.ok) {
          console.log('Database unavailable after sync, loading from Last.fm');
          response = await fetch('/api/lastfm/user/mood-history?days=365');
        }
      } catch (fetchError) {
        // Если Express сервер не запущен, загружаем из Last.fm
        console.log('Database server unavailable after sync, loading from Last.fm');
        response = await fetch('/api/lastfm/user/mood-history?days=365');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка загрузки обновленных данных');
      }
  
      const data = await response.json();
      set({ 
        listeningHistory: data.history || [], 
        isLoadingMoodHistory: false 
      });
    } catch (error) {
      set({ 
        moodHistoryError: error instanceof Error ? error.message : 'Ошибка синхронизации истории настроения',
        isLoadingMoodHistory: false 
      });
    }
  },
  setGalaxyData: (genres: Genre[]) => {
    // Assign pastel colors to genres
    const genresWithColors = genres.map((genre, index) => ({
      ...genre,
      color: pastelColors[index % pastelColors.length],
    }));

    // Extract all unique artists
    const artistMap = new Map<string, Artist>();
    genres.forEach(genre => {
      genre.artists.forEach(artist => {
        if (!artistMap.has(artist.name)) {
          artistMap.set(artist.name, artist);
        } else {
          // Sum up track counts if artist appears in multiple genres
          const existing = artistMap.get(artist.name)!;
          existing.trackCount += artist.trackCount;
        }
      });
    });

    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => b.trackCount - a.trackCount);

    set({ 
      topGenres: genresWithColors, 
      topArtists,
      dataTimestamp: Date.now()
    });
  },
  clearGalaxyData: () => {
    set({ topGenres: [], topArtists: [], dataTimestamp: undefined });
  },
  setListeningHistory: (history: ListeningDay[]) => {
    set({ listeningHistory: history });
  },
  loadMoodHistory: async () => {
    set({ isLoadingMoodHistory: true, moodHistoryError: null });
    
    try {
      // Сначала пытаемся загрузить из БД
      let response;
      try {
        response = await fetch('/api/database/user/mood-history?days=365');
      } catch (fetchError) {
        // Если Express сервер не запущен, используем Last.fm
        console.log('Database unavailable, falling back to Last.fm');
        response = await fetch('/api/lastfm/user/mood-history?days=365');
      }
      
      // Если БД пустая или ошибка, используем Last.fm как fallback
      if (!response.ok || response.status === 404 || response.status === 500) {
        const responseData = await response.json().catch(() => ({}));
        // Если это ошибка подключения к Express серверу, используем Last.fm
        if (response.status === 500 && responseData.error?.includes('fetch failed')) {
          console.log('Database server unavailable, falling back to Last.fm');
          response = await fetch('/api/lastfm/user/mood-history?days=365');
        } else if (response.status === 404 || (response.status === 500 && !responseData.error?.includes('fetch failed'))) {
          console.log('Database empty, falling back to Last.fm');
          response = await fetch('/api/lastfm/user/mood-history?days=365');
        }
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация через Last.fm');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }
  
      const data = await response.json();
      set({ 
        listeningHistory: data.history || [], 
        isLoadingMoodHistory: false 
      });
    } catch (error) {
      set({ 
        moodHistoryError: error instanceof Error ? error.message : 'Ошибка загрузки истории настроения',
        isLoadingMoodHistory: false 
      });
    }
  },
  setTotalMinutesListened: (minutes: number) => {
    set({ totalMinutesListened: minutes });
  },
  setSelectedPeriod: (period: Period) => {
    set({ 
      selectedPeriod: period,
      realListeningStats: null // Очищаем предыдущие данные при смене периода
    });
  },
  loadTimeline: async () => {
    const currentState = useUserStore.getState();
    
    // Предотвращаем дублирующие запросы
    if (currentState.isLoadingTimeline) {
      return;
    }
    
    set({ isLoadingTimeline: true, timelineError: null });
    
    try {
      const response = await fetch('/api/lastfm/user/timeline');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация через Last.fm');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }

      const data = await response.json();
      set({ 
        timeline: data.timeline || [], 
        isLoadingTimeline: false 
      });
    } catch (error) {
      set({ 
        timelineError: error instanceof Error ? error.message : 'Ошибка загрузки временной шкалы',
        isLoadingTimeline: false 
      });
    }
  },
  loadRealListeningStats: async (period: Period) => {
    const currentState = useUserStore.getState();
    
    // Предотвращаем дублирующие запросы
    if (currentState.isLoadingRealStats) {
      return;
    }
    
    set({ isLoadingRealStats: true, realStatsError: null });
    
    try {
      const response = await fetch(`/api/lastfm/user/real-listening-stats?period=${period}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация через Last.fm');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }

      const data = await response.json();
      set({ 
        realListeningStats: data, 
        isLoadingRealStats: false 
      });
    } catch (error) {
      set({ 
        realStatsError: error instanceof Error ? error.message : 'Ошибка загрузки статистики',
        isLoadingRealStats: false 
      });
    }
  },
  loadTopArtistsOverall: async () => {
    const currentState = useUserStore.getState();
    
    // Предотвращаем дублирующие запросы
    if (currentState.isLoadingTopArtists) {
      return;
    }
    
    set({ isLoadingTopArtists: true, topArtistsError: null });
    
    try {
      const response = await fetch('/api/lastfm/user/top-artists-overall?limit=10');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация через Last.fm');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }

      const data = await response.json();
      set({ 
        topArtistsOverall: data.artists || [], 
        isLoadingTopArtists: false 
      });
    } catch (error) {
      set({ 
        topArtistsError: error instanceof Error ? error.message : 'Ошибка загрузки топ артистов',
        isLoadingTopArtists: false 
      });
    }
  },
  loadTopTracks: async () => {
    const currentState = useUserStore.getState();
    
    // Предотвращаем дублирующие запросы
    if (currentState.isLoadingTopTracks) {
      return;
    }
    
    set({ isLoadingTopTracks: true, topTracksError: null });
    
    try {
      const response = await fetch('/api/lastfm/chart/top-tracks?limit=20');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки данных');
      }

      const data = await response.json();
      set({ 
        topTracks: data.tracks || [], 
        isLoadingTopTracks: false 
      });
    } catch (error) {
      set({ 
        topTracksError: error instanceof Error ? error.message : 'Ошибка загрузки топ треков',
        isLoadingTopTracks: false 
      });
    }
  },
  loadUserInfo: async () => {
    try {
      const response = await fetch('/api/auth/user');
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          set({ username: data.user.username });
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  },
  setUsername: (username: string | null) => {
    set({ username });
  },
}));
