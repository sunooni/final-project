"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "./Navigation/Navigation";
import { TasteMap } from "./Taste/TasteMap";
import { TraksUser } from "./Tracks/TraksUser";
import { EmotionalCalendar } from "./Emotion/EmotionalCalendar";
import { EvolutionTimeline } from "./Evolution/EvolutionTimeline";
import { GalaxyView } from "./Taste/GalaxyView";
import { Friends } from "./Friends/Friends";

const tabComponents: Record<string, React.ComponentType> = {
  map: TasteMap,
  tracks: TraksUser,
  calendar: EmotionalCalendar,
  evolution: EvolutionTimeline,
  galaxy: GalaxyView,
  social: Friends,
};

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("map");
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="min-h-screen">
      <Navigation />

      <main className="pt-24 pb-8 px-4 md:px-8 max-w-[1600px] mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="h-[calc(100vh-8rem)]"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
