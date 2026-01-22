import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lastfmConfig } from "@/config/lastfm";
import { generateApiSignature } from "@/app/lib/lastfm";
import { userApi, lovedTracksApi, recentTracksApi } from "@/app/lib/api";

/**
 * Sync loved tracks from Last.fm to database in background
 * This function runs asynchronously and doesn't block the redirect
 */
async function syncLovedTracksInBackground(
  userId: number,
  username: string,
  sessionKey: string,
  apiKey: string,
  sharedSecret: string
): Promise<void> {
  try {
    // Get loved tracks from Last.fm API using session key directly
    const lovedTracksParams: Record<string, string> = {
      method: "user.getLovedTracks",
      api_key: apiKey,
      sk: sessionKey,
      user: username,
      limit: "50", // Start with first 50 tracks
    };

    // Generate signature
    const lovedTracksSig = generateApiSignature(lovedTracksParams, sharedSecret);
    lovedTracksParams.api_sig = lovedTracksSig;
    lovedTracksParams.format = "json";

    // Build URL and make request
    const lovedTracksUrl = new URL("https://ws.audioscrobbler.com/2.0/");
    Object.entries(lovedTracksParams).forEach(([key, value]) => {
      lovedTracksUrl.searchParams.set(key, value);
    });

    const lovedTracksResponse = await fetch(lovedTracksUrl.toString(), {
      method: "GET",
    });

    if (!lovedTracksResponse.ok) {
      console.error("Failed to fetch loved tracks for sync:", lovedTracksResponse.status);
      return;
    }

    const lovedTracksData = await lovedTracksResponse.json();

    if (lovedTracksData.error) {
      console.error("Last.fm API error when fetching loved tracks:", lovedTracksData.message);
      return;
    }

    // Parse tracks array
    const tracks = Array.isArray(lovedTracksData.lovedtracks?.track)
      ? lovedTracksData.lovedtracks.track
      : lovedTracksData.lovedtracks?.track
      ? [lovedTracksData.lovedtracks.track]
      : [];

    // If there are more pages, fetch them (up to 10 pages = 500 tracks)
    let allTracks = [...tracks];
    const totalPages = parseInt(lovedTracksData.lovedtracks?.["@attr"]?.totalPages || "1");
    
    if (totalPages > 1) {
      for (let page = 2; page <= Math.min(totalPages, 10); page++) {
        try {
          const pageParams: Record<string, string> = {
            method: "user.getLovedTracks",
            api_key: apiKey,
            sk: sessionKey,
            user: username,
            limit: "50",
            page: page.toString(),
          };

          const pageSig = generateApiSignature(pageParams, sharedSecret);
          pageParams.api_sig = pageSig;
          pageParams.format = "json";

          const pageUrl = new URL("https://ws.audioscrobbler.com/2.0/");
          Object.entries(pageParams).forEach(([key, value]) => {
            pageUrl.searchParams.set(key, value);
          });

          const pageResponse = await fetch(pageUrl.toString(), {
            method: "GET",
          });

          if (pageResponse.ok) {
            const pageData = await pageResponse.json();
            if (!pageData.error && pageData.lovedtracks?.track) {
              const pageTracks = Array.isArray(pageData.lovedtracks.track)
                ? pageData.lovedtracks.track
                : [pageData.lovedtracks.track];
              allTracks = allTracks.concat(pageTracks);
            }
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error fetching page ${page} of loved tracks:`, error);
          // Continue with other pages even if one fails
        }
      }
    }

    // Sync tracks to database
    if (allTracks.length > 0) {
      const result = await lovedTracksApi.syncLovedTracks(userId, allTracks);
      if (result.error) {
        console.error("Error syncing loved tracks to database:", result.error);
      } else {
        console.log(
          `Successfully synced ${allTracks.length} loved tracks for user ${userId}`
        );
      }
    }
  } catch (error) {
    console.error("Error in background loved tracks sync:", error);
    // Don't throw - this is a background operation
  }
}

async function syncRecentTracksInBackground( 
  userId: number,
  username: string,
  sessionKey: string,
  apiKey: string,
  sharedSecret: string
): Promise<void> {
  
  const endTimestamp = Math.floor(Date.now() / 1000);
  const startTimestamp = endTimestamp - (90 * 24 * 60 * 60);

  const fetchRecentTracksPage = async (page: number): Promise<any[]> => {
    const recentTracksParams: Record<string, string> = {
      method: "user.getRecentTracks",
      api_key: apiKey,
      user: username,
      from: startTimestamp.toString(),
      to: endTimestamp.toString(),
      limit: "200", // Maximum per page
      page: page.toString(),
    };

    const recentTracksSig = generateApiSignature(recentTracksParams, sharedSecret);
    recentTracksParams.api_sig = recentTracksSig;
    recentTracksParams.format = "json";

    const recentTracksUrl = new URL("https://ws.audioscrobbler.com/2.0/");
    Object.entries(recentTracksParams).forEach(([key, value]) => {
      recentTracksUrl.searchParams.set(key, value);
    });

    const recentTracksResponse = await fetch(recentTracksUrl.toString(), {
      method: "GET",
    });
    if (!recentTracksResponse.ok) {
      console.error(`Failed to fetch recent tracks page ${page}:`, recentTracksResponse.status);
      return [];
    }

    const recentTracksData = await recentTracksResponse.json();

    if (recentTracksData.error) {
      console.error(`Last.fm API error when fetching recent tracks page ${page}:`, recentTracksData.message);
      return [];
    }
    const tracks = Array.isArray(recentTracksData.recenttracks?.track)
        ? recentTracksData.recenttracks.track
        : recentTracksData.recenttracks?.track
        ? [recentTracksData.recenttracks.track]
        : [];

      return tracks;
  };
  const firstPageTracks = await fetchRecentTracksPage(1);
  let allTracks = [...firstPageTracks];

  const maxPages = 10; 
  const delayBetweenPages = 300;

  for (let page = 2; page <= maxPages; page++) {
    await new Promise((resolve) => setTimeout(resolve, delayBetweenPages));
    const pageTracks = await fetchRecentTracksPage(page);
    
    if(pageTracks.length === 0) {
      break;
    }
    allTracks = allTracks.concat(pageTracks);
  } 
  allTracks = allTracks.filter(track => track.date && track.date.uts);

  if (allTracks.length > 0) {
    const result = await recentTracksApi.syncRecentTracks(userId, allTracks);
    if (result.error) {
      console.error("Error syncing recent tracks to database:", result.error);
    } else {
      console.log(
        `Successfully synced ${allTracks.length} recent tracks for user ${userId}`
      );
    }
  } else {
    console.log(`No recent tracks found for user ${userId} in the last 90 days`);
  }
}





export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/lastfm?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!token) {
    return NextResponse.redirect(new URL("/auth/lastfm?error=no_token", request.url));
  }

  try {
    const { apiKey, sharedSecret } = lastfmConfig;

    // Get session key from Last.fm
    const apiSig = generateApiSignature(
      {
        method: "auth.getSession",
        token: token,
        api_key: apiKey,
      },
      sharedSecret
    );

    const sessionUrl = new URL("https://ws.audioscrobbler.com/2.0/");
    sessionUrl.searchParams.set("method", "auth.getSession");
    sessionUrl.searchParams.set("api_key", apiKey);
    sessionUrl.searchParams.set("token", token);
    sessionUrl.searchParams.set("api_sig", apiSig);
    sessionUrl.searchParams.set("format", "json");

    const sessionResponse = await fetch(sessionUrl.toString(), {
      method: "GET",
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text();
      console.error("Session error:", errorData);
      return NextResponse.redirect(
        new URL("/auth/lastfm?error=session_failed", request.url)
      );
    }

    const sessionData = await sessionResponse.json();

    if (sessionData.error) {
      console.error("Last.fm API error:", sessionData.message);
      return NextResponse.redirect(
        new URL(
          `/auth/lastfm?error=${encodeURIComponent(sessionData.message)}`,
          request.url
        )
      );
    }

    const sessionKey = sessionData.session?.key;
    const username = sessionData.session?.name;

    if (!sessionKey || !username) {
      return NextResponse.redirect(
        new URL("/auth/lastfm?error=no_session_key", request.url)
      );
    }

    // Get user info from Last.fm API using session key directly
    let userInfo: any = null;
    try {
      const { apiKey, sharedSecret } = lastfmConfig;
      
      // Build parameters for user.getInfo call
      const userInfoParams: Record<string, string> = {
        method: "user.getInfo",
        api_key: apiKey,
        sk: sessionKey,
        user: username,
      };

      // Generate signature
      const userInfoSig = generateApiSignature(userInfoParams, sharedSecret);
      userInfoParams.api_sig = userInfoSig;
      userInfoParams.format = "json";

      // Build URL and make request
      const userInfoUrl = new URL("https://ws.audioscrobbler.com/2.0/");
      Object.entries(userInfoParams).forEach(([key, value]) => {
        userInfoUrl.searchParams.set(key, value);
      });

      const userInfoResponse = await fetch(userInfoUrl.toString(), {
        method: "GET",
      });

      if (userInfoResponse.ok) {
        const userInfoData = await userInfoResponse.json();
        if (!userInfoData.error) {
          userInfo = userInfoData;
        }
      }
    } catch (error) {
      console.error("Error fetching user info from Last.fm:", error);
      // Continue even if user info fetch fails
    }

    // Create or update user in database
    let userId: number | null = null;
    try {
      const userDataToSave = {
        lastfmUsername: username,
        lastfmSessionKey: sessionKey,
        provider: "lastfm" as const,
        playcount: userInfo?.user?.playcount
          ? parseInt(userInfo.user.playcount)
          : 0,
        country: userInfo?.user?.country || "",
        realname: userInfo?.user?.realname || "",
        image:
          userInfo?.user?.image?.[2]?.["#text"] ||
          userInfo?.user?.image?.[1]?.["#text"] ||
          "",
        url: userInfo?.user?.url || "",
      };

      const userResult = await userApi.createOrUpdateUser(userDataToSave);

      if (userResult.error) {
        console.error("Error creating/updating user in database:", userResult.error);
      } else if (userResult.data) {
        const savedUser = userResult.data as any;
        if (savedUser && typeof savedUser.id === 'number') {
          userId = savedUser.id;
        }
      }
    } catch (error) {
      console.error("Error in user creation/update process:", error);
      // Continue even if database operation fails
    }

    // Store session key and username in cookies
    const cookieStore = await cookies();
    cookieStore.set("lastfm_session_key", sessionKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 365, // 1 year (Last.fm sessions don't expire)
    });

    cookieStore.set("lastfm_username", username || "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 365,
    });

    // Store user_id in cookie if available
    if (userId) {
      cookieStore.set("user_id", userId.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 86400 * 365,
      });

      // Start background synchronization in a non-blocking way
      // Use setTimeout to ensure it doesn't block the redirect response
      setTimeout(() => {
        syncLovedTracksInBackground(userId, username, sessionKey, apiKey, sharedSecret).catch(
          (error: unknown) => {
            console.error("Background sync error:", error);
          }
        );

        syncRecentTracksInBackground(userId, username, sessionKey, apiKey, sharedSecret).catch(
          (error: unknown) => {
            console.error("Background recent tracks sync error:", error);
          }
        );
      }, 0);

      // Запускаем предзагрузку данных для всех страниц в фоне
      setTimeout(() => {
        fetch(new URL("/api/preload", request.url), {
          method: 'POST',
        }).catch((error) => {
          console.error("Preload error:", error);
        });
      }, 100);
    }

    // Добавляем параметр для указания, что нужно запустить предзагрузку на клиенте
    const redirectUrl = new URL("/tracks", request.url);
    redirectUrl.searchParams.set("preload", "true");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Last.fm OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/lastfm?error=internal_error", request.url)
    );
  }
}
