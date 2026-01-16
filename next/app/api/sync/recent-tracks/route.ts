import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { callLastfmApi, getLastfmUsername } from "@/app/lib/lastfm";
import { recentTracksApi } from "@/app/lib/api";

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

    // Получаем недавние треки из Last.fm
    const lastfmData = await callLastfmApi("user.getRecentTracks", {
      user: username,
      limit: "50",
    });

    const tracks = Array.isArray(lastfmData.recenttracks?.track)
      ? lastfmData.recenttracks.track
      : lastfmData.recenttracks?.track
      ? [lastfmData.recenttracks.track]
      : [];

    // Синхронизируем с Express API
    const result = await recentTracksApi.syncRecentTracks(
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
      message: result.data?.message || "Recent tracks synced",
      count: result.data?.count || tracks.length,
    });
  } catch (error) {
    console.error("Error syncing recent tracks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync recent tracks",
      },
      { status: 500 }
    );
  }
}
