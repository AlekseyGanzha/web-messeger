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
import {
  createMessage,
  deleteMessage,
  editMessage,
  isValidReplyTarget,
  messageInclude,
  toMessageDto,
  toggleReaction,
} from "../services/message.service.js";
import { asyncHandler } from "../utils/http.js";
import { z } from "zod";

const router = Router();

type AppIo = Server<ClientToServerEvents, ServerToClientEvents>;

function getIo(req: AuthRequest): AppIo | undefined {
  return req.app.get("io") as AppIo | undefined;
}

const messageSchema = z.object({
  text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
  replyToId: z.string().uuid().nullable().optional(),
  clientId: z.string().trim().max(64).nullable().optional(),
});

const editSchema = z.object({
  text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});

const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

async function buildPage(
  chatId: string,
  limit: number,
  before: string | null,
  after: string | null,
) {
  if (after) {
    const anchor = await prisma.message.findFirst({
      where: { id: after, chatId },
      select: { id: true, createdAt: true },
    });

    if (!anchor) return null;

    const rows = await prisma.message.findMany({
      where: {
        chatId,
        OR: [
          { createdAt: { gt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { gt: anchor.id } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
      include: messageInclude,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      messages: page.map(toMessageDto),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    } satisfies MessagesPage;
  }

  const cursor = before
    ? await prisma.message.findFirst({
        where: { id: before, chatId },
        select: { id: true, createdAt: true },
      })
    : null;

  if (before && !cursor) return null;

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
    include: messageInclude,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return {
    messages: page.reverse().map(toMessageDto),
    nextCursor,
  } satisfies MessagesPage;
}

router.get(
  "/:chatId/messages",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { chatId } = req.params;
    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const before = typeof req.query.before === "string" ? req.query.before : null;
    const after = typeof req.query.after === "string" ? req.query.after : null;
    const requestedLimit = Number(req.query.limit);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MESSAGE_PAGE_MAX)
        : MESSAGE_PAGE_SIZE;

    const page = await buildPage(chatId, limit, before, after);

    if (!page) {
      return res.status(400).json({ message: "Invalid cursor" });
    }

    return res.json(page);
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
    const { text, replyToId, clientId } = parse.data;

    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    if (replyToId && !(await isValidReplyTarget(chatId, replyToId))) {
      return res.status(400).json({ message: "Invalid reply target" });
    }

    const result = await createMessage(chatId, req.userId, text, null, { replyToId, clientId });

    getIo(req)?.to(chatId).emit("message:new", result);

    return res.status(201).json(result);
  }),
);

router.patch(
  "/:chatId/messages/:messageId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const parse = editSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: "Invalid payload" });

    const { chatId, messageId } = req.params;
    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const result = await editMessage(chatId, messageId, req.userId, parse.data.text);
    if (!result.ok) return res.status(result.status).json({ message: result.error });

    getIo(req)?.to(chatId).emit("message:updated", result.message);

    return res.json(result.message);
  }),
);

router.delete(
  "/:chatId/messages/:messageId",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { chatId, messageId } = req.params;
    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const result = await deleteMessage(chatId, messageId, req.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.error });

    getIo(req)?.to(chatId).emit("message:updated", result.message);

    return res.json(result.message);
  }),
);

router.post(
  "/:chatId/messages/:messageId/reactions",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const parse = reactionSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ message: "Invalid payload" });

    const { chatId, messageId } = req.params;
    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const result = await toggleReaction(chatId, messageId, req.userId, parse.data.emoji);
    if (!result.ok) return res.status(result.status).json({ message: result.error });

    getIo(req)?.to(chatId).emit("message:updated", result.message);

    return res.json(result.message);
  }),
);

export { router as messagesRouter };
