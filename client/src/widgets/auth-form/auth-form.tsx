"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/shared/ui";
import { login, register } from "@/features/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        await register({ username, password, displayName });
      } else {
        await login({ username, password });
      }
      router.push("/chat");
    } catch {
      setError(isRegister ? "Не удалось зарегистрироваться" : "Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-80 flex-col gap-3">
      <Input
        placeholder="Логин"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      {isRegister && (
        <Input
          placeholder="Имя"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      )}
      <Input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Подождите..." : isRegister ? "Зарегистрироваться" : "Войти"}
      </Button>
      <p className="text-center text-sm text-muted">
        {isRegister ? (
          <>
            Уже есть аккаунт?
            <Link href="/login" className="text-primary">
              Войти
            </Link>
          </>
        ) : (
          <>
            Нет аккаунта?
            <Link href="/register" className="text-primary">
              Регистрация
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
