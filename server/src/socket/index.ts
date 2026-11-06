import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { createMessage, isValidReplyTarget } from "../services/message.service.js";
import { isUploadedImageUrl } from "../services/upload.service.js";
import {
  addUserSocket,
  markOffline,
  markOnline,
  removeUserSocket,
  sendPresenceSnapshot,
} from "./presence.js";
import {
  MESSAGE_MAX_LENGTH,
  type ClientToServerEvents,
  type MessageSendResult,
  type ServerToClientEvents,
} from "@web-messager/shared";

type SocketData = { userId: string; username: string; chatIds: Set<string> };

export function setupSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string })?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as SocketData;
      (socket.data as SocketData).userId = payload.userId;
      (socket.data as SocketData).username = payload.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const data = socket.data as SocketData;
    data.chatIds = new Set();

    void (async () => {
      socket.join(`user:${data.userId}`);

      const becameOnline = addUserSocket(data.userId, socket.id);
      if (becameOnline) {
        await markOnline(io, data.userId);
      }

      const memberships = await prisma.chatMember.findMany({
        where: { userId: data.userId },
        select: { chatId: true },
      });

      for (const { chatId } of memberships) {
        data.chatIds.add(chatId);
        socket.join(chatId);
      }

      if (memberships.length > 0) {
        socket.join(memberships.map((m) => m.chatId));
      }

      await sendPresenceSnapshot(io, socket.id, data.userId);
    })().catch((error) => {
      console.error("Socket connection setup failed:", error);
    });

    socket.on("chat:join", async (chatId) => {
      if (typeof chatId !== "string") return;

      if (data.chatIds.has(chatId)) {
        socket.join(chatId);
        return;
      }

      try {
        const member = await prisma.chatMember.findUnique({
          where: { chatId_userId: { chatId, userId: data.userId } },
          select: { id: true },
        });

        if (!member) return;

        data.chatIds.add(chatId);
        socket.join(chatId);
      } catch (error) {
        console.error("chat:join failed:", error);
      }
    });

    socket.on("chat:leave", (chatId) => {
      data.chatIds.delete(chatId);
      socket.leave(chatId);
    });

    socket.on("message:send", async (payload, ack) => {
      const respond = (result: MessageSendResult) => ack?.(result);

      try {
        const { chatId, text, imageUrl, imageMime, imageSize, replyToId, clientId } = payload;
        if (typeof chatId !== "string" || typeof text !== "string") {
          respond({ ok: false, error: "Invalid payload" });
          return;
        }

        const member = await prisma.chatMember.findFirst({
          where: { chatId, userId: data.userId },
        });
        if (!member) {
          respond({ ok: false, error: "Not a member" });
          return;
        }

        const trimmed = text.trim();

        if (trimmed.length > MESSAGE_MAX_LENGTH) {
          respond({ ok: false, error: "Message too long" });
          return;
        }

        const image = isUploadedImageUrl(imageUrl)
          ? { url: imageUrl, mime: imageMime ?? null, size: imageSize ?? null }
          : null;

        if (!trimmed && !image) {
          respond({ ok: false, error: "Empty message" });
          return;
        }

        const replyTarget =
          typeof replyToId === "string" && (await isValidReplyTarget(chatId, replyToId))
            ? replyToId
            : null;

        if (replyToId && !replyTarget) {
          respond({ ok: false, error: "Invalid reply target" });
          return;
        }

        const safeClientId =
          typeof clientId === "string" && clientId.length > 0 && clientId.length <= 64
            ? clientId
            : null;

        const message = await createMessage(chatId, data.userId, trimmed, image, {
          replyToId: replyTarget,
          clientId: safeClientId,
        });

        io.to(chatId).emit("message:new", message);
        respond({ ok: true, message });
      } catch (error) {
        console.error("message:send failed:", error);
        respond({ ok: false, error: "Failed to send message" });
      }
    });

    socket.on("chat:read", async (chatId) => {
      if (typeof chatId !== "string") return;

      try {
        const member = await prisma.chatMember.findUnique({
          where: { chatId_userId: { chatId, userId: data.userId } },
          select: { id: true },
        });

        if (!member) return;

        const lastReadAt = new Date();

        await prisma.chatMember.update({
          where: { chatId_userId: { chatId, userId: data.userId } },
          data: { lastReadAt },
        });

        io.to(chatId).emit("chat:read", {
          chatId,
          userId: data.userId,
          lastReadAt: lastReadAt.toISOString(),
        });
      } catch (error) {
        console.error("chat:read failed:", error);
      }
    });

    socket.on("typing:start", (chatId) => {
      if (!data.chatIds.has(chatId)) return;
      socket.to(chatId).emit("typing:update", { chatId, userId: data.userId, isTyping: true });
    });

    socket.on("typing:stop", (chatId) => {
      if (!data.chatIds.has(chatId)) return;
      socket.to(chatId).emit("typing:update", { chatId, userId: data.userId, isTyping: false });
    });

    socket.on("disconnect", () => {
      void (async () => {
        const becameOffline = removeUserSocket(data.userId, socket.id);

        if (becameOffline) {
          for (const chatId of data.chatIds) {
            io.to(chatId).emit("typing:update", {
              chatId,
              userId: data.userId,
              isTyping: false,
            });
          }

          await markOffline(io, data.userId);
        }
      })().catch((error) => {
        console.error("disconnect handler failed:", error);
      });
    });
  });
}
