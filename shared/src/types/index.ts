export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
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
}

export interface Chat {
  id: string;
  name: string | null;
  isGroup: boolean;
  updatedAt: string;
  members: User[];
  lastMessage?: MessagePreview;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: string;
}

export interface MessagesPage {
  messages: Message[];
  mextCursor: string | null;
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

export type ClientToServerEvents = {
  "message:send": (payload: {
    chatId: string;
    text: string;
    imageUrl?: string | null;
    imageMime?: string | null;
    imageSize?: number | null;
  }) => void;
  "chat:join": (chatId: string) => void;
  "chat:leave": (chatId: string) => void;
  "typing:start": (chatId: string) => void;
  "typing:stop": (chatId: string) => void;
};

export type ServerToClientEvents = {
  "message:new": (message: Message) => void;
  "chat:new": (chat: Chat) => void;
  "typing:update": (payload: { chatId: string; userId: string; isTyping: boolean }) => void;
  "presence:update": (payload: PresenceUpdate) => void;
  "presence:snapshot": (payload: PresenceUpdate[]) => void;
};

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGE_PAGE_SIZE = 50;
export const MESSAGE_PAGE_MAX = 100;
