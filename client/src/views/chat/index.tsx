"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatList } from "@/widgets/chat-list";
import { ChatWindow } from "@/widgets/chat-window";
import { api, ApiError, connectSocket, disconnectSocket, getSocket } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { Button } from "@/shared/ui";
import { useChatStore } from "@/entities/chat";
import { usePresenceStore, useUserStore } from "@/entities/user";
import { markChatRead, subscribeToMessages } from "@/features/send-message";
import { subscribeToGroupEvents } from "@/features/manage-group";
import { subscribeToPresence } from "@/features/presence";
import { AppHeader } from "@/widgets/app-header";
import { cn } from "@/shared/lib/cn";
import type { Chat, User } from "@web-messager/shared";

export default function ChatPage() {
  const router = useRouter();
  const activeChatId = useChatStore((s) => s.activeChatId);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [connected, setConnected] = useState(true);

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

    const socket = getSocket();

    async function refreshChats() {
      try {
        const chats = await api<Chat[]>("/chats");
        if (!cancelled) useChatStore.getState().setChats(chats);
      } catch {}
    }

    function handleConnect() {
      setConnected(true);
      void refreshChats();

      const currentChatId = useChatStore.getState().activeChatId;
      if (currentChatId) markChatRead(currentChatId);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    function handleConnectError() {
      setConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    connectSocket();

    return () => {
      cancelled = true;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
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
    <div className="flex h-[100dvh] flex-col">
      <AppHeader />
      {!connected && (
        <div
          role="status"
          aria-live="polite"
          className="border-b border-line bg-danger/10 px-4 py-1 text-center text-xs text-danger"
        >
          Нет соединения с сервером. Переподключаемся...
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "w-full shrink-0 border-r border-line bg-surface md:block md:w-1/3 md:min-w-[280px]",
            activeChatId && "hidden",
          )}
        >
          <ChatList />
        </aside>
        <main
          className={cn(
            "min-w-0 flex-1 bg-panel md:block",
            activeChatId ? "block" : "hidden md:block",
          )}
        >
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}
