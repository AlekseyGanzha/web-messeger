import { usePresenceStore } from "@/entities/user";
import { Avatar } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { formatLastSeen } from "@/shared/lib/format-last-seen";
import type { Chat } from "@web-messager/shared";

interface ChatListItemProps {
  chat: Chat;
  meId?: string;
  now: Date;
  active: boolean;
  onSelect: () => void;
}

export function ChatListItem({ chat, meId, now, active, onSelect }: ChatListItemProps) {
  const other = chat.isGroup ? null : chat.members.find((member) => member.id !== meId);
  const presence = usePresenceStore((s) => (other ? s.byUserId[other.id] : undefined));
  const isOnline = presence?.isOnline ?? other?.isOnline ?? false;
  const lastSeenAt = presence?.lastSeenAt ?? other?.lastSeenAt ?? null;

  const title = chat.isGroup
    ? (chat.name ?? "Без названия")
    : (chat.name ?? other?.displayName ?? "Чат");

  const subtitle = chat.lastMessage
    ? chat.lastMessage.deletedAt
      ? "Сообщение удалено"
      : chat.lastMessage.text || (chat.lastMessage.imageUrl ? "Изображение" : "")
    : chat.isGroup
      ? `Участников: ${chat.members.length}`
      : isOnline
        ? "в сети"
        : formatLastSeen(lastSeenAt, now);

  const unread = chat.unreadCount ?? 0;

  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-hover sm:px-4",
          active && "bg-elevated",
        )}
      >
        <Avatar
          name={chat.isGroup ? "#" : (other?.displayName ?? chat.name ?? "?")}
          src={other?.avatarUrl}
          isOnline={chat.isGroup ? undefined : isOnline}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate", unread > 0 ? "font-semibold" : "font-medium")}>{title}</p>
          <p
            className={cn(
              "truncate text-xs",
              !chat.lastMessage && !chat.isGroup && isOnline ? "text-success" : "text-muted",
            )}
          >
            {subtitle}
          </p>
        </div>
        {unread > 0 && (
          <span
            className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white"
            aria-label={`Непрочитанных: ${unread}`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </li>
  );
}
