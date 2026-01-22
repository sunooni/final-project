import { NextRequest, NextResponse } from "next/server";
import { lastfmConfig } from "@/config/lastfm";

export async function GET(request: NextRequest) {
  const { apiKey } = lastfmConfig;

  if (!apiKey) {
    return NextResponse.json(
      { error: "LASTFM_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // Динамически определяем redirect URI из текущего запроса
  // Это решает проблему с несоответствием портов в локальной разработке
  const baseUrl = new URL(request.url);
  const redirectUri = process.env.LASTFM_REDIRECT_URI || 
    `${baseUrl.protocol}//${baseUrl.host}/api/auth/lastfm/callback`;

  // Last.fm OAuth authorization URL
  const authUrl = new URL('https://www.last.fm/api/auth');
  authUrl.searchParams.set('api_key', apiKey);
  authUrl.searchParams.set('cb', redirectUri);

  return NextResponse.redirect(authUrl.toString());
}
