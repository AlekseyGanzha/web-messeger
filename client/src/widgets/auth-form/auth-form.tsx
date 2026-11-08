"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/shared/api";
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
  const submittingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const nextUsername = username.trim();

      if (isRegister) {
        await register({
          username: nextUsername,
          password,
          displayName: displayName.trim(),
        });
      } else {
        await login({ username: nextUsername, password });
      }

      router.push("/chat");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Слишком много попыток. Попробуйте позже");
      } else if (isRegister) {
        if (err instanceof ApiError && err.status === 409) {
          setError("Этот логин уже занят");
        } else if (err instanceof ApiError && err.status === 400) {
          setError("Логин от 3 символов, пароль от 6, имя от 2");
        } else {
          setError("Не удалось зарегистрироваться");
        }
      } else {
        setError("Неверный логин или пароль");
      }
    } finally {
      submittingRef.current = false;
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
