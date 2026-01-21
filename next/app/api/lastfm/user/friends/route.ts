import { NextResponse } from "next/server";
import { callLastfmApi, getLastfmUsername } from "@/app/lib/lastfm";
import { getUserGenres, calculateCompatibility } from "@/app/utils/compatibilityCalculator";

export async function GET() {
  try {
    const username = await getLastfmUsername();

    if (!username) {
      return NextResponse.json(
        { error: "Not authenticated with Last.fm" },
        { status: 401 }
      );
    }

    // Call Last.fm API method user.getFriends to get list of friends
    const data = await callLastfmApi("user.getFriends", {
      user: username,
      limit: "50", // Limit number of friends for optimization
      page: "1",
    });

    // Check if friends exist in response
    if (!data.friends || !data.friends.user) {
      return NextResponse.json({
        success: true,
        friends: [], // Return empty array if no friends
      });
    }

    // Last.fm may return single object or array
    const friendsList = Array.isArray(data.friends.user)
      ? data.friends.user
      : [data.friends.user];

    // Получаем жанры текущего пользователя один раз
    // Используем loved tracks (как в galaxy), ограничиваем 3 страницами для оптимизации
    console.log(`Getting genres for user: ${username}`);
    const userGenres = await getUserGenres(username, 3, false);

    // Форматируем данные друзей и рассчитываем совместимость для каждого
    const formattedFriends = await Promise.all(
      friendsList.map(async (friend: Record<string, any>) => {
        let compatibility = 50; // Значение по умолчанию

        try {
          // Получаем жанры друга через публичный API (используем loved tracks, ограничиваем 3 страницами)
          const friendGenres = await getUserGenres(friend.name, 3, true);
          
          // Рассчитываем совместимость
          if (userGenres.size > 0 && friendGenres.size > 0) {
            compatibility = calculateCompatibility(userGenres, friendGenres);
          } else {
            // Если не удалось получить жанры, используем значение по умолчанию
            compatibility = 50;
          }
        } catch (error) {
          console.error(`Error calculating compatibility for ${friend.name}:`, error);
          // В случае ошибки используем значение по умолчанию
          compatibility = 50;
        }

        return {
          id: friend.name, // Use name as ID
          name: friend.name,
          realname: friend.realname || friend.name,
          avatar: friend.image || [], // Array of images in different sizes
          url: friend.url,
          playcount: friend.playcount || "0",
          registered: friend.registered,
          compatibility, // Реальная совместимость на основе жанров
        };
      })
    );

    return NextResponse.json({
      success: true,
      friends: formattedFriends,
      total: data.friends["@attr"]?.total || formattedFriends.length,
    });
  } catch (error) {
    // Log error for debugging but return 200 with empty friends array
    console.error("Error fetching Last.fm friends:", error);

    // Return 200 status with empty friends array instead of 500
    return NextResponse.json({
      success: true,
      friends: [],
      error: error instanceof Error ? error.message : "Failed to fetch friends",
    });
  }
}
