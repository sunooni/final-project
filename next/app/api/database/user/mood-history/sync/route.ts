import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callLastfmApi, getLastfmUsername } from '@/app/lib/lastfm';
import { recentTracksApi } from '@/app/lib/api';


export async function POST(request: Request) {
    try {
      const cookieStore = await cookies();
      const userId = cookieStore.get('user_id')?.value;
      const username = await getLastfmUsername();
  
      if (!userId || !username) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        );
      }
  
      // Получить параметры
      const body = await request.json().catch(() => ({}));
      const days = body.days || 365;
  
      const endTimestamp = Math.floor(Date.now() / 1000);
      const startTimestamp = endTimestamp - (days * 24 * 60 * 60);
  
      // 1. Получить треки из Last.fm (загружаем все страницы)
      const fetchRecentTracks = async (from: number, to: number, page = 1): Promise<any[]> => {
        const data = await callLastfmApi('user.getRecentTracks', {
          user: username,
          from: from.toString(),
          to: to.toString(),
          limit: '200',
          page: page.toString(),
        }, { useCache: false });
  
        const tracks = Array.isArray(data.recenttracks?.track)
          ? data.recenttracks.track
          : data.recenttracks?.track
          ? [data.recenttracks.track]
          : [];
        
        const totalPages = parseInt(data.recenttracks?.['@attr']?.totalPages || '1');
        const currentPage = parseInt(data.recenttracks?.['@attr']?.page || '1');
  
        // Если есть еще страницы, загружаем их
        if (currentPage < totalPages) {
          // Небольшая задержка между запросами
          await new Promise((resolve) => setTimeout(resolve, 300));
          const nextPage = await fetchRecentTracks(from, to, page + 1);
          return [...tracks, ...nextPage];
        }
  
        return tracks;
      };
  
      const lastfmTracks = await fetchRecentTracks(startTimestamp, endTimestamp);
  
      // 2. Синхронизировать с БД
      const syncResult = await recentTracksApi.syncRecentTracks(
        parseInt(userId),
        lastfmTracks
      );
  
      if (syncResult.error) {
        return NextResponse.json(
          { error: syncResult.error },
          { status: 500 }
        );
      }
  
      // 3. Перенаправить на получение обновленной истории
      // Или вернуть успешный статус и фронтенд сам запросит обновленные данные
      return NextResponse.json({
        success: true,
        message: 'Data synced successfully',
        syncedCount: syncResult.data?.count || lastfmTracks.length
      });
    } catch (error) {
      console.error('Error syncing mood history:', error);
      return NextResponse.json(
        { 
          error: error instanceof Error ? error.message : 'Failed to sync mood history' 
        },
        { status: 500 }
      );
    }
  }