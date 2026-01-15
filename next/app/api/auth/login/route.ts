import { NextResponse } from "next/server";
import { yandexConfig } from "@/config/yandex";

export async function GET() {
  const { clientId, redirectUri } = yandexConfig;

  if (!clientId) {
    return NextResponse.json(
      { error: "YANDEX_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  // Yandex OAuth authorization URL
  const authUrl = new URL("https://oauth.yandex.ru/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "login:email login:info");
  authUrl.searchParams.set("force_confirm", "yes");

  return NextResponse.redirect(authUrl.toString());
}
