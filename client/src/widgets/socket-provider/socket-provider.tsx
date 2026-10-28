"use client";

import { useEffect } from "react";
import { usePresenceStore, useUserStore } from "@/entities/user";
import { subscribeToMessages } from "@/features/send-message";
import { subscribeToPresence } from "@/features/presence";
import { connectSocket, disconnectSocket } from "@/shared/api";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const userId = useUserStore((s) => s.me?.id);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeMessages = subscribeToMessages();
    const unsubscribePresence = subscribeToPresence();
    connectSocket();

    return () => {
      unsubscribeMessages();
      unsubscribePresence();
      disconnectSocket();
      usePresenceStore.getState().reset();
    };
  }, [userId]);

  return <>{children}</>;
}
