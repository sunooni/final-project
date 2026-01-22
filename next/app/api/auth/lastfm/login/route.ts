import { NextResponse } from "next/server";
import { lastfmConfig } from "@/config/lastfm";

export async function GET() {
  const { apiKey, redirectUri } = lastfmConfig;

  if (!apiKey || !redirectUri) {
    return NextResponse.json(
      { error: "LASTFM_API_KEY or LASTFM_REDIRECT_URI is not configured" },
      { status: 500 }
    );
  }

  // Last.fm OAuth authorization URL
  const authUrl = new URL('https://www.last.fm/api/auth');
  authUrl.searchParams.set('api_key', apiKey);
  authUrl.searchParams.set('cb', redirectUri);

  return NextResponse.redirect(authUrl.toString());
}
