import type { Message, Chat } from "@web-messager/shared";
import { api, connectSocket } from "@/shared/api";
import { useMessageStore } from "@/entities/message";
import { useChatStore } from "@/entities/chat";

export function sendMessage(chatId: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  const socket = connectSocket();
  socket.emit("message:send", { chatId, text: trimmed });
}

export interface UploadedImage {
  url: string;
  mime: string;
  size: number;
}

export async function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData();
  form.append("file", file);

  return api<UploadedImage>("/uploads", { method: "POST", body: form });
}

export function sendImageMessage(chatId: string, image: UploadedImage, text: string): void {
  const socket = connectSocket();
  socket.emit("message:send", {
    chatId,
    text: text.trim(),
    imageUrl: image.url,
    imageMime: image.mime,
    imageSize: image.size,
  });
}

export function subscribeToMessages(): () => void {
  const socket = connectSocket();
  const onMessage = (message: Message) => {
    useMessageStore.getState().addMessage(message);
    useChatStore.getState().touchChat(message);
  };

  const onChat = (chat: Chat) => {
    useChatStore.getState().addChat(chat);
    socket.emit("chat:join", chat.id);
  };

  socket.on("message:new", onMessage);
  socket.on("chat:new", onChat);
  return () => {
    socket.off("message:new", onMessage);
    socket.off("chat:new", onChat);
  };
}
