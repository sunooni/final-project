import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('yandex_user');

  // Если пользователь авторизован, перенаправляем на дашборд
  if (userCookie) {
    redirect('/taste-map');
  }

  // Если не авторизован, перенаправляем на страницу авторизации
  redirect('/auth');
}
