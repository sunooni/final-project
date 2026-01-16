'use client';

import { motion } from 'framer-motion';
import { EmotionalCalendar } from '@/app/components/EmotionalCalendar';

export default function EmotionsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-8rem)]"
    >
      <EmotionalCalendar />
    </motion.div>
  );
}
