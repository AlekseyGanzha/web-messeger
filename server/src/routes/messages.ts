import { Router } from "express";
import { authenticate, type AuthRequest } from "../middlewares/auth.js";
import { prisma } from "../db/prisma.js";
import type { Server } from "socket.io";
import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_PAGE_MAX,
  MESSAGE_PAGE_SIZE,
  type ClientToServerEvents,
  type MessagesPage,
  type ServerToClientEvents,
} from "@web-messager/shared";
import { createMessage, toMessageDto } from "../services/message.service.js";
import { asyncHandler } from "../utils/http.js";
import { z } from "zod";

const router = Router();

const messageSchema = z.object({
  text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});

router.get(
  "/:chatId/messages",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { chatId } = req.params;
    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const before = typeof req.query.before === "string" ? req.query.before : null;
    const requestedLimit = Number(req.query.limit);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MESSAGE_PAGE_MAX)
        : MESSAGE_PAGE_SIZE;

    const cursor = before
      ? await prisma.message.findFirst({
          where: { id: before, chatId },
          select: { id: true, createdAt: true },
        })
      : null;

    if (before && !cursor) {
      return res.status(400).json({ message: "Invalid cursor" });
    }

    const rows = await prisma.message.findMany({
      where: {
        chatId,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    const body: MessagesPage = {
      messages: page.reverse().map(toMessageDto),
      nextCursor,
    };

    return res.json(body);
  }),
);

router.post(
  "/:chatId/messages",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const parse = messageSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: "Invalid payload" });

    const { chatId } = req.params;
    const { text } = parse.data;

    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const result = await createMessage(chatId, req.userId, text);

    const io = req.app.get("io") as Server<ClientToServerEvents, ServerToClientEvents> | undefined;
    io?.to(chatId).emit("message:new", result);

    return res.status(201).json(result);
  }),
);

export { router as messagesRouter };
