import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  message: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  messageReaction: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  chat: { update: vi.fn() },
}));

vi.mock("../db/prisma.js", () => ({ prisma: prismaMock }));

import {
  createMessage,
  deleteMessage,
  editMessage,
  messageInclude,
  toMessageDto,
  toggleReaction,
} from "./message.service.js";

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
      editedAt: null,
      deletedAt: null,
      clientId: null,
      replyTo: null,
      reactions: [],
    });
  });

  it("masks the content of a deleted message", () => {
    const dto = toMessageDto({
      id: "message-1",
      chatId: "chat-1",
      senderId: "user-1",
      text: "Секрет",
      imageUrl: "/uploads/photo.png",
      imageMime: "image/png",
      imageSize: 1024,
      createdAt,
      deletedAt: createdAt,
      reactions: [{ emoji: "👍", userId: "user-2" }],
    });

    expect(dto.text).toBe("");
    expect(dto.imageUrl).toBeNull();
    expect(dto.reactions).toEqual([]);
    expect(dto.deletedAt).toBe("2026-10-30T12:00:00.000Z");
  });
});

describe("message mutations", () => {
  it("forbids editing someone else's message", async () => {
    prismaMock.message.findFirst.mockResolvedValue({
      id: "message-1",
      senderId: "user-2",
      deletedAt: null,
    });

    const result = await editMessage("chat-1", "message-1", "user-1", "Новый текст");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
    expect(prismaMock.message.update).not.toHaveBeenCalled();
  });

  it("soft-deletes a message and masks its content", async () => {
    prismaMock.message.findFirst.mockResolvedValue({
      id: "message-1",
      senderId: "user-1",
      deletedAt: null,
    });
    prismaMock.message.update.mockResolvedValue({
      id: "message-1",
      chatId: "chat-1",
      senderId: "user-1",
      text: "Текст",
      imageUrl: null,
      imageMime: null,
      imageSize: null,
      createdAt,
      deletedAt: createdAt,
    });

    const result = await deleteMessage("chat-1", "message-1", "user-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.text).toBe("");
      expect(result.message.deletedAt).toBe("2026-10-30T12:00:00.000Z");
    }
    expect(prismaMock.message.update).toHaveBeenCalledWith({
      where: { id: "message-1" },
      data: { deletedAt: expect.any(Date) },
      include: messageInclude,
    });
  });

  it("toggles a reaction off when it already exists", async () => {
    prismaMock.message.findFirst.mockResolvedValue({
      id: "message-1",
      senderId: "user-2",
      deletedAt: null,
    });
    prismaMock.messageReaction.findUnique.mockResolvedValue({ id: "reaction-1" });
    prismaMock.messageReaction.delete.mockResolvedValue({});
    prismaMock.message.findUniqueOrThrow.mockResolvedValue({
      id: "message-1",
      chatId: "chat-1",
      senderId: "user-2",
      text: "Текст",
      imageUrl: null,
      imageMime: null,
      imageSize: null,
      createdAt,
      reactions: [],
    });

    const result = await toggleReaction("chat-1", "message-1", "user-1", "👍");

    expect(result.ok).toBe(true);
    expect(prismaMock.messageReaction.delete).toHaveBeenCalledWith({
      where: { messageId_userId_emoji: { messageId: "message-1", userId: "user-1", emoji: "👍" } },
    });
    expect(prismaMock.messageReaction.create).not.toHaveBeenCalled();
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
        clientId: null,
        replyToId: null,
      },
      include: messageInclude,
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
