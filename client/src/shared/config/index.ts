const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export const apiConfig = {
  API_URL,
  MEDIA_URL: API_URL.replace(/\/api\/?$/, ""),
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001",
  TOKEN_KEY: "wm_token",
} as const;
