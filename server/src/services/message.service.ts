import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const messageInclude = {
  replyTo: {
    select: {
      id: true,
      senderId: true,
      text: true,
      imageUrl: true,
      deletedAt: true,
    },
  },
  reactions: {
    select: { emoji: true, userId: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.MessageInclude;

type MessageLike = {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: Date;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  clientId?: string | null;
  replyTo?: {
    id: string;
    senderId: string;
    text: string;
    imageUrl: string | null;
    deletedAt: Date | null;
  } | null;
  reactions?: { emoji: string; userId: string }[];
};

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  clientId: string | null;
  replyTo: {
    id: string;
    senderId: string;
    text: string;
    imageUrl: string | null;
    deletedAt: string | null;
  } | null;
  reactions: { emoji: string; userId: string }[];
}

export interface MessageImage {
  url: string;
  mime: string | null;
  size: number | null;
}

export interface CreateMessageOptions {
  replyToId?: string | null;
  clientId?: string | null;
}

export type MessageActionResult =
  { ok: true; message: MessageDto } | { ok: false; status: number; error: string };

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toMessageDto(m: MessageLike): MessageDto {
  const deleted = m.deletedAt != null;

  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    text: deleted ? "" : m.text,
    imageUrl: deleted ? null : m.imageUrl,
    imageMime: deleted ? null : m.imageMime,
    imageSize: deleted ? null : m.imageSize,
    createdAt: m.createdAt.toISOString(),
    editedAt: iso(m.editedAt),
    deletedAt: iso(m.deletedAt),
    clientId: m.clientId ?? null,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          senderId: m.replyTo.senderId,
          text: m.replyTo.deletedAt ? "" : m.replyTo.text,
          imageUrl: m.replyTo.deletedAt ? null : m.replyTo.imageUrl,
          deletedAt: iso(m.replyTo.deletedAt),
        }
      : null,
    reactions: deleted
      ? []
      : (m.reactions ?? []).map((r) => ({ emoji: r.emoji, userId: r.userId })),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function findExistingClientMessage(senderId: string, clientId: string) {
  return prisma.message.findUnique({
    where: { senderId_clientId: { senderId, clientId } },
    include: messageInclude,
  });
}

export async function createMessage(
  chatId: string,
  senderId: string,
  text: string,
  image?: MessageImage | null,
  options: CreateMessageOptions = {},
): Promise<MessageDto> {
  const clientId = options.clientId ?? null;

  if (clientId) {
    const existing = await findExistingClientMessage(senderId, clientId);
    if (existing) return toMessageDto(existing);
  }

  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        text,
        imageUrl: image?.url ?? null,
        imageMime: image?.mime ?? null,
        imageSize: image?.size ?? null,
        clientId,
        replyToId: options.replyToId ?? null,
      },
      include: messageInclude,
    });

    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    return toMessageDto(message);
  } catch (error) {
    if (clientId && isUniqueViolation(error)) {
      const existing = await findExistingClientMessage(senderId, clientId);
      if (existing) return toMessageDto(existing);
    }
    throw error;
  }
}

export async function isValidReplyTarget(chatId: string, replyToId: string): Promise<boolean> {
  const target = await prisma.message.findFirst({
    where: { id: replyToId, chatId },
    select: { id: true },
  });
  return Boolean(target);
}

async function findMessage(chatId: string, messageId: string) {
  return prisma.message.findFirst({
    where: { id: messageId, chatId },
    select: { id: true, senderId: true, deletedAt: true },
  });
}

export async function editMessage(
  chatId: string,
  messageId: string,
  userId: string,
  text: string,
): Promise<MessageActionResult> {
  const message = await findMessage(chatId, messageId);

  if (!message) return { ok: false, status: 404, error: "Message not found" };
  if (message.senderId !== userId) return { ok: false, status: 403, error: "Forbidden" };
  if (message.deletedAt) return { ok: false, status: 400, error: "Message deleted" };

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { text, editedAt: new Date() },
    include: messageInclude,
  });

  return { ok: true, message: toMessageDto(updated) };
}

export async function deleteMessage(
  chatId: string,
  messageId: string,
  userId: string,
): Promise<MessageActionResult> {
  const message = await findMessage(chatId, messageId);

  if (!message) return { ok: false, status: 404, error: "Message not found" };
  if (message.senderId !== userId) return { ok: false, status: 403, error: "Forbidden" };

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
    include: messageInclude,
  });

  return { ok: true, message: toMessageDto(updated) };
}

export async function toggleReaction(
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<MessageActionResult> {
  const message = await findMessage(chatId, messageId);

  if (!message) return { ok: false, status: 404, error: "Message not found" };
  if (message.deletedAt) return { ok: false, status: 400, error: "Message deleted" };

  const where = { messageId_userId_emoji: { messageId, userId, emoji } };
  const existing = await prisma.messageReaction.findUnique({ where });

  if (existing) {
    await prisma.messageReaction.delete({ where });
  } else {
    try {
      await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  const updated = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
    include: messageInclude,
  });

  return { ok: true, message: toMessageDto(updated) };
}
