import { Router } from "express";
import { authenticate, type AuthRequest } from "../middlewares/auth.js";
import { prisma } from "../db/prisma.js";
import { createMessage, toMessageDto } from "../services/message.service.js";
import { asyncHandler } from "../utils/http.js";
import { z } from "zod";

const router = Router();

const messageSchema = z.object({
  text: z.string().min(1),
});

router.get(
  "/:chatId/messages",
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const { chatId } = req.params;
    const member = await prisma.chatMember.findFirst({ where: { chatId, userId: req.userId } });
    if (!member) return res.status(403).json({ message: "Not a member" });

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json(messages.reverse().map(toMessageDto));
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

    return res.status(201).json(result);
  }),
);

export { router as messagesRouter };
