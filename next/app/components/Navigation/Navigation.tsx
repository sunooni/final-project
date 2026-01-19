"use client";

import { motion } from "framer-motion";
import {
  Map,
  Calendar,
  TrendingUp,
  Users,
  Sparkles,
  LogOut,
  Music,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/app/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";

interface User {
  id?: number;
  username?: string;
  login?: string;
  display_name?: string;
  real_name?: string;
  realname?: string;
  provider?: "lastfm";
  image?: string;
}

const navItems = [
  { id: "tracks", label: "Треки", icon: Music, href: "/tracks" },
  { id: "taste-map", label: "Карта Вкуса", icon: Map, href: "/taste-map" },
  { id: "emotions", label: "Эмоции", icon: Calendar, href: "/emotions" },
  { id: "evolution", label: "Эволюция", icon: TrendingUp, href: "/evolution" },
  { id: "galaxy", label: "Галактика", icon: Sparkles, href: "/galaxy" },
  { id: "friends", label: "Друзья", icon: Users, href: "/friends" },
];

export const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/lastfm/logout", { method: "POST" });
      setUser(null);
      router.push("/auth/lastfm");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  const getUserDisplayName = () => {
    if (!user) return "";
    return (
      user.display_name ||
      user.real_name ||
      user.realname ||
      user.username ||
      user.login ||
      ""
    );
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase() || "U";
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800"
    >
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Soundscape DNA
          </span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                  isActive
                    ? "text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="text-sm font-medium relative z-10 hidden md:inline">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-medium text-white overflow-hidden relative">
                {user.image && user.image.trim() ? (
                  <Image
                    src={user.image}
                    alt={getUserDisplayName()}
                    fill
                    className="object-cover rounded-full"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                    }}
                    unoptimized
                  />
                ) : (
                  <span>{getUserInitial()}</span>
                )}
              </div>
              <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden lg:inline">
                {getUserDisplayName()}
              </span>
            </div>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
};
