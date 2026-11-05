import { create } from "zustand";
import type { Message } from "@web-messager/shared";

interface MessageState {
  byChat: Record<string, Message[]>;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  removeChat: (chatId: string) => void;
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
  prependMessages: (chatId, messages) =>
    set((s) => {
      const list = s.byChat[chatId] ?? [];
      const existing = new Set(list.map((m) => m.id));
      const older = messages.filter((m) => !existing.has(m.id));
      if (older.length === 0) return s;

      return {
        byChat: {
          ...s.byChat,
          [chatId]: [...older, ...list],
        },
      };
    }),
  removeChat: (chatId) =>
    set((s) => {
      const { [chatId]: _removed, ...rest } = s.byChat;
      return { byChat: rest };
    }),
  clear: () => set({ byChat: {} }),
}));
