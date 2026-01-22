import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const Friends = dynamic(
  () => import('@/app/components/Friends/Friends').then(mod => ({ default: mod.Friends })),
  { ssr: false }
);

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка...</div>
        </div>
      </div>
    }>
      <div className="h-[calc(100vh-8rem)]">
        <Friends />
      </div>
    </Suspense>
  );
}
