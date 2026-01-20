import { lastfmConfig } from '@/config/lastfm';

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

async function fetchArtistTags(artistName: string, username: string) {
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getTags&artist=${encodeURIComponent(
      artistName
    )}&user=${encodeURIComponent(username)}&api_key=${lastfmConfig.apiKey}&format=json`
  );
  const data = await res.json();
  return data.tags?.tag ?? [];
}

// простая мапа тегов -> жанр
const tagToGenre: Record<string, string> = {
  rock: 'Rock',
  metal: 'Rock',
  pop: 'Pop',
  electronic: 'Electronic',
  edm: 'Electronic',
  hiphop: 'Hip-Hop',
  'hip-hop': 'Hip-Hop',
  rap: 'Hip-Hop',
  jazz: 'Jazz',
  rnb: 'R&B',
  'r&b': 'R&B',
  indie: 'Indie',
  alternative: 'Alternative',
  folk: 'Folk',
  country: 'Country',
  classical: 'Classical',
  blues: 'Blues',
  reggae: 'Reggae',
  punk: 'Punk',
  funk: 'Funk',
};

function deriveTopGenreFromTags(tags: { name: string }[]): string {
  const counts: Record<string, number> = {};
  
  for (const t of tags) {
    const key = t.name.toLowerCase();
    const genre = tagToGenre[key];
    if (!genre) continue;
    counts[genre] = (counts[genre] ?? 0) + 1;
  }
  
  const entries = Object.entries(counts);
  if (!entries.length) return 'Unknown';
  
  return entries.sort((a, b) => b[1] - a[1])[0][0];
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
  
  for (const period of periods) {
    try {
      const artists = await fetchTopArtists(username, period);
      if (!artists.length) continue;
      
      const topArtist = artists[0];
      const tags = await fetchArtistTags(topArtist.name, username);
      const topGenre = deriveTopGenreFromTags(tags);
      
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