'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const Dashboard = () => {
  const router = useRouter();

  useEffect(() => {
    router.push('/taste-map');
  }, [router]);

  return null;
};
