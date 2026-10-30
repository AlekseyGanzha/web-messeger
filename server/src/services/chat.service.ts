import type { Chat } from "@web-messager/shared";

export const userSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isOnline: true,
  lastSeenAt: true,
} as const;

type MemberUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: Date | null;
};

type ChatWithRelations = {
  id: string;
  name: string | null;
  isGroup: boolean;
  updatedAt: Date;
  members: { userId: string; user: MemberUser }[];
  messages: {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    imageUrl: string | null;
    imageMime: string | null;
    imageSize: number | null;
    createdAt: Date;
  }[];
};

export function toChatDto(chat: ChatWithRelations, currentUserId: string): Chat {
  const other = chat.members.find((m) => m.userId !== currentUserId)?.user;
  const name = chat.isGroup ? chat.name : (other?.displayName ?? chat.name);
  const last = chat.messages[0];

  return {
    id: chat.id,
    name: name ?? null,
    isGroup: chat.isGroup,
    updatedAt: chat.updatedAt.toISOString(),
    members: chat.members.map((m) => ({
      ...m.user,
      lastSeenAt: m.user.lastSeenAt ? m.user.lastSeenAt.toISOString() : null,
    })),
    lastMessage: last
      ? {
          id: last.id,
          chatId: last.chatId,
          senderId: last.senderId,
          text: last.text,
          imageUrl: last.imageUrl,
          imageMime: last.imageMime,
          imageSize: last.imageSize,
          createdAt: last.createdAt.toISOString(),
        }
      : undefined,
  };
}
