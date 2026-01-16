'use client';

import { motion } from 'framer-motion';
import { TraksUser } from '@/app/components/TraksUser';

export default function TracksPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-8rem)]"
    >
      <TraksUser />
    </motion.div>
  );
}
