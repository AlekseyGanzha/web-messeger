import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/features/auth", () => ({
  login: mocks.login,
  register: mocks.register,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuthForm", () => {
  it("logs in and redirects to chats", async () => {
    mocks.login.mockResolvedValue(undefined);

    render(<AuthForm mode="login" />);

    fireEvent.change(screen.getByPlaceholderText("Логин"), { target: { value: "alice" } });
    fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "secret1" } });
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(mocks.login).toHaveBeenCalledWith({ username: "alice", password: "secret1" });
    expect(mocks.push).toHaveBeenCalledWith("/chat");
  });

  it("registers with a display name and redirects to chats", async () => {
    mocks.register.mockResolvedValue(undefined);

    render(<AuthForm mode="register" />);

    fireEvent.change(screen.getByPlaceholderText("Логин"), { target: { value: "alice" } });
    fireEvent.change(screen.getByPlaceholderText("Имя"), { target: { value: "Алиса" } });
    fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "secret1" } });
    await userEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(mocks.register).toHaveBeenCalledWith({
      username: "alice",
      password: "secret1",
      displayName: "Алиса",
    });
    expect(mocks.push).toHaveBeenCalledWith("/chat");
  });

  it("shows an error and does not redirect on login failure", async () => {
    mocks.login.mockRejectedValue(new Error("invalid credentials"));

    render(<AuthForm mode="login" />);

    fireEvent.change(screen.getByPlaceholderText("Логин"), { target: { value: "alice" } });
    fireEvent.change(screen.getByPlaceholderText("Пароль"), { target: { value: "wrong-pass" } });
    await userEvent.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Неверный логин или пароль")).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
