"use client";

import React from "react";
import { useAssistantStore } from "@/app/stores/useAssistantStore";
import { motion, AnimatePresence } from "framer-motion";

export default function Assistant() {
  const { isOpen, toggleAssistant } = useAssistantStore();

  return (
    /* Основной контейнер: фиксируем в нижнем правом углу */
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            /* Стили окна чата */
            className="mb-4 w-[350px] h-[500px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
            {/* Шапка */}
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 font-bold border-b dark:border-zinc-700 flex items-center justify-between">
              <span className="text-zinc-800 dark:text-zinc-200">
                🎵 Музыкальный ассистент
              </span>
              <button
                onClick={toggleAssistant}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Область сообщений */}
            <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-zinc-900">
              <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 inline-block max-w-[85%]">
                Привет! 👋 Я твой музыкальный ассистент. Спроси меня о своих
                вкусах, рекомендациях или статистике!
              </div>
            </div>

            {/* Ввод сообщения */}
            <div className="p-4 border-t dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <input
                type="text"
                placeholder="Спроси о чем-нибудь..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Кнопка триггер */}
      <button
        onClick={toggleAssistant}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        aria-label={isOpen ? "Закрыть ассистента" : "Открыть ассистента"}
      >
        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="text-2xl">
          {isOpen ? "✕" : "💬"}
        </motion.span>
      </button>
    </div>
  );
}
