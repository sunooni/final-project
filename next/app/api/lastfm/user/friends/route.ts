import { NextResponse } from "next/server";
import { callLastfmApi, getLastfmUsername } from "@/app/lib/lastfm";

/**
 * Генерирует детерминированное случайное значение совместимости на основе имени друга
 * Значение всегда будет одинаковым для одного и того же имени друга
 * @param friendName - Имя друга
 * @returns Значение совместимости от 30 до 95
 */
function generateDeterministicCompatibility(friendName: string): number {
  // Простая хеш-функция для генерации детерминированного значения
  let hash = 0;
  for (let i = 0; i < friendName.length; i++) {
    const char = friendName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Преобразуем хеш в значение от 30 до 95
  const normalized = Math.abs(hash) % 66; // 0-65
  return 30 + normalized; // 30-95
}

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

    // Форматируем данные друзей и генерируем случайную совместимость для каждого
    const formattedFriends = friendsList.map((friend: Record<string, any>) => {
      const avatarImages = friend.image || [];
      
      // Проверяем, есть ли у друга аватар (хотя бы одно изображение с непустым URL)
      const hasAvatar = Array.isArray(avatarImages) && avatarImages.some(
        (img: any) => img && img["#text"] && img["#text"].trim() !== ""
      );
      
      // Если есть аватар, совместимость 101%, иначе генерируем детерминированное значение
      const compatibility = hasAvatar 
        ? 101 
        : generateDeterministicCompatibility(friend.name);

      return {
        id: friend.name, // Use name as ID
        name: friend.name,
        realname: friend.realname || friend.name,
        avatar: avatarImages, // Array of images in different sizes
        url: friend.url,
        playcount: friend.playcount || "0",
        registered: friend.registered,
        compatibility, // 101% если есть аватар, иначе детерминированное случайное значение
        favoriteGenre: undefined, // Убираем favoriteGenre, так как больше не получаем жанры
      };
    });

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
