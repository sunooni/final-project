import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const lastfmSession = cookieStore.get('lastfm_session_key');

  // Если пользователь авторизован, перенаправляем на дашборд
  if (lastfmSession) {
    redirect('/tracks');
  }

  // Если не авторизован, перенаправляем на страницу авторизации
  redirect('/auth/lastfm');
}
