import { create } from "zustand";
import type { Chat, Message } from "@web-messager/shared";

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  removeChat: (id: string) => void;
  touchChat: (message: Message) => void;
  updateLastMessage: (message: Message) => void;
  markRead: (id: string) => void;
  incrementUnread: (id: string) => void;
  applyRead: (chatId: string, userId: string, lastReadAt: string) => void;
}

function toPreview(message: Message) {
  return {
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    text: message.text,
    imageUrl: message.imageUrl,
    imageMime: message.imageMime,
    imageSize: message.imageSize,
    createdAt: message.createdAt,
    editedAt: message.editedAt ?? null,
    deletedAt: message.deletedAt ?? null,
  };
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  setChats: (chats) => set({ chats }),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  addChat: (chat) =>
    set((s) => {
      const existing = s.chats.find((c) => c.id === chat.id);

      if (!existing) {
        return { chats: [chat, ...s.chats] };
      }

      const merged: Chat = {
        ...existing,
        ...chat,
        unreadCount: chat.unreadCount ?? existing.unreadCount,
      };

      return { chats: s.chats.map((c) => (c.id === chat.id ? merged : c)) };
    }),
  removeChat: (id) =>
    set((s) => ({
      chats: s.chats.filter((chat) => chat.id !== id),
      activeChatId: s.activeChatId === id ? null : s.activeChatId,
    })),
  touchChat: (message) =>
    set((s) => ({
      chats: s.chats
        .map((chat) =>
          chat.id === message.chatId
            ? {
                ...chat,
                updatedAt: message.createdAt,
                lastMessage: toPreview(message),
              }
            : chat,
        )
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    })),
  updateLastMessage: (message) =>
    set((s) => ({
      chats: s.chats.map((chat) =>
        chat.id === message.chatId && chat.lastMessage?.id === message.id
          ? { ...chat, lastMessage: toPreview(message) }
          : chat,
      ),
    })),
  markRead: (id) =>
    set((s) => ({
      chats: s.chats.map((chat) => (chat.id === id ? { ...chat, unreadCount: 0 } : chat)),
    })),
  incrementUnread: (id) =>
    set((s) => ({
      chats: s.chats.map((chat) =>
        chat.id === id ? { ...chat, unreadCount: (chat.unreadCount ?? 0) + 1 } : chat,
      ),
    })),
  applyRead: (chatId, userId, lastReadAt) =>
    set((s) => ({
      chats: s.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              members: chat.members.map((member) =>
                member.id === userId ? { ...member, lastReadAt } : member,
              ),
            }
          : chat,
      ),
    })),
}));
