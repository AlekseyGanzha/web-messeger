import { api, disconnectSocket } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { useUserStore } from "@/entities/user";
import { useChatStore } from "@/entities/chat";
import { useMessageStore } from "@/entities/message";
import type { AuthResponse, LoginDto, RegisterDto } from "@web-messager/shared";

export async function login(dto: LoginDto): Promise<void> {
  const data = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  localStorage.setItem(apiConfig.TOKEN_KEY, data.token);
  useUserStore.getState().setMe(data.user);
}

export async function register(dto: RegisterDto): Promise<void> {
  const data = await api<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  localStorage.setItem(apiConfig.TOKEN_KEY, data.token);
  useUserStore.getState().setMe(data.user);
}

export function logout(): void {
  localStorage.removeItem(apiConfig.TOKEN_KEY);
  useUserStore.getState().setMe(null);
  useChatStore.getState().setChats([]);
  useChatStore.getState().setActiveChat(null);
  useMessageStore.getState().clear();
  try {
    disconnectSocket();
  } catch {}
}
