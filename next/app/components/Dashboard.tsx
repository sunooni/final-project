'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from './Navigation';
import { TasteMap } from './TasteMap';
import { EmotionalCalendar } from './EmotionalCalendar';
import { EvolutionTimeline } from './EvolutionTimeline';
import { GalaxyView } from './GalaxyView';
import { SocialHub } from './SocialHub';

const tabComponents: Record<string, React.ComponentType> = {
  map: TasteMap,
  calendar: EmotionalCalendar,
  evolution: EvolutionTimeline,
  galaxy: GalaxyView,
  social: SocialHub,
};

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('map');
  const ActiveComponent = tabComponents[activeTab];

  return (
    <div className="min-h-screen">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
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
