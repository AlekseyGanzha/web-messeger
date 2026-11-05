import type { Chat } from "@web-messager/shared";
import { getSocket } from "@/shared/api";
import { useChatStore } from "@/entities/chat";
import { useMessageStore } from "@/entities/message";

export function subscribeToGroupEvents(): () => void {
  const socket = getSocket();

  const onUpdated = (chat: Chat) => {
    useChatStore.getState().addChat(chat);
    socket.emit("chat:join", chat.id);
  };

  const onRemoved = ({ chatId }: { chatId: string }) => {
    useChatStore.getState().removeChat(chatId);
    useMessageStore.getState().removeChat(chatId);
  };

  socket.on("chat:updated", onUpdated);
  socket.on("chat:removed", onRemoved);

  return () => {
    socket.off("chat:updated", onUpdated);
    socket.off("chat:removed", onRemoved);
  };
}
