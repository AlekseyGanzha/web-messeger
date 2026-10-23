import { create } from "zustand";
import type { Chat, Message } from "@web-messager/shared";

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  touchChat: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  setChats: (chats) => set({ chats }),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  addChat: (chat) =>
    set((s) =>
      s.chats.some((c) => c.id === chat.id)
        ? { chats: s.chats.map((c) => (c.id === chat.id ? chat : c)) }
        : { chats: [chat, ...s.chats] },
    ),
  touchChat: (message) =>
    set((s) => ({
      chats: s.chats
        .map((chat) =>
          chat.id === message.chatId
            ? {
                ...chat,
                updatedAt: message.createdAt,
                lastMessage: {
                  id: message.id,
                  chatId: message.chatId,
                  senderId: message.senderId,
                  text: message.text,
                  imageUrl: message.imageUrl,
                  imageMime: message.imageMime,
                  imageSize: message.imageSize,
                  createdAt: message.createdAt,
                },
              }
            : chat,
        )
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    })),
}));
