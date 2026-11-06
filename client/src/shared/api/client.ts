import { apiConfig } from "@/shared/config";

export const UNAUTHORIZED_EVENT = "wm:unauthorized";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function expireSession() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(apiConfig.TOKEN_KEY);
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(apiConfig.TOKEN_KEY) : null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(`${apiConfig.API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));

    if (res.status === 401 && token && !path.startsWith("/auth/")) {
      expireSession();
    }

    throw new ApiError(res.status, body.message ?? "Request failed");
  }

  return res.json() as Promise<T>;
}
