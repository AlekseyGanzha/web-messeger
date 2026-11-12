const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;
const isAbsoluteUrl = /^https?:\/\//i.test(API_URL);

export const apiConfig = {
  API_URL,
  MEDIA_URL: isAbsoluteUrl ? API_URL.replace(/\/api\/?$/, "") : "",
  SOCKET_URL,
  TOKEN_KEY: "wm_token",
} as const;
