import { useState, type FormEvent } from "react";
import { useChatStore } from "@/entities/chat";
import { api, ApiError } from "@/shared/api";
import type { Chat } from "@web-messager/shared";

export function useCreateChat() {
  const addChat = useChatStore((s) => s.addChat);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = username.trim();
    if (!target) return;

    setLoading(true);
    setError(null);
    try {
      const chat = await api<Chat>("/chats", {
        method: "POST",
        body: JSON.stringify({ usernames: [target] }),
      });
      addChat(chat);
      setActiveChat(chat.id);
      setUsername("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать чат");
    } finally {
      setLoading(false);
    }
  }

  return { username, setUsername, error, loading, handleCreate };
}
