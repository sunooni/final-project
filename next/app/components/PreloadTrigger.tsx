'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Компонент для запуска предзагрузки данных при первой загрузке после авторизации
 * или при первой загрузке приложения, если пользователь уже авторизован
 */
export function PreloadTrigger() {
  const searchParams = useSearchParams();
  const hasPreloadedRef = useRef(false);

  useEffect(() => {
    // Проверяем, запускалась ли уже предзагрузка в этой сессии
    if (hasPreloadedRef.current) {
      return;
    }

    // Проверяем, есть ли параметр preload в URL (устанавливается после авторизации)
    const shouldPreloadFromUrl = searchParams.get('preload') === 'true';
    
    // Также проверяем, нужно ли предзагрузить при первой загрузке
    // (если пользователь уже авторизован, но данные еще не загружены)
    const shouldPreloadOnMount = !sessionStorage.getItem('preload_done');

    if (shouldPreloadFromUrl || shouldPreloadOnMount) {
      hasPreloadedRef.current = true;
      sessionStorage.setItem('preload_done', 'true');

      // Запускаем предзагрузку
      fetch('/api/preload', {
        method: 'POST',
      }).catch((error) => {
        console.error('Preload error:', error);
        // Если ошибка, разрешаем попробовать снова при следующей загрузке
        sessionStorage.removeItem('preload_done');
        hasPreloadedRef.current = false;
      });

      // Убираем параметр из URL после запуска предзагрузки
      if (shouldPreloadFromUrl) {
        const url = new URL(window.location.href);
        url.searchParams.delete('preload');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

  return null;
}
