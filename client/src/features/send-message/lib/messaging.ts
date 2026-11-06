import {
  type Chat,
  type Message,
  type MessagesPage,
  type SendMessagePayload,
  MESSAGE_MAX_LENGTH,
  MESSAGE_PAGE_MAX,
} from "@web-messager/shared";
import { api, connectSocket, getSocket } from "@/shared/api";
import { useMessageStore } from "@/entities/message";
import { useChatStore } from "@/entities/chat";
import { useUserStore } from "@/entities/user";

const SEND_TIMEOUT = 15_000;
const READ_THROTTLE = 1_000;
const readEmittedAt = new Map<string, number>();
const readTimers = new Map<string, ReturnType<typeof setTimeout>>();

export interface UploadedImage {
  url: string;
  mime: string;
  size: number;
}

interface SendOptions {
  replyTo?: Message | null;
}

function createClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function replyPreview(message: Message) {
  return {
    id: message.id,
    senderId: message.senderId,
    text: message.deletedAt ? "" : message.text,
    imageUrl: message.deletedAt ? null : message.imageUrl,
    deletedAt: message.deletedAt ?? null,
  };
}

function dispatch(payload: SendMessagePayload, messageId: string) {
  const socket = connectSocket();
  let settled = false;

  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    useMessageStore.getState().setStatus(payload.chatId, messageId, "failed");
  }, SEND_TIMEOUT);

  socket.emit("message:send", payload, (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);

    if (result.ok && result.message) {
      useMessageStore.getState().replaceMessage({ ...result.message, status: "sent" });
      useChatStore.getState().touchChat(result.message);
      return;
    }

    useMessageStore.getState().setStatus(payload.chatId, messageId, "failed");
  });
}

export function sendMessage(chatId: string, text: string, options: SendOptions = {}): void {
  const trimmed = text.trim();
  const me = useUserStore.getState().me;
  if (!trimmed || trimmed.length > MESSAGE_MAX_LENGTH || !me) return;

  const clientId = createClientId();
  const tempId = `temp-${clientId}`;
  const optimistic: Message = {
    id: tempId,
    chatId,
    senderId: me.id,
    text: trimmed,
    imageUrl: null,
    imageMime: null,
    imageSize: null,
    createdAt: new Date().toISOString(),
    replyTo: options.replyTo ? replyPreview(options.replyTo) : null,
    reactions: [],
    clientId,
    status: "sending",
  };

  useMessageStore.getState().addMessage(optimistic);
  useChatStore.getState().touchChat(optimistic);

  dispatch(
    {
      chatId,
      text: trimmed,
      clientId,
      replyToId: options.replyTo?.id ?? null,
    },
    tempId,
  );
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);

  return api<UploadedImage>("/uploads", { method: "POST", body: form });
}

export function sendImageMessage(
  chatId: string,
  image: UploadedImage,
  text: string,
  options: SendOptions = {},
): void {
  const me = useUserStore.getState().me;
  if (!me) return;

  const trimmed = text.trim();
  const clientId = createClientId();
  const tempId = `temp-${clientId}`;
  const optimistic: Message = {
    id: tempId,
    chatId,
    senderId: me.id,
    text: trimmed,
    imageUrl: image.url,
    imageMime: image.mime,
    imageSize: image.size,
    createdAt: new Date().toISOString(),
    replyTo: options.replyTo ? replyPreview(options.replyTo) : null,
    reactions: [],
    clientId,
    status: "sending",
  };

  useMessageStore.getState().addMessage(optimistic);
  useChatStore.getState().touchChat(optimistic);

  dispatch(
    {
      chatId,
      text: trimmed,
      imageUrl: image.url,
      imageMime: image.mime,
      imageSize: image.size,
      clientId,
      replyToId: options.replyTo?.id ?? null,
    },
    tempId,
  );
}

