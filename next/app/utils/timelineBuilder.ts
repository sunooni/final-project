import { lastfmConfig } from '@/config/lastfm';
import { GET as getGalaxyData } from '@/app/api/database/galaxy/route';

export type Period = '7day' | '1month' | '3month' | '6month' | '12month';

export type TimelineItem = {
  period: Period;
  label: string;
  topGenre: string;
  topArtist: string;
  color: string;
};

const periodLabel: Record<Period, string> = {
  '7day': '7 дней',
  '1month': '1 месяц',
  '3month': '3 месяца',
  '6month': '6 месяцев',
  '12month': '12 месяцев',
};

async function fetchTopArtists(username: string, period: Period) {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${encodeURIComponent(
      username
    )}&period=${period}&limit=5&api_key=${lastfmConfig.apiKey}&format=json`
  );
  const data = await res.json();
  return data.topartists?.artist ?? [];
}

async function fetchTopGenres(): Promise<Array<{ name: string; artists: Array<{ name: string }> }>> {
  try {
    // Вызываем galaxy route напрямую
    const request = new Request('http://localhost/api/database/galaxy');
    const response = await getGalaxyData(request);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error('Error fetching top genres:', error);
    return [];
  }
}

function findArtistGenre(artistName: string, topGenres: Array<{ name: string; artists: Array<{ name: string }> }>): string | null {
  if (!topGenres || topGenres.length === 0) return null;
  
  // Ищем артиста в жанрах (нормализуем имена для сравнения)
  const normalizedArtistName = artistName.toLowerCase().trim();
  
  for (const genre of topGenres) {
    if (genre.artists && genre.artists.length > 0) {
      const found = genre.artists.find(artist => 
        artist.name.toLowerCase().trim() === normalizedArtistName
      );
      if (found) {
        return genre.name;
      }
    }
  }
  
  return null;
}

function colorForPeriod(p: Period): string {
  switch (p) {
    case '7day':
      return '#22c55e';
    case '1month':
      return '#3b82f6';
    case '3month':
      return '#a855f7';
    case '6month':
      return '#ec4899';
    case '12month':
      return '#06b6d4';
  }
}

export async function buildTimeline(username: string): Promise<TimelineItem[]> {
  const periods: Period[] = ['7day', '1month', '3month', '6month', '12month'];
  const result: TimelineItem[] = [];

  const topGenres = await fetchTopGenres();
  
  for (const period of periods) {
    try {
      const artists = await fetchTopArtists(username, period);
      if (!artists.length) continue;
      
      const topArtist = artists[0];
      let topGenre = findArtistGenre(topArtist.name, topGenres);
      if (!topGenre && topGenres.length > 0) {
        topGenre = topGenres[0].name;
      }
      if (!topGenre) {
        topGenre = 'Unknown';
      }
      
      result.push({
        period,
        label: periodLabel[period],
        topGenre,
        topArtist: topArtist.name,
        color: colorForPeriod(period),
      });
      
      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error fetching data for period ${period}:`, error);
    }
  }
  
  return result;
}