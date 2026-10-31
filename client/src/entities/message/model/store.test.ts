import { beforeEach, describe, expect, it } from "vitest";
import type { Message } from "@web-messager/shared";
import { useMessageStore } from "./store";

function message(id: string, createdAt: string, text = id): Message {
  return {
    id,
    chatId: "chat-1",
    senderId: "user-1",
    text,
    imageUrl: null,
    imageMime: null,
    imageSize: null,
    createdAt,
  };
}

beforeEach(() => {
  useMessageStore.getState().clear();
});

describe("useMessageStore", () => {
  it("replaces the message list for a chat", () => {
    const store = useMessageStore.getState();

    store.setMessages("chat-1", [
      message("m2", "2026-10-30T12:02:00.000Z"),
      message("m1", "2026-10-30T12:01:00.000Z"),
    ]);
    store.setMessages("chat-1", [message("m3", "2026-10-30T12:03:00.000Z")]);

    expect(useMessageStore.getState().byChat["chat-1"]?.map((item) => item.id)).toEqual(["m3"]);
  });

  it("adds a new message and ignores duplicates", () => {
    const store = useMessageStore.getState();
    const incoming = message("m1", "2026-10-30T12:01:00.000Z");

    store.addMessage(incoming);
    store.addMessage(incoming);

    expect(useMessageStore.getState().byChat["chat-1"]).toEqual([incoming]);
  });

  it("clears all messages", () => {
    useMessageStore.getState().setMessages("chat-1", [message("m1", "2026-10-30T12:01:00.000Z")]);
    useMessageStore.getState().clear();

    expect(useMessageStore.getState().byChat).toEqual({});
  });
});
