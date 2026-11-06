"use client";

import type { DragEvent, RefObject } from "react";
import { MessageItem } from "@/entities/message";
import { cn } from "@/shared/lib/cn";
import type { Chat, Message } from "@web-messager/shared";

interface MessageListProps {
  chat: Chat;
  messages: Message[];
  meId?: string;
  listRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  showScrollButton: boolean;
  loadingOlder?: boolean;
  onScroll: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onScrollToBottom: () => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message, text: string) => void;
  onDelete?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onRetry?: (message: Message) => void;
}

function isReadByOthers(chat: Chat, meId: string | undefined, message: Message) {
  if (!meId || chat.isGroup) return false;

  const others = chat.members.filter((member) => member.id !== meId);
  if (others.length === 0) return false;

  const createdAt = new Date(message.createdAt).getTime();
  return others.every(
    (member) => member.lastReadAt != null && new Date(member.lastReadAt).getTime() >= createdAt,
  );
}

export function MessageList({
  chat,
  messages,
  meId,
  listRef,
  dragOver,
  showScrollButton,
  loadingOlder = false,
  onScroll,
  onDragOver,
  onDragLeave,
  onDrop,
  onScrollToBottom,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRetry,
}: MessageListProps) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={listRef}
        onScroll={onScroll}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "h-full space-y-2 overflow-y-auto overscroll-contain p-3 transition-colors sm:p-4",
          dragOver && "bg-primary/5 outline-dashed outline-2 outline-primary",
        )}
      >
        {loadingOlder && (
          <p className="py-2 text-center text-xs text-muted" role="status">
            Загрузка истории...
          </p>
        )}
        {messages.map((m) => {
          const sender = chat.isGroup
            ? chat.members.find((member) => member.id === m.senderId)
            : undefined;
          const replySender = m.replyTo
            ? chat.members.find((member) => member.id === m.replyTo?.senderId)?.displayName
            : undefined;

          return (
            <MessageItem
              key={m.id}
              message={m}
              isMine={m.senderId === meId}
              senderName={sender?.displayName}
              replySenderName={replySender}
              isRead={m.senderId === meId && isReadByOthers(chat, meId, m)}
              currentUserId={meId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onRetry={onRetry}
            />
          );
        })}
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={onScrollToBottom}
          aria-label="Прокрутить вниз"
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-lg transition hover:bg-hover"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
