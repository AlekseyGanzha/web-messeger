import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { Server } from "socket.io";
import type {
  ChatRemovedReason,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@web-messager/shared";
import { authenticate, type AuthRequest } from "../middlewares/auth.js";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/http.js";
import { toChatDto, userSelect } from "../services/chat.service.js";

const router = Router();

const chatInclude = {
  members: { include: { user: { select: userSelect } } },
  messages: { orderBy: { createdAt: "desc" }, take: 1 },
} satisfies Prisma.ChatInclude;

type ChatDtoSource = Parameters<typeof toChatDto>[0];
type AppIo = Server<ClientToServerEvents, ServerToClientEvents>;

function getIo(req: AuthRequest): AppIo | undefined {
  return req.app.get("io") as AppIo | undefined;
}

function isOwner(chat: { members: { userId: string; role: string }[] }, userId: string) {
  return chat.members.some((member) => member.userId === userId && member.role === "OWNER");
}

function emitChatUpdated(io: AppIo | undefined, chat: ChatDtoSource) {
  if (!io) return;

  for (const { userId } of chat.members) {
    io.to(`user:${userId}`).emit("chat:updated", toChatDto(chat, userId));
  }
}

async function countUnread(chatId: string, userId: string, lastReadAt: Date | null | undefined) {
  return prisma.message.count({
    where: {
      chatId,
      senderId: { not: userId },
      deletedAt: null,
      ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
    },
  });
}

function emitChatRemoved(
  io: AppIo | undefined,
  userId: string,
  chatId: string,
  reason: ChatRemovedReason,
) {
  io?.to(`user:${userId}`).emit("chat:removed", { chatId, reason });
}

async function detachUserFromChat(io: AppIo | undefined, userId: string, chatId: string) {
  if (!io) return;

  const sockets = await io.in(`user:${userId}`).fetchSockets();

  for (const socket of sockets) {
    socket.leave(chatId);
    const data = socket.data as { chatIds?: Set<string> };
    data.chatIds?.delete(chatId);
  }
}

function findGroupForMember(chatId: string, userId: string) {
  return prisma.chat.findFirst({
    where: { id: chatId, isGroup: true, members: { some: { userId } } },
    include: chatInclude,
  });
}

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const chats = await prisma.chat.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: chatInclude,
      orderBy: { updatedAt: "desc" },
    });

    const userId = req.userId;

    const result = await Promise.all(
      chats.map(async (chat) => {
        const membership = chat.members.find((member) => member.userId === userId);
        const unreadCount = await countUnread(chat.id, userId, membership?.lastReadAt);
        return toChatDto(chat, userId, unreadCount);
      }),
    );

    return res.json(result);
  }),
);

const createChatSchema = z.object({
  usernames: z.array(z.string().trim().min(1)).min(1).max(50),
  name: z.string().trim().min(1).max(64).optional(),
  isGroup: z.boolean().optional(),
});

router.post(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const parse = createChatSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: "Invalid payload" });

    const { usernames: rawUsernames, name, isGroup } = parse.data;
    const usernames = Array.from(new Set(rawUsernames));

    if (isGroup) {
      if (!name || name.length < 2) {
        return res
          .status(400)
          .json({ message: "Название группы должно содержать минимум 2 символа" });
      }

      if (usernames.length < 1) {
        return res.status(400).json({ message: "Пригласите хотя бы одного участника" });
      }
    }

    const users = await prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true, username: true },
    });

    const found = new Set(users.map((u) => u.username));
    if (found.size !== usernames.length) {
      return res.status(404).json({ message: "Some users not found" });
    }

    const otherUsers = users.filter((user) => user.id !== req.userId);

    if (otherUsers.length !== usernames.length) {
      return res.status(400).json({ message: "Нельзя добавить себя в чат" });
    }

    if (isGroup && otherUsers.length < 1) {
      return res.status(400).json({ message: "Пригласите хотя бы одного участника" });
    }

    if (isGroup === false && otherUsers.length !== 1) {
      return res.status(400).json({ message: "Для личного чата нужен один собеседник" });
    }

    const memberIds = Array.from(new Set([req.userId, ...otherUsers.map((u) => u.id)]));

    if (!isGroup && memberIds.length === 2) {
      const existing = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: memberIds.map((userId) => ({ members: { some: { userId } } })),
        },
        include: chatInclude,
      });

      if (existing) {
        return res.json(toChatDto(existing, req.userId));
      }
    }

    const chat = await prisma.chat.create({
      data: {
        name,
        isGroup: isGroup ?? memberIds.length > 2,
        members: {
          create: memberIds.map((userId) => ({
            userId,
            role: userId === req.userId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: chatInclude,
    });

    memberIds.forEach((userId) => {
      req.app.get("io")?.to(`user:${userId}`).emit("chat:new", toChatDto(chat, userId));
    });

    return res.status(201).json(toChatDto(chat, req.userId));
  }),
);

const addMembersSchema = z.object({
  usernames: z.array(z.string().trim().min(1).max(32)).min(1).max(50),
});

router.post(
  "/:chatId/members",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const parse = addMembersSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: "Invalid payload" });

    const chatId = req.params.chatId;
    const chat = await findGroupForMember(chatId, req.userId);

    if (!chat) return res.status(404).json({ message: "Группа не найдена" });
    if (!isOwner(chat, req.userId)) {
      return res.status(403).json({ message: "Только владелец может добавлять участников" });
    }

    const usernames = Array.from(new Set(parse.data.usernames.map((name) => name.trim())));
    const users = await prisma.user.findMany({
      where: { username: { in: usernames } },
      select: { id: true, username: true },
    });

    if (users.length !== usernames.length) {
      return res.status(404).json({ message: "Некоторые пользователи не найдены" });
    }

    const existingIds = new Set(chat.members.map((member) => member.userId));
    const newMembers = users.filter((user) => !existingIds.has(user.id));

    if (newMembers.length === 0) {
      return res.status(409).json({ message: "Все участники уже в группе" });
    }

    await prisma.$transaction([
      prisma.chatMember.createMany({
        data: newMembers.map((user) => ({ chatId, userId: user.id, role: "MEMBER" })),
        skipDuplicates: true,
      }),
      prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
    ]);

    const updated = await prisma.chat.findUniqueOrThrow({
      where: { id: chatId },
      include: chatInclude,
    });

    emitChatUpdated(getIo(req), updated);

    return res.json(toChatDto(updated, req.userId));
  }),
);

