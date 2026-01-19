'use client';

import { motion } from 'framer-motion';
import { TasteMap } from '@/app/components/Taste/TasteMap';

export default function TasteMapPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="h-[calc(100vh-8rem)]"
    >
      <TasteMap />
    </motion.div>
  );
}
