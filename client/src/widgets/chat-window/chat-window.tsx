"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/entities/chat";
import { useMessageStore, MessageItem } from "@/entities/message";
import { usePresenceStore, useUserStore } from "@/entities/user";
import { sendMessage, sendImageMessage, uploadImage } from "@/features/send-message";
import { api, ApiError } from "@/shared/api";
import { Avatar, Button, Input } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { formatLastSeen } from "@/shared/lib/format-last-seen";
import { useNow } from "@/shared/lib/use-now";
import type { Message } from "@web-messager/shared";

const EMPTY_MESSAGES: Message[] = [];

export function ChatWindow() {
  const { chats, activeChatId } = useChatStore();
  const messages =
    useMessageStore((s) => (activeChatId ? s.byChat[activeChatId] : undefined)) ?? EMPTY_MESSAGES;
  const me = useUserStore((s) => s.me);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chat = chats.find((c) => c.id === activeChatId);

  const other = chat && !chat.isGroup ? chat.members.find((m) => m.id !== me?.id) : null;
  const presence = usePresenceStore((s) => (other ? s.byUserId[other.id] : undefined));
  const isOnline = presence?.isOnline ?? other?.isOnline ?? false;
  const groupOnlineCount = usePresenceStore((s) =>
    chat?.isGroup
      ? chat.members.filter((member) => s.byUserId[member.id]?.isOnline ?? member.isOnline).length
      : 0,
  );
  const now = useNow();

  useEffect(() => {
    if (!activeChatId) return;
    let cancelled = false;
    (async () => {
      try {
        const history = await api<Message[]>(`/messages/${activeChatId}/messages`);
        if (!cancelled) useMessageStore.getState().setMessages(activeChatId, history);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  if (!chat || !activeChatId) {
    return <div className="flex h-full items-center justify-center text-muted">Выберите чат</div>;
  }

  function pickImage(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Можно прикреплять только изображения");
      return;
    }
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function resetImage() {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();
    pickImage(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !image) return;

    if (image) {
      setUploading(true);
      setError(null);
      try {
        const uploaded = await uploadImage(image);
        sendImageMessage(activeChatId!, uploaded, trimmed);
        setText("");
        resetImage();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить изображение");
      } finally {
        setUploading(false);
      }
      return;
    }

    sendMessage(activeChatId!, trimmed);
    setText("");
  }

  return (
    <div className="flex h-full flex-col">
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
            <p className="text-xs text-muted">
              Участников: {chat.members.length}
              {groupOnlineCount > 0 ? ` • ${groupOnlineCount} в сети` : ""}
            </p>
          ) : (
            other && (
              <p className={cn("text-xs", isOnline ? "text-success" : "text-muted")}>
                {isOnline
                  ? "в сети"
                  : formatLastSeen(presence?.lastSeenAt ?? other.lastSeenAt, now)}
              </p>
            )
          )}
        </div>
      </header>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickImage(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-4 transition-colors",
          dragOver && "bg-primary/5 outline-dashed outline-2 outline-primary",
        )}
      >
        {messages.map((m) => {
          const sender = chat.isGroup
            ? chat.members.find((member) => member.id === m.senderId)
            : undefined;

          return (
            <MessageItem
              key={m.id}
              message={m}
              isMine={m.senderId === me?.id}
              senderName={sender?.displayName}
            />
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        className="border-t border-line bg-surface"
      >
        {preview && (
          <div className="flex items-center gap-3 border-b border-line p-3">
            <img src={preview} alt="Превью" className="h-16 w-16 rounded-lg object-cover" />
            <span className="flex-1 truncate text-xs text-muted">{image?.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetImage}
              aria-label="Убрать изображение"
            >
              ×
            </Button>
          </div>
        )}

        {error && <p className="px-3 pt-2 text-xs text-danger">{error}</p>}

        <div className="flex gap-2 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Фото
          </Button>
          <Input
            placeholder="Сообщение"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={uploading}
          />
          <Button type="submit" disabled={uploading || (!text.trim() && !image)}>
            {uploading ? "…" : "Отправить"}
          </Button>
        </div>
      </form>
    </div>
  );
}
