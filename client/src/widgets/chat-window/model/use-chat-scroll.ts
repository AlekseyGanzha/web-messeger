import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Message } from "@web-messager/shared";

export function useChatScroll(activeChatId: string | null, messages: Message[]) {
  const listRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevChatIdRef = useRef<string | null>(null);
  const jumpToBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  };

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : undefined;

  useLayoutEffect(() => {
    const chatChanged = prevChatIdRef.current !== activeChatId;
    prevChatIdRef.current = activeChatId;

    if (chatChanged) {
      isAtBottomRef.current = true;
      jumpToBottomRef.current = true;
      setShowScrollButton(false);
    }

    if (messages.length === 0) return;

    if (jumpToBottomRef.current) {
      jumpToBottomRef.current = false;
      scrollToBottom("auto");
      return;
    }

    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [activeChatId, messages.length, lastMessageId, scrollToBottom]);

  return { listRef, showScrollButton, handleScroll, scrollToBottom };
}
