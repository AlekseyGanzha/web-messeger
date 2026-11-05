import { api } from "@/shared/api";
import type { Chat } from "@web-messager/shared";

export function addGroupMembers(chatId: string, usernames: string[]): Promise<Chat> {
  return api<Chat>(`/chats/${chatId}/members`, {
    method: "POST",
    body: JSON.stringify({ usernames }),
  });
}

export function removeGroupMember(chatId: string, userId: string): Promise<Chat> {
  return api<Chat>(`/chats/${chatId}/members/${userId}`, { method: "DELETE" });
}

export function leaveGroup(chatId: string): Promise<{ success: true }> {
  return api<{ success: true }>(`/chats/${chatId}/leave`, { method: "POST" });
}

export function deleteGroup(chatId: string): Promise<{ success: true }> {
  return api<{ success: true }>(`/chats/${chatId}`, { method: "DELETE" });
}
