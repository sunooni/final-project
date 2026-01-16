'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Map,
  Calendar,
  TrendingUp,
  Users,
  Sparkles,
  LogOut,
  Music,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

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
  { id: 'taste-map', label: 'Карта Вкуса', icon: Map, href: '/taste-map' },
  { id: 'emotions', label: 'Эмоции', icon: Calendar, href: '/emotions' },
  { id: 'evolution', label: 'Эволюция', icon: TrendingUp, href: '/evolution' },
  { id: 'galaxy', label: 'Галактика', icon: Sparkles, href: '/galaxy' },
  { id: 'friends', label: 'Друзья', icon: Users, href: '/friends' },
];

export const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Предотвращаем повторные запросы
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/user");
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/lastfm/logout', { method: 'POST' });
      router.push('/auth/lastfm');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
//   const { user, logout } = useUserStore();

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 glass-card mx-4 mt-4 rounded-2xl"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl nebula-bg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-gradient-nebula">
            Soundscape DNA
          </span>
        </div>

        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
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
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 nebula-bg rounded-lg"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10" />
                <span className="text-sm font-medium relative z-10 hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nebula-purple to-nebula-pink flex items-center justify-center text-sm font-medium text-white overflow-hidden relative">
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
              <span className="text-sm text-muted-foreground hidden lg:inline">
                {getUserDisplayName()}
              </span>
            </div>
          )}
          {user && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
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
