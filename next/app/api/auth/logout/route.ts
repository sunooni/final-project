import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('yandex_access_token');
  cookieStore.delete('yandex_user');

  return NextResponse.json({ success: true });
}

