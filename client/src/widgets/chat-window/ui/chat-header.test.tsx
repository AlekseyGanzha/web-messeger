import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chat, User } from "@web-messager/shared";
import { usePresenceStore } from "@/entities/user";
import { ChatHeader } from "./chat-header";

const { now } = vi.hoisted(() => ({ now: new Date(2026, 9, 30, 12, 0, 0) }));

vi.mock("@/shared/lib/use-now", () => ({ useNow: () => now }));

function user(id: string, displayName: string, isOnline = false): User {
  return {
    id,
    username: id,
    displayName,
    avatarUrl: null,
    isOnline,
    lastSeenAt: null,
  };
}

const me = user("me", "Я");
const alice = user("alice", "Алиса");
const bob = user("bob", "Боб");

function chat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: "chat-1",
    name: "Алиса",
    isGroup: false,
    updatedAt: "2026-10-30T11:00:00.000Z",
    members: [me, alice],
    ...overrides,
  };
}

beforeEach(() => {
  usePresenceStore.getState().reset();
});

describe("ChatHeader", () => {
  it("shows online status for a personal chat", () => {
    usePresenceStore.getState().setPresence({
      userId: "alice",
      isOnline: true,
      lastSeenAt: null,
    });

    render(<ChatHeader chat={chat()} meId="me" typingUserIds={[]} />);

    expect(screen.getByText("Алиса")).toBeInTheDocument();
    expect(screen.getByText("в сети")).toBeInTheDocument();
  });

  it("shows typing status instead of last seen in a personal chat", () => {
    usePresenceStore.getState().setPresence({
      userId: "alice",
      isOnline: false,
      lastSeenAt: new Date(2026, 9, 30, 11, 55).toISOString(),
    });

    render(<ChatHeader chat={chat()} meId="me" typingUserIds={["alice"]} />);

    expect(screen.getByText("печатает…")).toBeInTheDocument();
    expect(screen.queryByText("был(а) 5 минут назад")).not.toBeInTheDocument();
  });

  it("shows group participants and online count", () => {
    usePresenceStore.getState().setPresence({
      userId: "alice",
      isOnline: true,
      lastSeenAt: null,
    });

    render(
      <ChatHeader
        chat={chat({ id: "group-1", name: "Команда", isGroup: true, members: [me, alice, bob] })}
        meId="me"
        typingUserIds={[]}
      />,
    );

    expect(screen.getByText("Команда")).toBeInTheDocument();
    expect(screen.getByText("Участников: 3 • 1 в сети")).toBeInTheDocument();
  });

  it("formats typing status for several group members", () => {
    render(
      <ChatHeader
        chat={chat({ id: "group-1", name: "Команда", isGroup: true, members: [me, alice, bob] })}
        meId="me"
        typingUserIds={["alice", "bob"]}
      />,
    );

    expect(screen.getByText("Алиса и ещё 1 печатают…")).toBeInTheDocument();
  });
});
