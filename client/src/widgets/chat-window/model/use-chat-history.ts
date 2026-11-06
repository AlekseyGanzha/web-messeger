import { useCallback, useEffect, useRef, useState } from "react";
import { api, getSocket } from "@/shared/api";
import { useMessageStore } from "@/entities/message";
import { fetchMissedMessages, markChatRead } from "@/features/send-message";
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
        useMessageStore.getState().mergeMessages(activeChatId, page.messages);
        cursorRef.current = page.nextCursor;
        markChatRead(activeChatId);
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  const refreshLatest = useCallback(async () => {
    const chatId = activeChatIdRef.current;
    if (!chatId) return;

    try {
      const store = useMessageStore.getState();
      const existing = store.byChat[chatId] ?? [];

      if (existing.length === 0) {
        const page = await api<MessagesPage>(`/messages/${chatId}/messages`);
        if (activeChatIdRef.current !== chatId) return;
        store.setMessages(chatId, page.messages);
        cursorRef.current = page.nextCursor;
      } else {
        const newestSynced = [...existing]
          .reverse()
          .find((message) => !message.id.startsWith("temp-"));

        if (newestSynced) {
          await fetchMissedMessages(chatId, newestSynced.id);
          if (activeChatIdRef.current !== chatId) return;
        }

        const page = await api<MessagesPage>(`/messages/${chatId}/messages`);
        if (activeChatIdRef.current !== chatId) return;
        store.mergeMessages(chatId, page.messages);
      }

      markChatRead(chatId);
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeChatId) return;

    const socket = getSocket();
    socket.on("connect", refreshLatest);

    return () => {
      socket.off("connect", refreshLatest);
    };
  }, [activeChatId, refreshLatest]);

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
