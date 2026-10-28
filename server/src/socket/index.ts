import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { createMessage } from "../services/message.service.js";
import { isUploadedImageUrl } from "../services/upload.service.js";
import {
  addUserSocket,
  markOffline,
  markOnline,
  removeUserSocket,
  sendPresenceSnapshot,
} from "./presence.js";
import type { ClientToServerEvents, ServerToClientEvents } from "@web-messager/shared";

type SocketData = { userId: string; username: string };

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
    const { userId } = socket.data as SocketData;

    void (async () => {
      socket.join(`user:${userId}`);

      const becameOnline = addUserSocket(userId, socket.id);
      if (becameOnline) {
        await markOnline(io, userId);
      }

      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      if (memberships.length > 0) {
        socket.join(memberships.map((m) => m.chatId));
      }

      await sendPresenceSnapshot(io, socket.id, userId);
    })().catch((error) => {
      console.error("Socket connection setup failed:", error);
    });

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

    socket.on("disconnect", () => {
      void (async () => {
        const becameOffline = removeUserSocket(userId, socket.id);
        if (becameOffline) {
          await markOffline(io, userId);
        }
      })().catch((error) => {
        console.error("disconnect handler failed:", error);
      });
    });
  });
}
