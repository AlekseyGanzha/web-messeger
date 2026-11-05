import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, UNAUTHORIZED_EVENT } from "./client";
import { apiConfig } from "@/shared/config";

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  } as unknown as Response;
}

describe("api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("expires the session on a 401 for a protected request", async () => {
    localStorage.setItem(apiConfig.TOKEN_KEY, "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(401, { message: "Unauthorized" })),
    );

    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    try {
      await expect(api("/chats")).rejects.toMatchObject({ status: 401 });
      expect(localStorage.getItem(apiConfig.TOKEN_KEY)).toBeNull();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }
  });

  it("does not expire the session when login is rejected", async () => {
    localStorage.setItem(apiConfig.TOKEN_KEY, "stale");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(401, { message: "Invalid credentials" })),
    );

    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    try {
      await expect(api("/auth/login", { method: "POST" })).rejects.toMatchObject({
        status: 401,
        message: "Invalid credentials",
      });
      expect(localStorage.getItem(apiConfig.TOKEN_KEY)).toBe("stale");
      expect(onUnauthorized).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }
  });

  it("keeps the session on server errors", async () => {
    localStorage.setItem(apiConfig.TOKEN_KEY, "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(500, { message: "Internal server error" })),
    );

    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    try {
      await expect(api("/chats")).rejects.toBeInstanceOf(ApiError);
      expect(localStorage.getItem(apiConfig.TOKEN_KEY)).toBe("token");
      expect(onUnauthorized).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }
  });
});
