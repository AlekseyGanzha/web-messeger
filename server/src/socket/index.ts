import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { createMessage } from "../services/message.service.js";
import { isUploadedImageUrl } from "../services/upload.service.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@web-messager/shared";

type SocketData = { userId: string; username: string };

export function setupSocket(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string })?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string; username: string };
      (socket.data as SocketData).userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket.data as SocketData;

    try {
      const userChats = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      userChats.forEach((m) => socket.join(m.chatId));

      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeenAt: null },
      });
    } catch (error) {
      console.error("Socket connection setup failed:", error);
    }

    socket.join(`user:${userId}`);
    socket.broadcast.emit("user:online", { userId });

    socket.on("chat:join", (chatId) => {
      socket.join(chatId);
    });

    socket.on("chat:leave", (chatId) => {
      socket.leave(chatId);
    });

    socket.on("message:send", async (payload) => {
      try {
        const { chatId, text, imageUrl, imageMime, imageSize } = payload;
        if (typeof chatId !== "string" || typeof text !== "string") return;

        const member = await prisma.chatMember.findFirst({ where: { chatId, userId } });
        if (!member) return;

        const trimmed = text.trim();
        const image = isUploadedImageUrl(imageUrl)
          ? { url: imageUrl, mime: imageMime ?? null, size: imageSize ?? null }
          : null;

        if (!trimmed && !image) return;

        const message = await createMessage(chatId, userId, trimmed, image);

        io.to(chatId).emit("message:new", message);
      } catch (error) {
        console.error("message:send failed:", error);
      }
    });

    socket.on("typing:start", (chatId) => {
      socket.to(chatId).emit("typing:update", { chatId, userId, isTyping: true });
    });

    socket.on("typing:stop", (chatId) => {
      socket.to(chatId).emit("typing:update", { chatId, userId, isTyping: false });
    });

    socket.on("disconnect", async () => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeenAt: new Date() },
        });
        socket.broadcast.emit("user:offline", { userId });
      } catch (error) {
        console.error("disconnect handler failed:", error);
      }
    });
  });
}
