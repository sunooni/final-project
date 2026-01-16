'use client';

import { Navigation } from '../components/Navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
