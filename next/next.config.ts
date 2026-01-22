import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Отключаем статическую оптимизацию для страниц с клиентскими компонентами
  experimental: {
    // Это может помочь с проблемами пререндеринга
  },
};

export default nextConfig;
