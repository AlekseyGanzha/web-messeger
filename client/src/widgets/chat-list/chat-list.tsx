"use client";

import { useState } from "react";
import { useChatStore } from "@/entities/chat";
import { useUserStore } from "@/entities/user";
import { useNow } from "@/shared/lib/use-now";
import { CreateGroupDialog } from "@/widgets/create-group-dialog";
import { useCreateChat } from "./model/use-create-chat";
import { ChatListHeader } from "./ui/chat-list-header";
import { ChatListItem } from "./ui/chat-list-item";

export function ChatList() {
  const { chats, activeChatId, setActiveChat, addChat } = useChatStore();
  const meId = useUserStore((s) => s.me?.id);
  const now = useNow();
  const createChat = useCreateChat();
  const [groupOpen, setGroupOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <ChatListHeader
        username={createChat.username}
        onUsernameChange={createChat.setUsername}
        loading={createChat.loading}
        error={createChat.error}
        onCreate={createChat.handleCreate}
        onOpenGroup={() => setGroupOpen(true)}
      />

      {chats.length === 0 ? (
        <p className="p-4 text-sm text-muted">Чатов пока нет</p>
      ) : (
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              meId={meId}
              now={now}
              active={activeChatId === chat.id}
              onSelect={() => setActiveChat(chat.id)}
            />
          ))}
        </ul>
      )}

      <CreateGroupDialog
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        onCreated={(chat) => {
          addChat(chat);
          setActiveChat(chat.id);
        }}
      />
    </div>
  );
}
