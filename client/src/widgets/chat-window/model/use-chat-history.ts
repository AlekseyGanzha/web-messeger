import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/shared/api";
import { useMessageStore } from "@/entities/message";
import type { MessagesPage } from "@web-messager/shared";

export function useChatHistory(activeChatId: string | null) {
  const [loadingOlder, setLoadingOlder] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const activeChatIdRef = useRef<string | null>(activeChatId);
  const loadingRef = useRef(false);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    cursorRef.current = null;
    loadingRef.current = false;
    setLoadingOlder(false);

    if (!activeChatId) return;

    let cancelled = false;

    (async () => {
      try {
        const page = await api<MessagesPage>(`/messages/${activeChatId}/messages`);
        if (cancelled) return;
        useMessageStore.getState().setMessages(activeChatId, page.messages);
        cursorRef.current = page.nextCursor;
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  const loadOlder = useCallback(async () => {
    const chatId = activeChatIdRef.current;
    const cursor = cursorRef.current;

    if (!chatId || !cursor || loadingRef.current) return;

    loadingRef.current = true;
    setLoadingOlder(true);

    try {
      const page = await api<MessagesPage>(
        `/messages/${chatId}/messages?before=${encodeURIComponent(cursor)}`,
      );

      if (activeChatIdRef.current !== chatId) return;

      useMessageStore.getState().prependMessages(chatId, page.messages);
      cursorRef.current = page.nextCursor;
    } catch {
    } finally {
      loadingRef.current = false;
      if (activeChatIdRef.current === chatId) setLoadingOlder(false);
    }
  }, []);

  return { loadOlder, loadingOlder };
}
