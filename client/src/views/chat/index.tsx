"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatList } from "@/widgets/chat-list";
import { ChatWindow } from "@/widgets/chat-window";
import { api, ApiError, connectSocket, disconnectSocket } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { Button } from "@/shared/ui";
import { useChatStore } from "@/entities/chat";
import { usePresenceStore, useUserStore } from "@/entities/user";
import { subscribeToMessages } from "@/features/send-message";
import { subscribeToGroupEvents } from "@/features/manage-group";
import { subscribeToPresence } from "@/features/presence";
import { AppHeader } from "@/widgets/app-header";
import type { Chat, User } from "@web-messager/shared";

export default function ChatPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem(apiConfig.TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    setError(null);

    (async () => {
      try {
        const [me, chats] = await Promise.all([api<User>("/users/me"), api<Chat[]>("/chats")]);
        if (cancelled) return;
        useUserStore.getState().setMe(me);
        useChatStore.getState().setChats(chats);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;
        setError("Не удалось загрузить чаты. Проверьте соединение с сервером.");
      }
    })();

    const unsubscribeMessages = subscribeToMessages();
    const unsubscribePresence = subscribeToPresence();
    const unsubscribeGroupEvents = subscribeToGroupEvents();
    connectSocket();

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribePresence();
      unsubscribeGroupEvents();
      disconnectSocket();
      useChatStore.getState().setChats([]);
      useChatStore.getState().setActiveChat(null);
      usePresenceStore.getState().reset();
      useUserStore.getState().setMe(null);
    };
  }, [router, retryKey]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-panel p-6 text-center">
        <p className="text-sm text-muted">{error}</p>
        <Button onClick={() => setRetryKey((key) => key + 1)}>Повторить</Button>
      </div>
    );
  }

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
