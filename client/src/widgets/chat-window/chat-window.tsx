"use client";

import { useChatStore } from "@/entities/chat";
import { useMessageStore } from "@/entities/message";
import { useUserStore } from "@/entities/user";
import { useChatComposer } from "./model/use-chat-composer";
import { useChatHistory } from "./model/use-chat-history";
import { useChatScroll } from "./model/use-chat-scroll";
import { useTypingIndicator } from "./model/use-typing-indicator";
import { ChatHeader } from "./ui/chat-header";
import { MessageComposer } from "./ui/message-composer";
import { MessageList } from "./ui/message-list";
import type { Message } from "@web-messager/shared";

const EMPTY_MESSAGES: Message[] = [];

export function ChatWindow() {
  const { chats, activeChatId } = useChatStore();
  const messages =
    useMessageStore((s) => (activeChatId ? s.byChat[activeChatId] : undefined)) ?? EMPTY_MESSAGES;
  const me = useUserStore((s) => s.me);
  const chat = chats.find((c) => c.id === activeChatId);

  const composer = useChatComposer(activeChatId);
  const scroll = useChatScroll(activeChatId, messages);
  useChatHistory(activeChatId);
  const typingUserIds = useTypingIndicator(activeChatId, me?.id, composer.text);

  if (!chat || !activeChatId) {
    return <div className="flex h-full items-center justify-center text-muted">Выберите чат</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader chat={chat} meId={me?.id} typingUserIds={typingUserIds} />
      <MessageList
        chat={chat}
        messages={messages}
        meId={me?.id}
        listRef={scroll.listRef}
        dragOver={composer.dragOver}
        showScrollButton={scroll.showScrollButton}
        onScroll={scroll.handleScroll}
        onDragOver={composer.handleDragOver}
        onDragLeave={composer.handleDragLeave}
        onDrop={composer.handleDrop}
        onScrollToBottom={() => scroll.scrollToBottom("smooth")}
      />
      <MessageComposer composer={composer} />
    </div>
  );
}