export function retryMessage(message: Message): void {
  if (message.status !== "failed") return;

  const clientId = message.clientId ?? createClientId();

  useMessageStore.getState().setStatus(message.chatId, message.id, "sending");

  dispatch(
    {
      chatId: message.chatId,
      text: message.text,
      imageUrl: message.imageUrl,
      imageMime: message.imageMime,
      imageSize: message.imageSize,
      clientId,
      replyToId: message.replyTo?.id ?? null,
    },
    message.id,
  );
}

export async function editMessage(
  chatId: string,
  messageId: string,
  text: string,
): Promise<Message> {
  const message = await api<Message>(`/messages/${chatId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ text }),
  });

  useMessageStore.getState().replaceMessage(message);
  useChatStore.getState().updateLastMessage(message);
  return message;
}

export async function deleteMessage(chatId: string, messageId: string): Promise<Message> {
  const message = await api<Message>(`/messages/${chatId}/messages/${messageId}`, {
    method: "DELETE",
  });

  useMessageStore.getState().replaceMessage(message);
  useChatStore.getState().updateLastMessage(message);
  return message;
}

export async function toggleReaction(
  chatId: string,
  messageId: string,
  emoji: string,
): Promise<Message> {
  const message = await api<Message>(`/messages/${chatId}/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });

  useMessageStore.getState().replaceMessage(message);
  return message;
}

export function markChatRead(chatId: string): void {
  useChatStore.getState().markRead(chatId);

  const now = Date.now();
  const last = readEmittedAt.get(chatId) ?? 0;
  const wait = READ_THROTTLE - (now - last);

  if (wait <= 0) {
    readEmittedAt.set(chatId, now);
    connectSocket().emit("chat:read", chatId);
    return;
  }

  if (readTimers.has(chatId)) return;

  readTimers.set(
    chatId,
    setTimeout(() => {
      readTimers.delete(chatId);
      if (!useUserStore.getState().me) return;
      readEmittedAt.set(chatId, Date.now());
      connectSocket().emit("chat:read", chatId);
    }, wait),
  );
}

export function subscribeToMessages(): () => void {
  const socket = getSocket();

  const onMessage = (message: Message) => {
    const meId = useUserStore.getState().me?.id;

    useMessageStore.getState().addMessage({ ...message, status: "sent" });
    useChatStore.getState().touchChat(message);

    if (message.senderId === meId) return;

    const { activeChatId } = useChatStore.getState();

    if (activeChatId === message.chatId) {
      markChatRead(message.chatId);
    } else {
      useChatStore.getState().incrementUnread(message.chatId);
    }
  };

  const onUpdated = (message: Message) => {
    useMessageStore.getState().replaceMessage(message);
    useChatStore.getState().updateLastMessage(message);
  };

  const onRead = ({
    chatId,
    userId,
    lastReadAt,
  }: {
    chatId: string;
    userId: string;
    lastReadAt: string;
  }) => {
    useChatStore.getState().applyRead(chatId, userId, lastReadAt);

    if (userId === useUserStore.getState().me?.id) {
      useChatStore.getState().markRead(chatId);
    }
  };

  const onChat = (chat: Chat) => {
    useChatStore.getState().addChat(chat);
    socket.emit("chat:join", chat.id);
  };

  socket.on("message:new", onMessage);
  socket.on("message:updated", onUpdated);
  socket.on("chat:read", onRead);
  socket.on("chat:new", onChat);

  return () => {
    socket.off("message:new", onMessage);
    socket.off("message:updated", onUpdated);
    socket.off("chat:read", onRead);
    socket.off("chat:new", onChat);
  };
}

export async function fetchMissedMessages(chatId: string, afterId: string): Promise<void> {
  let cursor: string | null = afterId;

  for (let page = 0; page < 20 && cursor; page += 1) {
    const result: MessagesPage = await api<MessagesPage>(
      `/messages/${chatId}/messages?after=${encodeURIComponent(cursor)}&limit=${MESSAGE_PAGE_MAX}`,
    );

    if (useChatStore.getState().activeChatId !== chatId) return;

    useMessageStore.getState().mergeMessages(chatId, result.messages);
    cursor = result.nextCursor;
  }
}
