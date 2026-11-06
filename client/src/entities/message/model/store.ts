import { create } from "zustand";
import type { Message, MessageStatus } from "@web-messager/shared";

interface MessageState {
  byChat: Record<string, Message[]>;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  replaceMessage: (message: Message) => void;
  setStatus: (chatId: string, messageId: string, status: MessageStatus) => void;
  prependMessages: (chatId: string, messages: Message[]) => void;
  mergeMessages: (chatId: string, messages: Message[]) => void;
  removeChat: (chatId: string) => void;
  clear: () => void;
}

function sameMessage(a: Message, b: Message) {
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.imageUrl === b.imageUrl &&
    a.imageMime === b.imageMime &&
    a.imageSize === b.imageSize &&
    a.createdAt === b.createdAt &&
    (a.editedAt ?? null) === (b.editedAt ?? null) &&
    (a.deletedAt ?? null) === (b.deletedAt ?? null) &&
    (a.clientId ?? null) === (b.clientId ?? null) &&
    JSON.stringify(a.reactions ?? []) === JSON.stringify(b.reactions ?? [])
  );
}

function findIndex(list: Message[], message: Message) {
  const byId = list.findIndex((item) => item.id === message.id);
  if (byId >= 0) return byId;
  if (!message.clientId) return -1;
  return list.findIndex((item) => item.clientId === message.clientId);
}

export const useMessageStore = create<MessageState>((set) => ({
  byChat: {},
  setMessages: (chatId, messages) => set((s) => ({ byChat: { ...s.byChat, [chatId]: messages } })),
  addMessage: (message) =>
    set((s) => {
      const list = s.byChat[message.chatId] ?? [];
      const index = findIndex(list, message);

      if (index >= 0) {
        const current = list[index];
        if (!current || sameMessage(current, message)) return s;

        const next = [...list];
        next[index] = message;
        return { byChat: { ...s.byChat, [message.chatId]: next } };
      }

      return {
        byChat: {
          ...s.byChat,
          [message.chatId]: [...list, message],
        },
      };
    }),
  replaceMessage: (message) =>
    set((s) => {
      const list = s.byChat[message.chatId] ?? [];
      const index = findIndex(list, message);

      if (index < 0) {
        return { byChat: { ...s.byChat, [message.chatId]: [...list, message] } };
      }

      const next = [...list];
      next[index] = message;
      return { byChat: { ...s.byChat, [message.chatId]: next } };
    }),
  setStatus: (chatId, messageId, status) =>
    set((s) => {
      const list = s.byChat[chatId];
      if (!list) return s;

      let changed = false;
      const next = list.map((message) => {
        if (message.id !== messageId || message.status === status) return message;
        changed = true;
        return { ...message, status };
      });

      return changed ? { byChat: { ...s.byChat, [chatId]: next } } : s;
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
  mergeMessages: (chatId, messages) =>
    set((s) => {
      const list = s.byChat[chatId] ?? [];
      const byId = new Map(list.map((m) => [m.id, m]));
      let changed = false;

      for (const message of messages) {
        const current = byId.get(message.id);
        if (!current || !sameMessage(current, message)) {
          byId.set(message.id, message);
          changed = true;
        }
      }

      if (!changed) return s;

      const merged = [...byId.values()].sort(
        (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
      );

      return { byChat: { ...s.byChat, [chatId]: merged } };
    }),
  removeChat: (chatId) =>
    set((s) => {
      const { [chatId]: _removed, ...rest } = s.byChat;
      return { byChat: rest };
    }),
  clear: () => set({ byChat: {} }),
}));
