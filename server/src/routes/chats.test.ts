import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => {
  const chat = {
    findFirst: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const chatMember = {
    createMany: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  };
  const user = {
    findMany: vi.fn(),
  };

  const mock = {
    chat,
    chatMember,
    user,
    $transaction: vi.fn(),
  };

  mock.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: typeof mock) => Promise<unknown>)(mock);
    }

    return Promise.all(arg as Promise<unknown>[]);
  });

  return mock;
});

vi.mock("../db/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../config/env.js", () => ({ config: { jwtSecret: "test-secret" } }));

import { chatsRouter } from "./chats.js";

const owner = {
  id: "owner-1",
  username: "owner",
  displayName: "Владелец",
  avatarUrl: null,
  isOnline: false,
  lastSeenAt: null,
};

const member = {
  id: "member-1",
  username: "member",
  displayName: "Участник",
  avatarUrl: null,
  isOnline: false,
  lastSeenAt: null,
};

const newcomer = {
  id: "user-3",
  username: "carol",
  displayName: "Кэрол",
  avatarUrl: null,
  isOnline: false,
  lastSeenAt: null,
};

function groupChat(members = [owner, member]) {
  return {
    id: "chat-1",
    name: "Команда",
    isGroup: true,
    updatedAt: new Date("2026-11-01T10:00:00.000Z"),
    members: members.map((user, index) => ({
      userId: user.id,
      role: index === 0 ? "OWNER" : "MEMBER",
      joinedAt: new Date(`2026-11-01T09:0${index}:00.000Z`),
      user,
    })),
    messages: [],
  };
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/chats", chatsRouter);
  return app;
}

function auth(userId: string) {
  const token = jwt.sign({ userId, username: userId }, "test-secret");
  return `Bearer ${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("group member management", () => {
  it("forbids a non-owner from adding members", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(groupChat());

    const response = await request(createApp())
      .post("/api/chats/chat-1/members")
      .set("Authorization", auth(member.id))
      .send({ usernames: ["carol"] });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Только владелец может добавлять участников" });
    expect(prismaMock.chatMember.createMany).not.toHaveBeenCalled();
  });

  it("adds new members as MEMBER when the owner requests it", async () => {
    const updated = groupChat([owner, member, newcomer]);

    prismaMock.chat.findFirst.mockResolvedValue(groupChat());
    prismaMock.user.findMany.mockResolvedValue([{ id: newcomer.id, username: newcomer.username }]);
    prismaMock.chatMember.createMany.mockResolvedValue({ count: 1 });
    prismaMock.chat.update.mockResolvedValue({});
    prismaMock.chat.findUniqueOrThrow.mockResolvedValue(updated);

    const response = await request(createApp())
      .post("/api/chats/chat-1/members")
      .set("Authorization", auth(owner.id))
      .send({ usernames: ["carol"] });

    expect(response.status).toBe(200);
    expect(prismaMock.chatMember.createMany).toHaveBeenCalledWith({
      data: [{ chatId: "chat-1", userId: newcomer.id, role: "MEMBER" }],
      skipDuplicates: true,
    });
    expect(response.body.members).toHaveLength(3);
    expect(response.body.ownerId).toBe(owner.id);
  });

  it("returns 404 when a requested username does not exist", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(groupChat());
    prismaMock.user.findMany.mockResolvedValue([]);

    const response = await request(createApp())
      .post("/api/chats/chat-1/members")
      .set("Authorization", auth(owner.id))
      .send({ usernames: ["missing"] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Некоторые пользователи не найдены" });
  });

  it("forbids the owner from removing themselves", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(groupChat());

    const response = await request(createApp())
      .delete(`/api/chats/chat-1/members/${owner.id}`)
      .set("Authorization", auth(owner.id));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Используйте выход из группы" });
    expect(prismaMock.chatMember.delete).not.toHaveBeenCalled();
  });

  it("allows the owner to remove another member", async () => {
    const updated = groupChat([owner]);

    prismaMock.chat.findFirst.mockResolvedValue(groupChat());
    prismaMock.chatMember.delete.mockResolvedValue({});
    prismaMock.chat.update.mockResolvedValue({});
    prismaMock.chat.findUniqueOrThrow.mockResolvedValue(updated);

    const response = await request(createApp())
      .delete(`/api/chats/chat-1/members/${member.id}`)
      .set("Authorization", auth(owner.id));

    expect(response.status).toBe(200);
    expect(prismaMock.chatMember.delete).toHaveBeenCalledWith({
      where: { chatId_userId: { chatId: "chat-1", userId: member.id } },
    });
    expect(response.body.members).toHaveLength(1);
  });
});

describe("leaving and deleting groups", () => {
  it("transfers ownership to the earliest remaining member when the owner leaves", async () => {
    const updated = groupChat([member]);

    prismaMock.chat.findFirst.mockResolvedValue(groupChat());
    prismaMock.chatMember.delete.mockResolvedValue({});
    prismaMock.chatMember.update.mockResolvedValue({});
    prismaMock.chat.update.mockResolvedValue({});
    prismaMock.chat.findUniqueOrThrow.mockResolvedValue(updated);

    const response = await request(createApp())
      .post("/api/chats/chat-1/leave")
      .set("Authorization", auth(owner.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(prismaMock.chatMember.update).toHaveBeenCalledWith({
      where: { chatId_userId: { chatId: "chat-1", userId: member.id } },
      data: { role: "OWNER" },
    });
  });

  it("deletes the group when the last member leaves", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(groupChat([owner]));
    prismaMock.chat.delete.mockResolvedValue({});

    const response = await request(createApp())
      .post("/api/chats/chat-1/leave")
      .set("Authorization", auth(owner.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, deleted: true });
    expect(prismaMock.chat.delete).toHaveBeenCalledWith({ where: { id: "chat-1" } });
  });

  it("forbids a regular member from deleting the group", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(groupChat());

    const response = await request(createApp())
      .delete("/api/chats/chat-1")
      .set("Authorization", auth(member.id));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Только владелец может удалить группу" });
    expect(prismaMock.chat.delete).not.toHaveBeenCalled();
  });

  it("allows the owner to delete the group", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(groupChat());
    prismaMock.chat.delete.mockResolvedValue({});

    const response = await request(createApp())
      .delete("/api/chats/chat-1")
      .set("Authorization", auth(owner.id));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(prismaMock.chat.delete).toHaveBeenCalledWith({ where: { id: "chat-1" } });
  });

  it("returns 404 for a non-member", async () => {
    prismaMock.chat.findFirst.mockResolvedValue(null);

    const response = await request(createApp())
      .post("/api/chats/chat-1/leave")
      .set("Authorization", auth("stranger"));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Группа не найдена" });
  });
});
