"use client";

import { useState } from "react";
import { useChatStore } from "@/entities/chat";
import { usePresenceStore, useUserStore } from "@/entities/user";
import { api, ApiError } from "@/shared/api";
import { Avatar, Button, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { formatLastSeen } from "@/shared/lib/format-last-seen";
import { useNow } from "@/shared/lib/use-now";
import { CreateGroupDialog } from "@/widgets/create-group-dialog";
import type { Chat } from "@web-messager/shared";

export function ChatList() {
  const { chats, activeChatId, setActiveChat, addChat } = useChatStore();
  const meId = useUserStore((s) => s.me?.id);
  const now = useNow();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

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
      <div className="flex flex-col gap-2 border-b border-line p-3">
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="Логин собеседника"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit" disabled={loading || !username.trim()}>
            +
          </Button>
        </form>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button type="button" variant="secondary" size="sm" onClick={() => setGroupOpen(true)}>
          Создать группу
        </Button>
      </div>

      {chats.length === 0 ? (
        <p className="p-4 text-sm text-muted">Чатов пока нет</p>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              meId={meId}
              now={now}
              active={activeChatId === chat.id}
              onSelect={() => setActiveChat(chat.id)}
            />
          ))}
        </ul>
      )}

      <CreateGroupDialog
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreated={(chat) => {
          addChat(chat);
          setActiveChat(chat.id);
        }}
      />
    </div>
  );
}

interface ChatListItemProps {
  chat: Chat;
  meId?: string;
  now: Date;
  active: boolean;
  onSelect: () => void;
}

function ChatListItem({ chat, meId, now, active, onSelect }: ChatListItemProps) {
  const other = chat.isGroup ? null : chat.members.find((member) => member.id !== meId);
  const presence = usePresenceStore((s) => (other ? s.byUserId[other.id] : undefined));
  const isOnline = presence?.isOnline ?? other?.isOnline ?? false;
  const lastSeenAt = presence?.lastSeenAt ?? other?.lastSeenAt ?? null;

  const title = chat.isGroup
    ? (chat.name ?? "Без названия")
    : (chat.name ?? other?.displayName ?? "Чат");

  const subtitle = chat.lastMessage
    ? chat.lastMessage.text || (chat.lastMessage.imageUrl ? "Изображение" : "")
    : chat.isGroup
      ? `Участников: ${chat.members.length}`
      : isOnline
        ? "в сети"
        : formatLastSeen(lastSeenAt, now);

  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover",
          active && "bg-elevated",
        )}
      >
        <Avatar
          name={chat.isGroup ? "#" : (other?.displayName ?? chat.name ?? "?")}
          src={other?.avatarUrl}
          isOnline={chat.isGroup ? undefined : isOnline}
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p
            className={cn(
              "truncate text-xs",
              !chat.lastMessage && !chat.isGroup && isOnline ? "text-success" : "text-muted",
            )}
          >
            {subtitle}
          </p>
        </div>
      </button>
    </li>
  );
}
