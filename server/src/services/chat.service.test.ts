import { describe, expect, it } from "vitest";
import { toChatDto } from "./chat.service.js";

const alice = {
  id: "user-1",
  username: "alice",
  displayName: "Алиса",
  avatarUrl: null,
  isOnline: true,
  lastSeenAt: new Date("2026-10-30T10:00:00.000Z"),
};

const bob = {
  id: "user-2",
  username: "bob",
  displayName: "Боб",
  avatarUrl: "https://example.com/bob.png",
  isOnline: false,
  lastSeenAt: null,
};

const lastMessage = {
  id: "message-1",
  chatId: "chat-1",
  senderId: "user-2",
  text: "Привет",
  imageUrl: null,
  imageMime: null,
  imageSize: null,
  createdAt: new Date("2026-10-30T11:00:00.000Z"),
};

describe("toChatDto", () => {
  it("builds a personal chat dto with the other member as name", () => {
    const chat = toChatDto(
      {
        id: "chat-1",
        name: null,
        isGroup: false,
        updatedAt: new Date("2026-10-30T11:00:00.000Z"),
        members: [
          { userId: "user-1", user: alice },
          { userId: "user-2", user: bob },
        ],
        messages: [lastMessage],
      },
      "user-1",
    );

    expect(chat).toMatchObject({
      id: "chat-1",
      name: "Боб",
      isGroup: false,
      updatedAt: "2026-10-30T11:00:00.000Z",
      lastMessage: {
        id: "message-1",
        text: "Привет",
        createdAt: "2026-10-30T11:00:00.000Z",
      },
    });
    expect(chat.members[0]).toMatchObject({
      id: "user-1",
      lastSeenAt: "2026-10-30T10:00:00.000Z",
    });
  });

  it("keeps the group name and omits a missing last message", () => {
    const chat = toChatDto(
      {
        id: "group-1",
        name: "Команда",
        isGroup: true,
        updatedAt: new Date("2026-10-30T09:00:00.000Z"),
        members: [
          { userId: "user-1", user: alice },
          { userId: "user-2", user: bob },
        ],
        messages: [],
      },
      "user-1",
    );

    expect(chat.name).toBe("Команда");
    expect(chat.isGroup).toBe(true);
    expect(chat.lastMessage).toBeUndefined();
    expect(chat.members).toHaveLength(2);
  });
});
