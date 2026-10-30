import { useEffect } from "react";
import { api } from "@/shared/api";
import { useMessageStore } from "@/entities/message";
import type { Message } from "@web-messager/shared";

export function useChatHistory(activeChatId: string | null) {
  useEffect(() => {
    if (!activeChatId) return;
    let cancelled = false;
    (async () => {
      try {
        const history = await api<Message[]>(`/messages/${activeChatId}/messages`);
        if (!cancelled) useMessageStore.getState().setMessages(activeChatId, history);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);
}
