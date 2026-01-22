'use client';

import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';

const TasteMap = dynamicImport(
  () => import('@/app/components/Taste/TasteMap').then(mod => ({ default: mod.TasteMap })),
  { ssr: false }
);

export default function TasteMapPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2 text-white">Загрузка...</div>
        </div>
      </div>
    }>
      <div className="h-[calc(100vh-8rem)]">
        <TasteMap />
      </div>
    </Suspense>
  );
}
