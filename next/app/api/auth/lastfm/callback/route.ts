import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lastfmConfig } from "@/config/lastfm";
import { generateApiSignature } from "@/app/lib/lastfm";

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

    if (!sessionKey) {
      return NextResponse.redirect(
        new URL("/auth/lastfm?error=no_session_key", request.url)
      );
    }

    // Store session key in httpOnly cookie
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

    return NextResponse.redirect(new URL("/taste-map", request.url));
  } catch (error) {
    console.error("Last.fm OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/lastfm?error=internal_error", request.url)
    );
  }
}
