import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { yandexConfig } from '@/config/yandex';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth?error=no_code', request.url)
    );
  }

  try {
    // Exchange authorization code for access token
    const { clientId, clientSecret, redirectUri } = yandexConfig;
    const tokenResponse = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(
        new URL('/auth?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Yandex
    const userResponse = await fetch('https://login.yandex.ru/info', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        new URL('/auth?error=user_info_failed', request.url)
      );
    }

    const userData = await userResponse.json();

    // Store token in httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('yandex_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 86400, // Default to 24 hours
    });

    cookieStore.set('yandex_user', JSON.stringify(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400 * 7, // 7 days
    });

    return NextResponse.redirect(new URL('/taste-map', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth?error=internal_error', request.url)
    );
  }
}

