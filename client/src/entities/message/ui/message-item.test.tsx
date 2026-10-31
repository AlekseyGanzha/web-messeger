import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Message } from "@web-messager/shared";
import { MessageItem } from "./message-item";

const baseMessage: Message = {
  id: "message-1",
  chatId: "chat-1",
  senderId: "user-2",
  text: "Привет",
  imageUrl: null,
  imageMime: null,
  imageSize: null,
  createdAt: new Date(2026, 9, 30, 12, 30).toISOString(),
};

describe("MessageItem", () => {
  it("renders text, time and sender for an incoming message", () => {
    render(<MessageItem message={baseMessage} isMine={false} senderName="Алиса" />);

    expect(screen.getByText("Алиса")).toBeInTheDocument();
    expect(screen.getByText("Привет")).toBeInTheDocument();
    expect(screen.getByText("12:30")).toBeInTheDocument();
  });

  it("renders an image and hides the sender for own messages", () => {
    render(
      <MessageItem
        message={{
          ...baseMessage,
          text: "",
          imageUrl: "/uploads/photo.png",
          imageMime: "image/png",
          imageSize: 1024,
        }}
        isMine
        senderName="Алиса"
      />,
    );

    expect(screen.queryByText("Алиса")).not.toBeInTheDocument();
    expect(screen.queryByText("Привет")).not.toBeInTheDocument();
    expect(screen.getByAltText("Изображение").getAttribute("src")).toContain("/uploads/photo.png");
  });
});
