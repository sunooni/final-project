'use client';

import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';

const TraksUser = dynamicImport(
  () => import('@/app/components/Tracks/TraksUser').then(mod => ({ default: mod.TraksUser })),
  { ssr: false }
);

export default function TracksPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка...</div>
        </div>
      </div>
    }>
      <div className="h-[calc(100vh-8rem)]">
        <TraksUser />
      </div>
    </Suspense>
  );
}
