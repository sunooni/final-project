'use client';

import dynamic from 'next/dynamic';

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
      <EmotionalCalendar />
    </div>
  );
}
