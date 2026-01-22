import { lastfmConfig } from '@/config/lastfm';
import { callLastfmPublicApi } from '@/app/lib/lastfm';

export type Mood = 'joy' | 'energy' | 'calm' | 'sad' | 'love';

const tagToMood: Record<string, Mood[]> = {
  // joy
  'happy': ['joy'], 'cheerful': ['joy'], 'upbeat': ['joy'], 'joyful': ['joy'],
  'party': ['joy'], 'fun': ['joy'], 'dance': ['joy'], 'pop': ['joy'], 'summer': ['joy'],
  
  // energy
  'energetic': ['energy'], 'rock': ['energy'], 'metal': ['energy'], 'punk': ['energy'],
  'electronic': ['energy'], 'edm': ['energy'], 'workout': ['energy'], 'gym': ['energy'],
  'techno': ['energy'], 'trance': ['energy'],
  
  // calm
  'chill': ['calm'], 'relax': ['calm'], 'ambient': ['calm'], 'acoustic': ['calm'],
  'lofi': ['calm'], 'jazz': ['calm'], 'piano': ['calm'], 'chillout': ['calm'],
  'lounge': ['calm'], 'instrumental': ['calm'],
  
  // sad
  'sad': ['sad'], 'melancholy': ['sad'], 'depressing': ['sad'], 'emo': ['sad'],
  'slow': ['sad'], 'ballad': ['sad'], 'cry': ['sad'], 'heartbreak': ['sad'],
  
  // love
  'love': ['love'], 'romantic': ['love'], 'rnb': ['love'], 'soul': ['love'],
  'valentines': ['love'], 'wedding': ['love']
};

const trackMoodCache = new Map<string, Record<Mood, number>>();

export const analyzeTrackMood = async (artist: string, track: string): Promise<Record<Mood, number>> => {
  const cacheKey = `${artist}-${track}`.toLowerCase();
  
  if (trackMoodCache.has(cacheKey)) {
    return trackMoodCache.get(cacheKey)!;
  }

  const moodCounts: Record<Mood, number> = { joy: 0, energy: 0, calm: 0, sad: 0, love: 0 };

  try {
    // Use cached public API instead of direct fetch
    const data = await callLastfmPublicApi('track.getInfo', {
      artist: artist,
      track: track,
    });

    const tags = data.track?.toptags?.tag?.slice(0, 10) || [];
    
    tags.forEach((tag: any) => {
      const tagName = tag.name.toLowerCase();
      const moods = tagToMood[tagName];
      if (moods) {
        moods.forEach(mood => moodCounts[mood]++);
      }
    });
  } catch (error) {
    console.warn(`Failed to analyze mood for ${artist} - ${track}:`, error);
  }

  trackMoodCache.set(cacheKey, moodCounts);
  return moodCounts;
};