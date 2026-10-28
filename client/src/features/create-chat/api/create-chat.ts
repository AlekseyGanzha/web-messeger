import { api } from "@/shared/api";
import type { Chat } from "@web-messager/shared";

export interface CreateGroupChatDto {
  name: string;
  usernames: string[];
}

export function createGroupChat(dto: CreateGroupChatDto): Promise<Chat> {
  return api<Chat>("/chats", {
    method: "POST",
    body: JSON.stringify({ ...dto, isGroup: true }),
  });
}
