import { create } from 'zustand';

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

interface UserStore {
  topGenres: Genre[];
  topArtists: Artist[];
  setGalaxyData: (genres: Genre[]) => void;
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
  topGenres: [],
  topArtists: [],
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

    set({ topGenres: genresWithColors, topArtists });
  },
}));
