"use client";

import { usePresenceStore } from "@/entities/user";
import { Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { formatLastSeen } from "@/shared/lib/format-last-seen";
import { useNow } from "@/shared/lib/use-now";
import type { Chat } from "@web-messager/shared";

interface ChatHeaderProps {
  chat: Chat;
  meId?: string;
  typingUserIds: string[];
}

export function ChatHeader({ chat, meId, typingUserIds }: ChatHeaderProps) {
  const other = chat.isGroup ? null : chat.members.find((member) => member.id !== meId);
  const presence = usePresenceStore((s) => (other ? s.byUserId[other.id] : undefined));
  const isOnline = presence?.isOnline ?? other?.isOnline ?? false;
  const groupOnlineCount = usePresenceStore((s) =>
    chat.isGroup
      ? chat.members.filter((member) => s.byUserId[member.id]?.isOnline ?? member.isOnline).length
      : 0,
  );
  const now = useNow();

  const typingNames = chat.members
    .filter((member) => typingUserIds.includes(member.id))
    .map((member) => member.displayName);

  const typingText =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? `${typingNames[0]} печатает…`
        : `${typingNames[0]} и ещё ${typingNames.length - 1} печатают…`;

  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
      {chat.isGroup ? (
        <Avatar name="#" />
      ) : (
        other && <Avatar name={other.displayName} src={other.avatarUrl} isOnline={isOnline} />
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">
          {chat.isGroup ? (chat.name ?? "Без названия") : chat.name}
        </p>
        {chat.isGroup ? (
          typingText ? (
            <p className="text-xs text-primary">{typingText}</p>
          ) : (
            <p className="text-xs text-muted">
              Участников: {chat.members.length}
              {groupOnlineCount > 0 ? ` • ${groupOnlineCount} в сети` : ""}
            </p>
          )
        ) : typingNames.length > 0 ? (
          <p className="text-xs text-primary">печатает…</p>
        ) : (
          other && (
            <p className={cn("text-xs", isOnline ? "text-success" : "text-muted")}>
              {isOnline ? "в сети" : formatLastSeen(presence?.lastSeenAt ?? other.lastSeenAt, now)}
            </p>
          )
        )}
      </div>
    </header>
  );
}
