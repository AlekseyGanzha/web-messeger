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

  it("increments unread counts and clears them when read", () => {
    useChatStore.getState().setChats([chat("chat-1", "2026-10-30T10:00:00.000Z")]);

    useChatStore.getState().incrementUnread("chat-1");
    useChatStore.getState().incrementUnread("chat-1");

    expect(useChatStore.getState().chats[0]?.unreadCount).toBe(2);

    useChatStore.getState().markRead("chat-1");

    expect(useChatStore.getState().chats[0]?.unreadCount).toBe(0);
  });

  it("keeps the unread count when a chat update omits it", () => {
    useChatStore
      .getState()
      .setChats([{ ...chat("chat-1", "2026-10-30T10:00:00.000Z"), unreadCount: 4 }]);

    useChatStore
      .getState()
      .addChat({ ...chat("chat-1", "2026-10-30T10:00:00.000Z"), name: "Renamed" });

    expect(useChatStore.getState().chats[0]?.name).toBe("Renamed");
    expect(useChatStore.getState().chats[0]?.unreadCount).toBe(4);
  });

  it("updates a member read cursor", () => {
    const member = {
      id: "user-1",
      username: "user-1",
      displayName: "User",
      avatarUrl: null,
      isOnline: true,
      lastSeenAt: null,
      lastReadAt: null,
    };

    useChatStore
      .getState()
      .setChats([{ ...chat("chat-1", "2026-10-30T10:00:00.000Z"), members: [member] }]);

    useChatStore.getState().applyRead("chat-1", "user-1", "2026-10-30T12:00:00.000Z");

    expect(useChatStore.getState().chats[0]?.members[0]?.lastReadAt).toBe(
      "2026-10-30T12:00:00.000Z",
    );
  });

  it("removes a chat and clears it when it was active", () => {
    useChatStore
      .getState()
      .setChats([
        chat("chat-1", "2026-10-30T10:00:00.000Z"),
        chat("chat-2", "2026-10-30T11:00:00.000Z"),
      ]);
    useChatStore.getState().setActiveChat("chat-1");

    useChatStore.getState().removeChat("chat-1");

    expect(useChatStore.getState().chats.map((item) => item.id)).toEqual(["chat-2"]);
    expect(useChatStore.getState().activeChatId).toBeNull();
  });
});
