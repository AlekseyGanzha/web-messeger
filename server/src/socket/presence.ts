import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@web-messager/shared";
import { prisma } from "../db/prisma.js";

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

const userSockets = new Map<string, Set<string>>();

export function addUserSocket(userId: string, socketId: string): boolean {
  let sockets = userSockets.get(userId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(userId, sockets);
  }
  sockets.add(socketId);
  return sockets.size === 1;
}

export function removeUserSocket(userId: string, socketId: string): boolean {
  const sockets = userSockets.get(userId);
  if (!sockets) return false;

  sockets.delete(socketId);
  if (sockets.size > 0) return false;

  userSockets.delete(userId);
  return true;
}

export function isUserOnline(userId: string): boolean {
  return (userSockets.get(userId)?.size ?? 0) > 0;
}

async function getContactIds(userId: string): Promise<string[]> {
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: { chatId: true },
  });
  const chatIds = memberships.map((m) => m.chatId);
  if (chatIds.length === 0) return [];

  const contacts = await prisma.chatMember.findMany({
    where: { chatId: { in: chatIds }, userId: { not: userId } },
    select: { userId: true },
    distinct: ["userId"],
  });

  return contacts.map((c) => c.userId);
}

async function emitPresence(
  io: AppServer,
  userId: string,
  isOnline: boolean,
  lastSeenAt: Date | null,
) {
  const payload = {
    userId,
    isOnline,
    lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
  };

  const targets = new Set(await getContactIds(userId));
  targets.add(userId);

  targets.forEach((id) => io.to(`user:${id}`).emit("presence:update", payload));
}

export async function markOnline(io: AppServer, userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: true, lastSeenAt: null },
  });
  await emitPresence(io, userId, true, null);
}

export async function markOffline(io: AppServer, userId: string) {
  const lastSeenAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeenAt },
  });
  await emitPresence(io, userId, false, lastSeenAt);
}

export async function sendPresenceSnapshot(io: AppServer, socketId: string, userId: string) {
  const contacts = await getContactIds(userId);
  if (contacts.length === 0) return;

  const users = await prisma.user.findMany({
    where: { id: { in: contacts } },
    select: { id: true, lastSeenAt: true },
  });

  io.to(socketId).emit(
    "presence:snapshot",
    users.map((u) => ({
      userId: u.id,
      isOnline: isUserOnline(u.id),
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
    })),
  );
}

export async function markAllOffline() {
  await prisma.user.updateMany({
    where: { isOnline: true },
    data: { isOnline: false, lastSeenAt: new Date() },
  });
}
