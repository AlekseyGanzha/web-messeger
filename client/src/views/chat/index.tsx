"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatList } from "@/widgets/chat-list";
import { ChatWindow } from "@/widgets/chat-window";
import { api, connectSocket, disconnectSocket } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { useChatStore } from "@/entities/chat";
import { usePresenceStore, useUserStore } from "@/entities/user";
import { subscribeToMessages } from "@/features/send-message";
import { subscribeToPresence } from "@/features/presence";
import { AppHeader } from "@/widgets/app-header";
import type { Chat, User } from "@web-messager/shared";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem(apiConfig.TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [me, chats] = await Promise.all([api<User>("/users/me"), api<Chat[]>("/chats")]);
        if (cancelled) return;
        useUserStore.getState().setMe(me);
        useChatStore.getState().setChats(chats);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(apiConfig.TOKEN_KEY);
        router.replace("/login");
      }
    })();

    const unsubscribeMessages = subscribeToMessages();
    const unsubscribePresence = subscribeToPresence();
    connectSocket();

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribePresence();
      disconnectSocket();
      useChatStore.getState().setChats([]);
      useChatStore.getState().setActiveChat(null);
      usePresenceStore.getState().reset();
      useUserStore.getState().setMe(null);
    };
  }, [router]);

  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/3 min-w-[280px] border-r border-line bg-surface">
          <ChatList />
        </aside>
        <main className="flex-1 bg-panel">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}
