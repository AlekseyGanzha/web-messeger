export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export type ChatRole = "OWNER" | "MEMBER";

export interface ChatMember extends User {
  role?: ChatRole;
  lastReadAt?: string | null;
}

export interface MessagePreview {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
}

export interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  ownerId?: string | null;
  updatedAt: string;
  members: ChatMember[];
  lastMessage?: MessagePreview;
  unreadCount?: number;
}

export interface MessageReplyPreview {
  id: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  deletedAt: string | null;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export type MessageStatus = "sending" | "sent" | "failed";

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyTo?: MessageReplyPreview | null;
  reactions?: MessageReaction[];
  clientId?: string | null;
  status?: MessageStatus;
}

export interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
}

export interface AuthPayload {
  userId: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  displayName: string;
}

export interface UpdateProfileDto {
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface SendMessagePayload {
  chatId: string;
  text: string;
  imageUrl?: string | null;
  imageMime?: string | null;
  imageSize?: number | null;
  replyToId?: string | null;
  clientId?: string | null;
}

export interface MessageSendResult {
  ok: boolean;
  message?: Message;
  error?: string;
}

export type ClientToServerEvents = {
  "message:send": (payload: SendMessagePayload, ack?: (result: MessageSendResult) => void) => void;
  "chat:join": (chatId: string) => void;
  "chat:leave": (chatId: string) => void;
  "chat:read": (chatId: string) => void;
  "typing:start": (chatId: string) => void;
  "typing:stop": (chatId: string) => void;
};

export type ChatRemovedReason = "deleted" | "removed" | "left";

export type ServerToClientEvents = {
  "message:new": (message: Message) => void;
  "message:updated": (message: Message) => void;
  "chat:new": (chat: Chat) => void;
  "chat:updated": (chat: Chat) => void;
  "chat:removed": (payload: { chatId: string; reason: ChatRemovedReason }) => void;
  "chat:read": (payload: { chatId: string; userId: string; lastReadAt: string }) => void;
  "typing:update": (payload: { chatId: string; userId: string; isTyping: boolean }) => void;
  "presence:update": (payload: PresenceUpdate) => void;
  "presence:snapshot": (payload: PresenceUpdate[]) => void;
};

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_PAGE_SIZE = 50;
export const MESSAGE_PAGE_MAX = 100;
