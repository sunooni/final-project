import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callLastfmApi, getLastfmUsername } from "@/app/lib/lastfm";
import { recentTracksApi, userApi } from "@/app/lib/api";

// Время жизни кэша в миллисекундах (5 минут для recent tracks, так как они обновляются чаще)
const SYNC_CACHE_TTL = 3 * 60 * 1000;

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
    
    if (user?.recentTracksLastSyncedAt) {
      const lastSynced = new Date(user.recentTracksLastSyncedAt).getTime();
      const now = Date.now();
      const timeSinceSync = now - lastSynced;
      
      // Если данные свежие, возвращаем данные из БД без синхронизации
      if (timeSinceSync < SYNC_CACHE_TTL) {
        const dbTracksResult = await recentTracksApi.getUserRecentTracks(
          parseInt(userId),
          50,
          0
        );
        
        return NextResponse.json({
          success: true,
          message: "Using cached data",
          count: dbTracksResult.data?.count || 0,
          cached: true,
          lastSyncedAt: user.recentTracksLastSyncedAt,
        });
      }
    }

    // Данные устарели или отсутствуют, выполняем синхронизацию
    // Загружаем всю историю через пагинацию
    const fetchAllRecentTracks = async (): Promise<any[]> => {
      let allTracks: any[] = [];
      let page = 1;
      const maxPages = 50; // Максимальное количество страниц для защиты от бесконечного цикла
      const limit = "200"; // Максимальный лимит на страницу

      try {
        while (page <= maxPages) {
          try {
            console.log(`Fetching page ${page} of recent tracks...`);
            const lastfmData = await callLastfmApi(
              "user.getRecentTracks",
              {
                user: username,
                limit,
                page: page.toString(),
              },
              { useCache: false } // Не кэшируем при синхронизации
            );

            if (!lastfmData || !lastfmData.recenttracks) {
              console.warn(`No recenttracks data in response for page ${page}`);
              break;
            }

            const tracks = Array.isArray(lastfmData.recenttracks?.track)
              ? lastfmData.recenttracks.track
              : lastfmData.recenttracks?.track
              ? [lastfmData.recenttracks.track]
              : [];

            if (tracks.length === 0) {
              console.log(`No more tracks found at page ${page}`);
              break; // Больше нет треков
            }

            allTracks = allTracks.concat(tracks);
            console.log(`Page ${page}: loaded ${tracks.length} tracks, total: ${allTracks.length}`);

            // Проверяем, есть ли еще страницы
            const totalPages = parseInt(
              lastfmData.recenttracks?.["@attr"]?.totalPages || "1"
            );
            const currentPage = parseInt(
              lastfmData.recenttracks?.["@attr"]?.page || "1"
            );
            
            if (page >= totalPages || currentPage >= totalPages) {
              console.log(`Reached last page: ${page}/${totalPages}`);
              break; // Достигли последней страницы
            }

            page++;

            // Небольшая задержка между запросами, чтобы не перегружать API
            if (page <= maxPages) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          } catch (pageError) {
            console.error(`Error fetching page ${page}:`, pageError);
            // Продолжаем с следующей страницей, если это не критическая ошибка
            if (page === 1) {
              // Если первая страница не загрузилась, выбрасываем ошибку
              throw pageError;
            }
            // Для последующих страниц просто прерываем цикл
            break;
          }
        }
      } catch (error) {
        console.error("Error in fetchAllRecentTracks:", error);
        // Если удалось загрузить хотя бы часть треков, возвращаем их
        if (allTracks.length > 0) {
          console.log(`Returning ${allTracks.length} tracks despite error`);
          return allTracks;
        }
        throw error;
      }

      console.log(`Total tracks loaded: ${allTracks.length}`);
      return allTracks;
    };

    const tracks = await fetchAllRecentTracks();

    if (tracks.length === 0) {
      console.warn("No tracks to sync");
      return NextResponse.json({
        success: true,
        message: "No tracks to sync",
        count: 0,
        cached: false,
      });
    }

    console.log(`Syncing ${tracks.length} tracks to database...`);
    
    // Проверяем размер данных перед отправкой
    const tracksSize = JSON.stringify(tracks).length;
    console.log(`Tracks payload size: ${(tracksSize / 1024).toFixed(2)} KB`);
    
    // Синхронизируем с Express API
    const result = await recentTracksApi.syncRecentTracks(
      parseInt(userId),
      tracks
    );

    if (result.error) {
      console.error("Error from sync API:", result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    console.log("Sync completed successfully");
    return NextResponse.json({
      success: true,
      message: result.data?.message || "Recent tracks synced",
      count: result.data?.count || tracks.length,
      cached: false,
    });
  } catch (error) {
    console.error("Error syncing recent tracks:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to sync recent tracks";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorStack,
      },
      { status: 500 }
    );
  }
}
