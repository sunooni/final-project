import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Отключаем статическую генерацию для этой страницы
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Динамический импорт с отключением SSR
const EmotionalCalendar = dynamic(
  () => import('@/app/components/Emotion/EmotionalCalendar').then(mod => ({ default: mod.EmotionalCalendar })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка...</div>
        </div>
      </div>
    )
  }
);

export default function EmotionsPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <Suspense fallback={
        <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl mb-2 text-white">Загрузка...</div>
          </div>
        </div>
      }>
        <EmotionalCalendar />
      </Suspense>
    </div>
  );
}
