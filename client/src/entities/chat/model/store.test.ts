import { beforeEach, describe, expect, it } from "vitest";
import type { Chat, Message } from "@web-messager/shared";
import { useChatStore } from "./store";

function chat(id: string, updatedAt: string): Chat {
  return {
    id,
    name: id,
    isGroup: false,
    updatedAt,
    members: [],
  };
}

function message(id: string, chatId: string, createdAt: string): Message {
  return {
    id,
    chatId,
    senderId: "user-1",
    text: id,
    imageUrl: null,
    imageMime: null,
    imageSize: null,
    createdAt,
  };
}

beforeEach(() => {
  useChatStore.setState({ chats: [], activeChatId: null });
});

describe("useChatStore", () => {
  it("adds new chats first and updates existing chats in place", () => {
    const store = useChatStore.getState();

    store.addChat(chat("chat-1", "2026-10-30T10:00:00.000Z"));
    store.addChat(chat("chat-2", "2026-10-30T11:00:00.000Z"));
    store.addChat({ ...chat("chat-1", "2026-10-30T10:00:00.000Z"), name: "Updated" });

    const chats = useChatStore.getState().chats;

    expect(chats.map((item) => item.id)).toEqual(["chat-2", "chat-1"]);
    expect(chats.find((item) => item.id === "chat-1")?.name).toBe("Updated");
  });

  it("updates last message and moves the touched chat to the top", () => {
    const store = useChatStore.getState();
    store.setChats([
      chat("chat-1", "2026-10-30T10:00:00.000Z"),
      chat("chat-2", "2026-10-30T11:00:00.000Z"),
    ]);

    store.touchChat(message("m1", "chat-1", "2026-10-30T12:00:00.000Z"));

    const chats = useChatStore.getState().chats;

    expect(chats.map((item) => item.id)).toEqual(["chat-1", "chat-2"]);
    expect(chats[0]?.updatedAt).toBe("2026-10-30T12:00:00.000Z");
    expect(chats[0]?.lastMessage).toMatchObject({
      id: "m1",
      chatId: "chat-1",
      text: "m1",
    });
  });

  it("stores the active chat id", () => {
    useChatStore.getState().setActiveChat("chat-1");

    expect(useChatStore.getState().activeChatId).toBe("chat-1");
  });
});
