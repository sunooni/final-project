import { create } from 'zustand';
import { Mood } from '@/app/utils/moodAnalyzer';

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

interface UserStore {
  topGenres: Genre[];
  topArtists: Artist[];
  listeningHistory: ListeningDay[];
  isLoadingMoodHistory: boolean;
  moodHistoryError: string | null;
  dataTimestamp?: number;
  setGalaxyData: (genres: Genre[]) => void;
  clearGalaxyData: () => void;
  setListeningHistory: (history: ListeningDay[]) => void;
  loadMoodHistory: () => Promise<void>;
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

// Generate mock listening history for the past year
const generateMockListeningHistory = (): ListeningDay[] => {
  const history: ListeningDay[] = [];
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  
  const moods: Array<'joy' | 'energy' | 'calm' | 'sad' | 'love'> = ['joy', 'energy', 'calm', 'sad', 'love'];
  
  for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const tracks = Math.floor(Math.random() * 50) + 5; // 5-55 tracks per day
    const mood = moods[Math.floor(Math.random() * moods.length)];
    const intensity = Math.random(); // 0-1
    
    history.push({
      date: d.toISOString().split('T')[0],
      tracks,
      mood,
      intensity,
    });
  }
  
  return history;
};

export const useUserStore = create<UserStore>((set) => ({
  topGenres: [],
  topArtists: [],
  listeningHistory: generateMockListeningHistory(),
  isLoadingMoodHistory: false,
  moodHistoryError: null,
  dataTimestamp: undefined,
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
      const response = await fetch('/api/lastfm/user/mood-history?days=90');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Необходима авторизация через Last.fm');
        }
        const errorData = await response.json();
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
}));
