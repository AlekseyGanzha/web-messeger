import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiConfig } from "@/shared/config";

type SocketHandler = (...args: unknown[]) => void;

const ioMock = vi.hoisted(() => {
  const handlers = new Map<string, SocketHandler>();
  const socket = {
    connected: false,
    auth: {} as Record<string, unknown>,
    on: vi.fn((event: string, handler: SocketHandler) => {
      handlers.set(event, handler);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  return { io: vi.fn(() => socket), socket, handlers };
});

vi.mock("socket.io-client", () => ({ io: ioMock.io }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  ioMock.handlers.clear();
  ioMock.socket.connected = false;
  localStorage.clear();
});

describe("socket session handling", () => {
  it("expires the session when the server rejects the token", async () => {
    const { getSocket } = await import("./socket");
    const { UNAUTHORIZED_EVENT } = await import("./client");
    localStorage.setItem(apiConfig.TOKEN_KEY, "token");

    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    try {
      getSocket();
      const handler = ioMock.handlers.get("connect_error");
      expect(handler).toBeTypeOf("function");

      handler?.(new Error("Invalid token"));

      expect(localStorage.getItem(apiConfig.TOKEN_KEY)).toBeNull();
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }
  });

  it("keeps the session on transport connection errors", async () => {
    const { getSocket } = await import("./socket");
    const { UNAUTHORIZED_EVENT } = await import("./client");
    localStorage.setItem(apiConfig.TOKEN_KEY, "token");

    const onUnauthorized = vi.fn();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    try {
      getSocket();
      const handler = ioMock.handlers.get("connect_error");
      handler?.(new Error("websocket error"));

      expect(localStorage.getItem(apiConfig.TOKEN_KEY)).toBe("token");
      expect(onUnauthorized).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }
  });
});
