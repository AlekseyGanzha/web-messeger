import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  message: { create: vi.fn() },
  chat: { update: vi.fn() },
}));

vi.mock("../db/prisma.js", () => ({ prisma: prismaMock }));

import { createMessage, toMessageDto } from "./message.service.js";

const createdAt = new Date("2026-10-30T12:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toMessageDto", () => {
  it("converts dates and keeps nullable image fields", () => {
    const dto = toMessageDto({
      id: "message-1",
      chatId: "chat-1",
      senderId: "user-1",
      text: "Привет",
      imageUrl: null,
      imageMime: null,
      imageSize: null,
      createdAt,
    });

    expect(dto).toEqual({
      id: "message-1",
      chatId: "chat-1",
      senderId: "user-1",
      text: "Привет",
      imageUrl: null,
      imageMime: null,
      imageSize: null,
      createdAt: "2026-10-30T12:00:00.000Z",
    });
  });
});

describe("createMessage", () => {
  it("creates a message and updates the chat timestamp", async () => {
    prismaMock.message.create.mockResolvedValue({
      id: "message-1",
      chatId: "chat-1",
      senderId: "user-1",
      text: "Привет",
      imageUrl: "/uploads/photo.png",
      imageMime: "image/png",
      imageSize: 1024,
      createdAt,
    });
    prismaMock.chat.update.mockResolvedValue({});

    const result = await createMessage("chat-1", "user-1", "Привет", {
      url: "/uploads/photo.png",
      mime: "image/png",
      size: 1024,
    });

    expect(prismaMock.message.create).toHaveBeenCalledWith({
      data: {
        chatId: "chat-1",
        senderId: "user-1",
        text: "Привет",
        imageUrl: "/uploads/photo.png",
        imageMime: "image/png",
        imageSize: 1024,
      },
    });
    expect(prismaMock.chat.update).toHaveBeenCalledWith({
      where: { id: "chat-1" },
      data: { updatedAt: expect.any(Date) },
    });
    expect(result).toMatchObject({
      id: "message-1",
      imageUrl: "/uploads/photo.png",
      createdAt: "2026-10-30T12:00:00.000Z",
    });
  });
});
