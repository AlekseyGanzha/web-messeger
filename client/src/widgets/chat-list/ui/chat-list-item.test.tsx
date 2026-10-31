import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chat, User } from "@web-messager/shared";
import { usePresenceStore } from "@/entities/user";
import { ChatListItem } from "./chat-list-item";

const now = new Date(2026, 9, 30, 12, 0, 0);

function user(id: string, displayName: string): User {
  return {
    id,
    username: id,
    displayName,
    avatarUrl: null,
    isOnline: false,
    lastSeenAt: null,
  };
}

const me = user("me", "Я");
const alice = user("alice", "Алиса");
const bob = user("bob", "Боб");

beforeEach(() => {
  usePresenceStore.getState().reset();
});

describe("ChatListItem", () => {
  it("renders a personal chat and handles selection", async () => {
    const onSelect = vi.fn();

    render(
      <ul>
        <ChatListItem
          chat={{
            id: "chat-1",
            name: null,
            isGroup: false,
            updatedAt: "2026-10-30T11:00:00.000Z",
            members: [me, alice],
            lastMessage: {
              id: "message-1",
              chatId: "chat-1",
              senderId: "alice",
              text: "Последнее сообщение",
              imageUrl: null,
              imageMime: null,
              imageSize: null,
              createdAt: "2026-10-30T11:00:00.000Z",
            },
          }}
          meId="me"
          now={now}
          active={false}
          onSelect={onSelect}
        />
      </ul>,
    );

    expect(screen.getByText("Алиса")).toBeInTheDocument();
    expect(screen.getByText("Последнее сообщение")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("shows member count for a group without messages", () => {
    render(
      <ul>
        <ChatListItem
          chat={{
            id: "group-1",
            name: "Команда",
            isGroup: true,
            updatedAt: "2026-10-30T11:00:00.000Z",
            members: [me, alice, bob],
          }}
          meId="me"
          now={now}
          active
          onSelect={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("Команда")).toBeInTheDocument();
    expect(screen.getByText("Участников: 3")).toBeInTheDocument();
  });

  it("shows an image placeholder for an image-only last message", () => {
    render(
      <ul>
        <ChatListItem
          chat={{
            id: "chat-1",
            name: "Алиса",
            isGroup: false,
            updatedAt: "2026-10-30T11:00:00.000Z",
            members: [me, alice],
            lastMessage: {
              id: "message-1",
              chatId: "chat-1",
              senderId: "alice",
              text: "",
              imageUrl: "/uploads/photo.png",
              imageMime: "image/png",
              imageSize: 1024,
              createdAt: "2026-10-30T11:00:00.000Z",
            },
          }}
          meId="me"
          now={now}
          active={false}
          onSelect={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("Изображение")).toBeInTheDocument();
  });
});