router.delete(
  "/:chatId/members/:userId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { chatId, userId } = req.params;
    const chat = await findGroupForMember(chatId, req.userId);

    if (!chat) return res.status(404).json({ message: "Группа не найдена" });
    if (!isOwner(chat, req.userId)) {
      return res.status(403).json({ message: "Только владелец может удалять участников" });
    }

    const target = chat.members.find((member) => member.userId === userId);
    if (!target) return res.status(404).json({ message: "Участник не найден" });
    if (target.userId === req.userId) {
      return res.status(400).json({ message: "Используйте выход из группы" });
    }
    if (target.role === "OWNER") {
      return res.status(403).json({ message: "Нельзя удалить владельца группы" });
    }

    await prisma.$transaction([
      prisma.chatMember.delete({ where: { chatId_userId: { chatId, userId } } }),
      prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } }),
    ]);

    const updated = await prisma.chat.findUniqueOrThrow({
      where: { id: chatId },
      include: chatInclude,
    });

    const io = getIo(req);
    await detachUserFromChat(io, userId, chatId);
    emitChatUpdated(io, updated);
    emitChatRemoved(io, userId, chatId, "removed");

    return res.json(toChatDto(updated, req.userId));
  }),
);

router.post(
  "/:chatId/leave",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const chatId = req.params.chatId;
    const userId = req.userId;
    const chat = await findGroupForMember(chatId, userId);

    if (!chat) return res.status(404).json({ message: "Группа не найдена" });

    const me = chat.members.find((member) => member.userId === userId);
    const remaining = chat.members.filter((member) => member.userId !== userId);
    const io = getIo(req);

    if (remaining.length === 0) {
      await prisma.chat.delete({ where: { id: chatId } });
      await detachUserFromChat(io, userId, chatId);
      emitChatRemoved(io, userId, chatId, "deleted");

      return res.json({ success: true, deleted: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.chatMember.delete({ where: { chatId_userId: { chatId, userId } } });

      if (me?.role === "OWNER") {
        const nextOwner = [...remaining].sort(
          (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
        )[0];

        await tx.chatMember.update({
          where: { chatId_userId: { chatId, userId: nextOwner.userId } },
          data: { role: "OWNER" },
        });
      }

      await tx.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    });

    const updated = await prisma.chat.findUniqueOrThrow({
      where: { id: chatId },
      include: chatInclude,
    });

    await detachUserFromChat(io, userId, chatId);
    emitChatUpdated(io, updated);
    emitChatRemoved(io, userId, chatId, "left");

    return res.json({ success: true });
  }),
);

router.delete(
  "/:chatId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const chatId = req.params.chatId;
    const chat = await findGroupForMember(chatId, req.userId);

    if (!chat) return res.status(404).json({ message: "Группа не найдена" });
    if (!isOwner(chat, req.userId)) {
      return res.status(403).json({ message: "Только владелец может удалить группу" });
    }

    const memberIds = chat.members.map((member) => member.userId);
    const io = getIo(req);

    await prisma.chat.delete({ where: { id: chatId } });
    await Promise.all(memberIds.map((userId) => detachUserFromChat(io, userId, chatId)));
    memberIds.forEach((userId) => emitChatRemoved(io, userId, chatId, "deleted"));

    return res.json({ success: true });
  }),
);

export { router as chatsRouter };
