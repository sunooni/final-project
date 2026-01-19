"use client";

import Assistant from "../components/Assistant/Assistant";
import { Navigation } from "../components/Navigation/Navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <Navigation />
      <Assistant />

      <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
