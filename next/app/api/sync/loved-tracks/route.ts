import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callLastfmApi, getLastfmUsername } from "@/app/lib/lastfm";
import { lovedTracksApi, userApi } from "@/app/lib/api";

// Время жизни кэша в миллисекундах (15 минут)
const SYNC_CACHE_TTL = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("user_id")?.value;
    const username = await getLastfmUsername();

    if (!userId || !username) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Проверяем время последней синхронизации
    const userResult = await userApi.getUser(username);
    const user = userResult.data as any;
    
    if (user?.lovedTracksLastSyncedAt) {
      const lastSynced = new Date(user.lovedTracksLastSyncedAt).getTime();
      const now = Date.now();
      const timeSinceSync = now - lastSynced;
      
      // Если данные свежие, возвращаем данные из БД без синхронизации
      if (timeSinceSync < SYNC_CACHE_TTL) {
        const dbTracksResult = await lovedTracksApi.getUserLovedTracks(
          parseInt(userId),
          50,
          0
        );
        
        return NextResponse.json({
          success: true,
          message: "Using cached data",
          count: dbTracksResult.data?.count || 0,
          cached: true,
          lastSyncedAt: user.lovedTracksLastSyncedAt,
        });
      }
    }

    // Данные устарели или отсутствуют, выполняем синхронизацию
    // Загружаем всю историю через пагинацию
    const fetchAllLovedTracks = async (): Promise<any[]> => {
      let allTracks: any[] = [];
      let page = 1;
      const maxPages = 50; // Максимальное количество страниц для защиты от бесконечного цикла
      const limit = "50"; // Лимит для loved tracks (Last.fm API ограничивает до 50)

      while (page <= maxPages) {
        const lastfmData = await callLastfmApi(
          "user.getLovedTracks",
          {
            user: username,
            limit,
            page: page.toString(),
          },
          { useCache: false } // Не кэшируем при синхронизации
        );

        const tracks = Array.isArray(lastfmData.lovedtracks?.track)
          ? lastfmData.lovedtracks.track
          : lastfmData.lovedtracks?.track
          ? [lastfmData.lovedtracks.track]
          : [];

        if (tracks.length === 0) {
          break; // Больше нет треков
        }

        allTracks = allTracks.concat(tracks);

        // Проверяем, есть ли еще страницы
        const totalPages = parseInt(
          lastfmData.lovedtracks?.["@attr"]?.totalPages || "1"
        );
        if (page >= totalPages) {
          break; // Достигли последней страницы
        }

        page++;

        // Небольшая задержка между запросами, чтобы не перегружать API
        if (page <= maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      return allTracks;
    };

    const tracks = await fetchAllLovedTracks();

    // Синхронизируем с Express API
    const result = await lovedTracksApi.syncLovedTracks(
      parseInt(userId),
      tracks
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.data?.message || "Loved tracks synced",
      count: result.data?.count || tracks.length,
      cached: false,
    });
  } catch (error) {
    console.error("Error syncing loved tracks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync loved tracks",
      },
      { status: 500 }
    );
  }
}
