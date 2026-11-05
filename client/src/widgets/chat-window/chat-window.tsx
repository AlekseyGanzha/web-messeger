"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/entities/chat";
import { useMessageStore } from "@/entities/message";
import { useUserStore } from "@/entities/user";
import { GroupSettingsDialog } from "@/widgets/group-settings";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => setSettingsOpen(false), [activeChatId]);

  const composer = useChatComposer(activeChatId);
  const scroll = useChatScroll(activeChatId, messages);
  const history = useChatHistory(activeChatId);
  const typingUserIds = useTypingIndicator(activeChatId, me?.id, composer.text);

  function handleScroll() {
    scroll.handleScroll();

    const el = scroll.listRef.current;
    if (el && el.scrollTop < 80) {
      void history.loadOlder();
    }
  }

  if (!chat || !activeChatId) {
    return <div className="flex h-full items-center justify-center text-muted">Выберите чат</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        chat={chat}
        meId={me?.id}
        typingUserIds={typingUserIds}
        onOpenSettings={chat.isGroup ? () => setSettingsOpen(true) : undefined}
      />
      <MessageList
        chat={chat}
        messages={messages}
        meId={me?.id}
        listRef={scroll.listRef}
        dragOver={composer.dragOver}
        showScrollButton={scroll.showScrollButton}
        loadingOlder={history.loadingOlder}
        onScroll={handleScroll}
        onDragOver={composer.handleDragOver}
        onDragLeave={composer.handleDragLeave}
        onDrop={composer.handleDrop}
        onScrollToBottom={() => scroll.scrollToBottom("smooth")}
      />
      <MessageComposer composer={composer} />
      <GroupSettingsDialog
        open={settingsOpen}
        chat={chat}
        meId={me?.id}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
