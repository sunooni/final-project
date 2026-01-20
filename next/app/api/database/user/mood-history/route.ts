import { cookies } from "next/headers";
import { NextResponse } from "next/server"
import { Mood, analyzeTrackMood } from '@/app/utils/moodAnalyzer'

export interface ListeningDay {
    date: string;
    tracks: number;
    mood: Mood;
    intensity: number;
}
  
  export async function GET(request: Request) {
    try {
      // 1. Получить userId из cookies
      const cookieStore = await cookies();
      const userId = cookieStore.get('user_id')?.value;
      
      if (!userId) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
  
      // 2. Получить параметры запроса
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '365');
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
  
      // 3. Запросить данные из Express API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/music';
      let response;
      
      try {
        response = await fetch(
          `${apiUrl}/users/${userId}/recent-tracks/date-range?` +
          `startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          {
            // Добавляем таймаут для избежания долгого ожидания
            signal: AbortSignal.timeout(5000)
          }
        );
      } catch (fetchError: any) {
        // Если Express сервер не запущен или недоступен
        if (fetchError.code === 'ECONNREFUSED' || fetchError.name === 'TimeoutError') {
          console.warn('Express server not available, returning empty history');
          return NextResponse.json({ history: [] });
        }
        throw fetchError;
      }

      if (!response.ok) {
        // Если данных нет в БД, возвращаем пустой массив
        if (response.status === 404 || response.status === 400) {
          return NextResponse.json({ history: [] });
        }
        throw new Error(`Failed to fetch tracks from database: ${response.statusText}`);
      }
  
      const data = await response.json();
      const tracks = data.tracks || [];
  
      if (tracks.length === 0) {
        return NextResponse.json({ history: [] });
      }
  
      // 4. Группировка по дням
      const daysMap = new Map<string, {
        tracks: number;
        moodCounts: Record<Mood, number>;
        analyzedTracks: number;
      }>();
  
      // 5. Собрать уникальные треки для анализа
      const uniqueTracks = new Map<string, any>();
      
      tracks.forEach((recentTrack: any) => {
        if (!recentTrack.playedAt || !recentTrack.track?.artist) return;
        
        const artistName = recentTrack.track.artist.name;
        const trackName = recentTrack.track.name;
        const key = `${artistName}-${trackName}`;
        
        if (!uniqueTracks.has(key)) {
          uniqueTracks.set(key, {
            artist: artistName,
            track: trackName,
            recentTracks: []
          });
        }
        
        const dateStr = new Date(recentTrack.playedAt).toISOString().split('T')[0];
        uniqueTracks.get(key)!.recentTracks.push({
          date: dateStr,
          recentTrack
        });
  
        if (!daysMap.has(dateStr)) {
          daysMap.set(dateStr, {
            tracks: 0,
            moodCounts: { joy: 0, energy: 0, calm: 0, sad: 0, love: 0 },
            analyzedTracks: 0
          });
        }
        daysMap.get(dateStr)!.tracks++;
      });
  
      // 6. Анализ настроений (ограничиваем до 100 уникальных треков)
      const trackList = Array.from(uniqueTracks.values()).slice(0, 100);
      
      for (let i = 0; i < trackList.length; i += 10) {
        const batch = trackList.slice(i, i + 10);
        
        await Promise.all(batch.map(async ({ artist, track, recentTracks }) => {
          try {
            const moods = await analyzeTrackMood(artist, track);
            
            // Распределяем настроения по дням
            recentTracks.forEach(({ date }) => {
              const dayData = daysMap.get(date);
              if (dayData) {
                Object.entries(moods).forEach(([mood, count]) => {
                  if (count > 0) {
                    dayData.moodCounts[mood as Mood] += count;
                    dayData.analyzedTracks++;
                  }
                });
              }
            });
          } catch (error) {
            console.error(`Error analyzing track ${artist} - ${track}:`, error);
          }
        }));
  
        if (i + 10 < trackList.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
  
      // 7. Преобразование в ListeningDay[]
      const history: ListeningDay[] = [];
      daysMap.forEach((data, dateStr) => {
        const totalMood = Object.values(data.moodCounts).reduce((a, b) => a + b, 0);
        
        if (data.tracks > 0) {
          let dominantMood: Mood = 'calm';
          
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
  
      const sortedHistory = history.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      return NextResponse.json({ history: sortedHistory });
    } catch (error) {
      console.error('Error fetching mood history from database:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to fetch mood history' 
        },
        { status: 500 }
      );
    }
  }