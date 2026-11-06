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

  it("prepends older messages and ignores duplicates", () => {
    const store = useMessageStore.getState();
    const older = message("m1", "2026-10-30T12:01:00.000Z");
    const newer = message("m2", "2026-10-30T12:02:00.000Z");

    store.setMessages("chat-1", [newer]);
    store.prependMessages("chat-1", [older, newer]);

    expect(useMessageStore.getState().byChat["chat-1"]?.map((item) => item.id)).toEqual([
      "m1",
      "m2",
    ]);
  });

  it("merges overlapping pages without duplicates and keeps chronological order", () => {
    const store = useMessageStore.getState();
    const first = message("m1", "2026-10-30T12:01:00.000Z");
    const second = message("m2", "2026-10-30T12:02:00.000Z");
    const third = message("m3", "2026-10-30T12:03:00.000Z");

    store.setMessages("chat-1", [first, second]);
    store.mergeMessages("chat-1", [second, third]);

    expect(useMessageStore.getState().byChat["chat-1"]?.map((item) => item.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("keeps the same list when a merge brings nothing new", () => {
    const store = useMessageStore.getState();
    store.setMessages("chat-1", [message("m1", "2026-10-30T12:01:00.000Z")]);
    const before = useMessageStore.getState().byChat["chat-1"];

    store.mergeMessages("chat-1", [message("m1", "2026-10-30T12:01:00.000Z")]);

    expect(useMessageStore.getState().byChat["chat-1"]).toBe(before);
  });

  it("replaces an optimistic message when the server echo arrives", () => {
    const store = useMessageStore.getState();
    const optimistic: Message = {
      ...message("temp-client-1", "2026-10-30T12:01:00.000Z", "Привет"),
      clientId: "client-1",
      status: "sending",
    };

    store.addMessage(optimistic);

    const confirmed: Message = {
      ...message("server-1", "2026-10-30T12:01:01.000Z", "Привет"),
      clientId: "client-1",
    };

    store.addMessage(confirmed);

    expect(useMessageStore.getState().byChat["chat-1"]).toEqual([confirmed]);
  });

  it("tracks failed send status", () => {
    const store = useMessageStore.getState();
    store.addMessage({
      ...message("temp-1", "2026-10-30T12:01:00.000Z"),
      clientId: "client-1",
      status: "sending",
    });

    store.setStatus("chat-1", "temp-1", "failed");

    expect(useMessageStore.getState().byChat["chat-1"]?.[0]?.status).toBe("failed");
  });

  it("applies edits and deletions from a merge", () => {
    const store = useMessageStore.getState();
    store.setMessages("chat-1", [message("m1", "2026-10-30T12:01:00.000Z", "Старое")]);

    store.mergeMessages("chat-1", [
      {
        ...message("m1", "2026-10-30T12:01:00.000Z", "Новое"),
        editedAt: "2026-10-30T12:02:00.000Z",
      },
    ]);

    expect(useMessageStore.getState().byChat["chat-1"]?.[0]?.text).toBe("Новое");
    expect(useMessageStore.getState().byChat["chat-1"]?.[0]?.editedAt).toBe(
      "2026-10-30T12:02:00.000Z",
    );
  });

  it("clears all messages", () => {
    useMessageStore.getState().setMessages("chat-1", [message("m1", "2026-10-30T12:01:00.000Z")]);
    useMessageStore.getState().clear();

    expect(useMessageStore.getState().byChat).toEqual({});
  });
});
