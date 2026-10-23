import { create } from "zustand";
import type { Message } from "@web-messager/shared";

interface MessageState {
  byChat: Record<string, Message[]>;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  clear: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  byChat: {},
  setMessages: (chatId, messages) => set((s) => ({ byChat: { ...s.byChat, [chatId]: messages } })),
  addMessage: (message) =>
    set((s) => {
      const list = s.byChat[message.chatId] ?? [];
      if (list.some((m) => m.id === message.id)) return s;
      return {
        byChat: {
          ...s.byChat,
          [message.chatId]: [...list, message],
        },
      };
    }),
  clear: () => set({ byChat: {} }),
}));
