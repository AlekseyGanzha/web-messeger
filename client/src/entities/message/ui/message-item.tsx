"use client";

import { useState } from "react";
import type { Message } from "@web-messager/shared";
import { MESSAGE_MAX_LENGTH } from "@web-messager/shared";
import { cn } from "@/shared/lib/cn";
import { apiConfig } from "@/shared/config";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮"];

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function replyLabel(
  message: { text: string; imageUrl: string | null; deletedAt?: string | null },
  senderName?: string,
) {
  const body = message.deletedAt
    ? "Сообщение удалено"
    : message.text || (message.imageUrl ? "Изображение" : "Сообщение");

  return `${senderName ?? "Сообщение"}: ${body}`;
}

export function MessageItem({
  message,
  isMine,
  senderName,
  replySenderName,
  isRead = false,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRetry,
}: {
  message: Message;
  isMine: boolean;
  senderName?: string;
  replySenderName?: string;
  isRead?: boolean;
  currentUserId?: string;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message, text: string) => void;
  onDelete?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onRetry?: (message: Message) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  const deleted = Boolean(message.deletedAt);
  const failed = message.status === "failed";
  const sending = message.status === "sending";

  const reactionGroups = new Map<string, { count: number; mine: boolean }>();
  for (const reaction of message.reactions ?? []) {
    const group = reactionGroups.get(reaction.emoji) ?? { count: 0, mine: false };
    group.count += 1;
    group.mine = group.mine || reaction.userId === currentUserId;
    reactionGroups.set(reaction.emoji, group);
  }

  function startEditing() {
    setDraft(message.text);
    setEditing(true);
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === message.text) {
      setEditing(false);
      return;
    }

    onEdit?.(message, trimmed);
    setEditing(false);
  }

  function confirmDelete() {
    if (window.confirm("Удалить сообщение?")) {
      onDelete?.(message);
    }
  }

  return (
    <div className={cn("group flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[85%] flex-col sm:max-w-[70%]",
          isMine ? "items-end" : "items-start",
        )}
      >
        {senderName && !isMine && (
          <span className="mb-0.5 px-1 text-[11px] font-medium text-primary">{senderName}</span>
        )}

        <div
          className={cn(
            "w-full overflow-hidden rounded-xl text-sm",
            isMine ? "bg-primary text-white" : "bg-surface text-fg",
            deleted && "opacity-80",
          )}
        >
          {message.replyTo && (
            <div
              className={cn(
                "mx-3 mt-2 rounded-md border-l-2 px-2 py-1 text-xs",
                isMine ? "border-white/60 bg-black/10" : "border-primary bg-elevated",
              )}
            >
              <p className="truncate font-medium">{replyLabel(message.replyTo, replySenderName)}</p>
            </div>
          )}

          {!deleted && message.imageUrl && (
            <a href={`${apiConfig.MEDIA_URL}${message.imageUrl}`} target="_blank" rel="noreferrer">
              <img
                src={`${apiConfig.MEDIA_URL}${message.imageUrl}`}
                alt="Изображение"
                className="max-h-80 w-full object-cover"
              />
            </a>
          )}

          <div className="px-3 py-2">
            {editing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={draft}
                  maxLength={MESSAGE_MAX_LENGTH}
                  onChange={(event) => setDraft(event.target.value)}
                  className="min-h-16 w-full rounded-md border border-line bg-surface px-2 py-1 text-fg outline-none focus:border-primary"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-xs opacity-80 hover:opacity-100"
                    onClick={() => setEditing(false)}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-black/20 px-2 py-1 text-xs hover:bg-black/30"
                    onClick={saveEdit}
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              <>
                {deleted ? (
                  <p className="italic opacity-80">Сообщение удалено</p>
                ) : (
                  message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>
                )}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                  {message.editedAt && !deleted && <span>изменено</span>}
                  <time>{formatTime(message.createdAt)}</time>
                  {isMine && !deleted && (
                    <span className={cn(failed && "text-danger opacity-100")}>
                      {sending ? "…" : failed ? "!" : isRead ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {failed && isMine && (
          <button
            type="button"
            onClick={() => onRetry?.(message)}
            className="mt-1 text-xs font-medium text-danger hover:underline"
          >
            Не отправлено · Повторить
          </button>
        )}

        {reactionGroups.size > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {[...reactionGroups.entries()].map(([emoji, group]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message, emoji)}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition",
                  group.mine
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-line bg-surface text-muted hover:bg-hover",
                )}
              >
                <span>{emoji}</span>
                <span>{group.count}</span>
              </button>
            ))}
          </div>
        )}

        {!editing && !deleted && !sending && !failed && (
          <div className="mt-1 flex items-center gap-0.5 opacity-60 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onReply?.(message)}
              className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-hover hover:text-fg"
              aria-label="Ответить"
            >
              ↩
            </button>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(message, emoji)}
                className="rounded px-1 py-0.5 text-xs hover:bg-hover"
                aria-label={`Реакция ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            {isMine && onEdit && (
              <button
                type="button"
                onClick={startEditing}
                className="rounded px-1.5 py-0.5 text-xs text-muted hover:bg-hover hover:text-fg"
                aria-label="Редактировать"
              >
                ✎
              </button>
            )}
            {isMine && onDelete && (
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded px-1.5 py-0.5 text-xs text-danger hover:bg-hover"
                aria-label="Удалить"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
