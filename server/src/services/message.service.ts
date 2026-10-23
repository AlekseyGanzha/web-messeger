import { prisma } from "../db/prisma.js";

export interface MessageDto {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: string;
}

export interface MessageImage {
  url: string;
  mime: string | null;
  size: number | null;
}

export function toMessageDto(m: {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl: string | null;
  imageMime: string | null;
  imageSize: number | null;
  createdAt: Date;
}): MessageDto {
  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    text: m.text,
    imageUrl: m.imageUrl,
    imageMime: m.imageMime,
    imageSize: m.imageSize,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function createMessage(
  chatId: string,
  senderId: string,
  text: string,
  image?: MessageImage | null,
): Promise<MessageDto> {
  const message = await prisma.message.create({
    data: {
      chatId,
      senderId,
      text,
      imageUrl: image?.url ?? null,
      imageMime: image?.mime ?? null,
      imageSize: image?.size ?? null,
    },
  });

  await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

  return toMessageDto(message);
}
