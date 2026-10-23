"use client";

import { useState } from "react";
import { useChatStore } from "@/entities/chat";
import { api, ApiError } from "@/shared/api";
import { Button, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { Chat } from "@web-messager/shared";

export function ChatList() {
  const { chats, activeChatId, setActiveChat, addChat } = useChatStore();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
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

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={handleCreate} className="flex flex-col gap-2 border-b border-line p-3">
        <div className="flex gap-2">
          <Input
            placeholder="Логин собеседника"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit" disabled={loading || !username.trim()}>
            +
          </Button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>

      {chats.length === 0 ? (
        <p className="p-4 text-sm text-muted">Чатов пока нет</p>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {chats.map((chat) => (
            <li key={chat.id}>
              <button
                onClick={() => setActiveChat(chat.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover",
                  activeChatId === chat.id && "bg-elevated",
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  {chat.isGroup ? "#" : (chat.name?.[0] ?? "?")}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {chat.isGroup ? `Группа: ${chat.name ?? "без названия"}` : chat.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {chat.lastMessage
                      ? chat.lastMessage.text || (chat.lastMessage.imageUrl ? "Изображение" : "")
                      : chat.members.filter((m) => m.isOnline).length > 0
                        ? "в сети"
                        : "не в сети"}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
