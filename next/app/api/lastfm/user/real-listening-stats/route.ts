import { NextResponse } from 'next/server';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';
import { Period } from '@/app/utils/timelineBuilder';

// Функция для получения временных рамок периода
function getPeriodTimestamps(period: Period): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  let from: number;

  switch (period) {
    case '7day':
      from = now - (7 * 24 * 60 * 60);
      break;
    case '1month':
      from = now - (30 * 24 * 60 * 60);
      break;
    case '3month':
      from = now - (90 * 24 * 60 * 60);
      break;
    case '6month':
      from = now - (180 * 24 * 60 * 60);
      break;
    case '12month':
      from = now - (365 * 24 * 60 * 60);
      break;
    default:
      from = now - (365 * 24 * 60 * 60);
  }

  return { from, to: now };
}

// Функция для получения треков за период
async function fetchRecentTracksForPeriod(username: string, from: number, to: number, page = 1): Promise<any[]> {
  const data = await callLastfmApi('user.getRecentTracks', {
    user: username,
    from: from.toString(),
    to: to.toString(),
    limit: '200',
    page: page.toString(),
  });

  const tracks = data.recenttracks?.track || [];
  const trackArray = Array.isArray(tracks) ? tracks : [tracks];
  
  // Фильтруем только завершенные треки (не "now playing")
  const completedTracks = trackArray.filter((track: any) => track.date?.uts);
  
  const totalPages = parseInt(data.recenttracks?.['@attr']?.totalPages || '1');

  // Ограничиваем количество страниц для избежания слишком долгой загрузки
  if (page < Math.min(totalPages, 10)) {
    const nextPage = await fetchRecentTracksForPeriod(username, from, to, page + 1);
    return [...completedTracks, ...nextPage];
  }

  return completedTracks;
}

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
    const period = (searchParams.get('period') || '12month') as Period;

    const { from, to } = getPeriodTimestamps(period);
    
    console.log(`Fetching real listening stats for ${username}, period: ${period}`);
    
    // Получаем все треки за период
    const tracks = await fetchRecentTracksForPeriod(username, from, to);
    
    console.log(`Found ${tracks.length} completed tracks for period ${period}`);
    
    if (tracks.length === 0) {
      return NextResponse.json({
        period,
        playcount: 0,
        minutes: 0,
        hours: 0,
        days: 0
      });
    }

    // Подсчитываем статистику
    const playcount = tracks.length;
    
    // Используем среднюю длину трека 3.5 минуты для расчета времени
    const avgTrackMinutes = 3.5;
    const totalMinutes = Math.round(playcount * avgTrackMinutes);
    const totalHours = Math.round(totalMinutes / 60);
    const totalDays = Math.round(totalHours / 24);

    return NextResponse.json({
      period,
      playcount,
      minutes: totalMinutes,
      hours: totalHours,
      days: totalDays
    });
  } catch (error) {
    console.error('Error fetching real listening stats:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch real listening stats' 
      },
      { status: 500 }
    );
  }
}