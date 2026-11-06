import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@web-messager/shared";
import { apiConfig } from "@/shared/config";
import { expireSession } from "./client";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
let currentAuthToken: string | null = null;

function isAuthError(message: string) {
  return message === "Unauthorized" || message === "Invalid token";
}

export function getSocket(): AppSocket {
  const token = typeof window !== "undefined" ? localStorage.getItem(apiConfig.TOKEN_KEY) : null;
  if (!socket) {
    socket = io(apiConfig.SOCKET_URL, {
      auth: { token },
      autoConnect: false,
    });
    socket.on("connect_error", (error) => {
      if (isAuthError(error.message)) expireSession();
    });
    currentAuthToken = token;
    return socket;
  }
  if (currentAuthToken !== token) {
    currentAuthToken = token;
    socket.auth = { token: token ?? undefined };
    socket.disconnect();
  }
  return socket;
}

export function connectSocket(): AppSocket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  currentAuthToken = null;
}
