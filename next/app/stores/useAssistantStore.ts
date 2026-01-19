import { create } from "zustand";

//создание store
interface AssistantState {
  isOpen: boolean;
  toggleAssistant: () => void;
  closeAssistant: () => void;
}

//хук, который будем вызывать в компонентах для обновления состояния
export const useAssistantStore = create<AssistantState>((set) => ({
  isOpen: false,
  toggleAssistant: () => set((state) => ({ isOpen: !state.isOpen })),
  closeAssistant: () => set({ isOpen: false }),
}));
