"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatList } from "@/widgets/chat-list";
import { ChatWindow } from "@/widgets/chat-window";
import { api } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { useChatStore } from "@/entities/chat";
import { useUserStore, usePresenceStore } from "@/entities/user";
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
        usePresenceStore.getState().hydrate([me, ...chats.flatMap((chat) => chat.members)]);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(apiConfig.TOKEN_KEY);
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
      useChatStore.getState().setChats([]);
      useChatStore.getState().setActiveChat(null);
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
