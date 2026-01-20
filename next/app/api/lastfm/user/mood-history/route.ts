import { NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';
import { analyzeTrackMood, Mood } from '@/app/utils/moodAnalyzer';

export interface ListeningDay {
  date: string;
  tracks: number;
  mood: Mood;
  intensity: number;
}

const fetchRecentTracks = async (username: string, from: number, to: number, page = 1): Promise<any[]> => {
  const data = await callLastfmApi('user.getRecentTracks', {
    user: username,
    from: from.toString(),
    to: to.toString(),
    limit: '200',
    page: page.toString(),
  });

  const tracks = data.recenttracks?.track || [];
  const totalPages = parseInt(data.recenttracks?.['@attr']?.totalPages || '1');

  // Ограничиваем количество страниц для избежания слишком долгой загрузки
  if (page < Math.min(totalPages, 5)) {
    const nextPage = await fetchRecentTracks(username, from, to, page + 1);
    return [...tracks, ...nextPage];
  }

  return tracks;
};

export async function GET(request: Request) {
  try {
    const username = await getLastfmUsername();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Not authenticated with Last.fm' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90'); // Уменьшаем до 90 дней для быстрой загрузки

    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = endTimestamp - (days * 24 * 60 * 60);

    console.log(`Fetching scrobbles for ${username} from ${new Date(startTimestamp * 1000).toLocaleDateString()} to ${new Date(endTimestamp * 1000).toLocaleDateString()}`);

    // 1. Получаем все скробблы
    const scrobbles = await fetchRecentTracks(username, startTimestamp, endTimestamp);
    console.log(`Found ${scrobbles.length} scrobbles`);

    if (scrobbles.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // 2. Группируем по дням
    const daysMap = new Map<string, { 
      tracks: number; 
      moodCounts: Record<Mood, number>; 
      analyzedTracks: number 
    }>();

    // Обрабатываем уникальные треки
    const uniqueTracks = new Map<string, any>();
    scrobbles.forEach(track => {
      if (!track.date?.uts) return; // Пропускаем треки без даты
      
      const key = `${track.artist['#text']}-${track.name}`;
      if (!uniqueTracks.has(key)) {
        uniqueTracks.set(key, track);
      }

      const dateStr = new Date(parseInt(track.date.uts) * 1000).toISOString().split('T')[0];
      if (!daysMap.has(dateStr)) {
        daysMap.set(dateStr, { 
          tracks: 0, 
          moodCounts: { joy: 0, energy: 0, calm: 0, sad: 0, love: 0 }, 
          analyzedTracks: 0 
        });
      }
      daysMap.get(dateStr)!.tracks++;
    });

    // 3. Анализируем настроение уникальных треков (ограничиваем количество)
    const trackList = Array.from(uniqueTracks.values()).slice(0, 100); // Ограничиваем до 100 треков
    console.log(`Analyzing mood for ${trackList.length} unique tracks...`);

    for (let i = 0; i < trackList.length; i += 10) { // Уменьшаем размер батча
      const batch = trackList.slice(i, i + 10);
      
      await Promise.all(batch.map(async track => {
        try {
          const moods = await analyzeTrackMood(track.artist['#text'], track.name);
          
          // Распределяем настроения по дням
          scrobbles.forEach(scrobble => {
            if (scrobble.artist['#text'] === track.artist['#text'] && 
                scrobble.name === track.name && 
                scrobble.date?.uts) {
              const dateStr = new Date(parseInt(scrobble.date.uts) * 1000).toISOString().split('T')[0];
              const dayData = daysMap.get(dateStr);
              if (dayData) {
                Object.entries(moods).forEach(([mood, count]) => {
                  if (count > 0) {
                    dayData.moodCounts[mood as Mood] += count;
                    dayData.analyzedTracks++;
                  }
                });
              }
            }
          });
        } catch (error) {
          console.error(`Error analyzing track ${track.artist['#text']} - ${track.name}:`, error);
        }
      }));

      // Небольшая задержка между батчами
      if (i + 10 < trackList.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 4. Преобразуем в ListeningDay[]
    const history: ListeningDay[] = [];
    daysMap.forEach((data, dateStr) => {
      const totalMood = Object.values(data.moodCounts).reduce((a, b) => a + b, 0);
      
      if (data.tracks > 0) {
        let dominantMood: Mood = 'calm'; // По умолчанию
        
        if (totalMood > 0) {
          const dominantMoodEntry = Object.entries(data.moodCounts)
            .reduce((a, b) => (b[1] as number) > (a[1] as number) ? b : a);
          dominantMood = dominantMoodEntry[0] as Mood;
        }

        history.push({
          date: dateStr,
          tracks: data.tracks,
          mood: dominantMood,
          intensity: Math.min(data.tracks / 20, 1)
        });
      }
    });

    const sortedHistory = history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return NextResponse.json({ history: sortedHistory });
  } catch (error) {
    console.error('Error fetching mood history:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch mood history' 
      },
      { status: 500 }
    );
  }
}