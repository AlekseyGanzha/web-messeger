import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGE_PAGE_MAX, MESSAGE_PAGE_SIZE } from "@web-messager/shared";

const prismaMock = vi.hoisted(() => ({
  message: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  chatMember: {
    findFirst: vi.fn(),
  },
  chat: {
    update: vi.fn(),
  },
}));

vi.mock("../db/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../config/env.js", () => ({ config: { jwtSecret: "test-secret" } }));

import { messagesRouter } from "./messages.js";

function message(id: string, minutes: number) {
  return {
    id,
    chatId: "chat-1",
    senderId: "user-1",
    text: id,
    imageUrl: null,
    imageMime: null,
    imageSize: null,
    createdAt: new Date(`2026-11-01T10:${String(minutes).padStart(2, "0")}:00.000Z`),
  };
}

const oldest = message("m1", 1);
const middle = message("m2", 2);
const newest = message("m3", 3);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/messages", messagesRouter);
  return app;
}

function auth() {
  const token = jwt.sign({ userId: "user-1", username: "alice" }, "test-secret");
  return `Bearer ${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.chatMember.findFirst.mockResolvedValue({ id: "member-1" });
});

describe("GET /api/messages/:chatId/messages", () => {
  it("returns the latest page in chronological order with a next cursor", async () => {
    prismaMock.message.findMany.mockResolvedValue([newest, middle, oldest]);

    const response = await request(createApp())
      .get("/api/messages/chat-1/messages?limit=2")
      .set("Authorization", auth());

    expect(response.status).toBe(200);
    expect(response.body.messages.map((item: { id: string }) => item.id)).toEqual(["m2", "m3"]);
    expect(response.body.nextCursor).toBe("m2");
    expect(prismaMock.message.findMany).toHaveBeenCalledWith({
      where: { chatId: "chat-1" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
    });
  });

  it("loads older messages before the cursor", async () => {
    prismaMock.message.findFirst.mockResolvedValue({
      id: middle.id,
      createdAt: middle.createdAt,
    });
    prismaMock.message.findMany.mockResolvedValue([oldest]);

    const response = await request(createApp())
      .get("/api/messages/chat-1/messages?before=m2")
      .set("Authorization", auth());

    expect(response.status).toBe(200);
    expect(response.body.messages.map((item: { id: string }) => item.id)).toEqual(["m1"]);
    expect(response.body.nextCursor).toBeNull();
    expect(prismaMock.message.findFirst).toHaveBeenCalledWith({
      where: { id: "m2", chatId: "chat-1" },
      select: { id: true, createdAt: true },
    });
    expect(prismaMock.message.findMany).toHaveBeenCalledWith({
      where: {
        chatId: "chat-1",
        OR: [
          { createdAt: { lt: middle.createdAt } },
          { createdAt: middle.createdAt, id: { lt: middle.id } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MESSAGE_PAGE_SIZE + 1,
    });
  });

  it("rejects a cursor that does not belong to the chat", async () => {
    prismaMock.message.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get("/api/messages/chat-1/messages?before=unknown")
      .set("Authorization", auth());

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid cursor" });
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it("clamps the page size to the maximum", async () => {
    prismaMock.message.findMany.mockResolvedValue([]);

    const response = await request(createApp())
      .get("/api/messages/chat-1/messages?limit=9999")
      .set("Authorization", auth());

    expect(response.status).toBe(200);
    expect(prismaMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: MESSAGE_PAGE_MAX + 1 }),
    );
  });

  it("forbids non-members from reading the chat", async () => {
    prismaMock.chatMember.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .get("/api/messages/chat-1/messages")
      .set("Authorization", auth());

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Not a member" });
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });
});
