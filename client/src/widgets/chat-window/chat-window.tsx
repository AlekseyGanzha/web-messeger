"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/entities/chat";
import { useMessageStore } from "@/entities/message";
import { useUserStore } from "@/entities/user";
import {
  deleteMessage,
  editMessage,
  markChatRead,
  retryMessage,
  toggleReaction,
} from "@/features/send-message";
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
  const { chats, activeChatId, setActiveChat } = useChatStore();
  const messages =
    useMessageStore((s) => (activeChatId ? s.byChat[activeChatId] : undefined)) ?? EMPTY_MESSAGES;
  const me = useUserStore((s) => s.me);
  const chat = chats.find((c) => c.id === activeChatId);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  useEffect(() => {
    setSettingsOpen(false);
    setReplyTo(null);
    if (activeChatId) markChatRead(activeChatId);
  }, [activeChatId]);

  const composer = useChatComposer(activeChatId, replyTo, () => setReplyTo(null));
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

  function handleEdit(message: Message, text: string) {
    if (!activeChatId) return;
    void editMessage(activeChatId, message.id, text);
  }

  function handleDelete(message: Message) {
    if (!activeChatId) return;
    void deleteMessage(activeChatId, message.id);
  }

  function handleReact(message: Message, emoji: string) {
    if (!activeChatId) return;
    void toggleReaction(activeChatId, message.id, emoji);
  }

  if (!chat || !activeChatId) {
    return (
      <div className="hidden h-full items-center justify-center text-muted md:flex">
        Выберите чат
      </div>
    );
  }

  const replySenderName = replyTo
    ? chat.members.find((member) => member.id === replyTo.senderId)?.displayName
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        chat={chat}
        meId={me?.id}
        typingUserIds={typingUserIds}
        onBack={() => setActiveChat(null)}
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
        onReply={setReplyTo}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onReact={handleReact}
        onRetry={retryMessage}
      />
      <MessageComposer
        composer={composer}
        replyTo={replyTo}
        replySenderName={replySenderName}
        onCancelReply={() => setReplyTo(null)}
      />
      <GroupSettingsDialog
        open={settingsOpen}
        chat={chat}
        meId={me?.id}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
