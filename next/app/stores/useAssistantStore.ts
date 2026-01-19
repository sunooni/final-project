import { create } from "zustand";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssistantState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  toggleAssistant: () => void;
  closeAssistant: () => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,
  error: null,

  toggleAssistant: () => set((state) => ({ isOpen: !state.isOpen })),
  closeAssistant: () => set({ isOpen: false }),

  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  sendMessage: async (content) => {
    const { addMessage, setLoading, setError } = get();
    
    // Добавляем сообщение пользователя
    addMessage({ role: 'user', content });
    setLoading(true);
    setError(null);

    try {
      const conversationHistory = get().messages
        .slice(-10) // Последние 10 сообщений для контекста
        .map(msg => ({ role: msg.role, content: msg.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      addMessage({ role: 'assistant', content: data.response });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      addMessage({
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
      });
    } finally {
      setLoading(false);
    }
  },

  clearMessages: () => set({ messages: [] }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));