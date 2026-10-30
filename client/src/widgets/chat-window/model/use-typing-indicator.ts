import { useEffect, useRef, useState } from "react";
import { connectSocket } from "@/shared/api";

export function useTypingIndicator(
  activeChatId: string | null,
  meId: string | undefined,
  text: string,
): string[] {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!activeChatId) return;

    const socket = connectSocket();
    setTypingUserIds([]);

    const onTyping = (payload: { chatId: string; userId: string; isTyping: boolean }) => {
      if (payload.chatId !== activeChatId || payload.userId === meId) return;

      setTypingUserIds((prev) =>
        payload.isTyping
          ? prev.includes(payload.userId)
            ? prev
            : [...prev, payload.userId]
          : prev.filter((id) => id !== payload.userId),
      );
    };

    socket.on("typing:update", onTyping);
    return () => {
      socket.off("typing:update", onTyping);
    };
  }, [activeChatId, meId]);

  useEffect(() => {
    if (!activeChatId) return;

    const socket = connectSocket();

    if (!text.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit("typing:stop", activeChatId);
      }
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", activeChatId);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop", activeChatId);
    }, 2000);

    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
    };
  }, [activeChatId, text]);

  useEffect(() => {
    return () => {
      if (isTypingRef.current && activeChatId) {
        isTypingRef.current = false;
        connectSocket().emit("typing:stop", activeChatId);
      }
    };
  }, [activeChatId]);

  return typingUserIds;
}
