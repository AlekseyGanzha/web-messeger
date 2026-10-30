import { Router } from "express";
import { z } from "zod";
import { authenticate, type AuthRequest } from "../middlewares/auth.js";
import { prisma } from "../db/prisma.js";
import { asyncHandler } from "../utils/http.js";
import { toChatDto, userSelect } from "../services/chat.service.js";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const chats = await prisma.chat.findMany({
      where: {
        members: { some: { userId: req.userId } },
      },
      include: {
        members: { include: { user: { select: userSelect } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json(chats.map((chat) => toChatDto(chat, req.userId!)));
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
        include: {
          members: { include: { user: { select: userSelect } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      if (existing) {
        return res.json(toChatDto(existing, req.userId));
      }
    }

    const chat = await prisma.chat.create({
      data: {
        name,
        isGroup: isGroup ?? memberIds.length > 2,
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: {
        members: { include: { user: { select: userSelect } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    memberIds.forEach((userId) => {
      req.app.get("io")?.to(`user:${userId}`).emit("chat:new", toChatDto(chat, userId));
    });

    return res.status(201).json(toChatDto(chat, req.userId));
  }),
);

export { router as chatsRouter };
