"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/widgets/app-header";
import { ProfileForm } from "@/widgets/profile-form";
import { api, ApiError } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { Button } from "@/shared/ui";
import { useUserStore } from "@/entities/user";
import type { User } from "@web-messager/shared";

export default function ProfilePage() {
  const router = useRouter();
  const me = useUserStore((s) => s.me);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem(apiConfig.TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const user = await api<User>("/users/me");
        if (cancelled) return;
        useUserStore.getState().setMe(user);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) return;
        setError("Не удалось загрузить профиль. Проверьте соединение с сервером.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, retryKey]);

  return (
    <div className="flex min-h-screen flex-col bg-panel">
      <AppHeader />
      <main className="flex flex-1 justify-center p-6">
        {loading ? (
          <p className="text-sm text-muted">Загрузка...</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted">{error}</p>
            <Button variant="secondary" onClick={() => setRetryKey((key) => key + 1)}>
              Повторить
            </Button>
          </div>
        ) : me ? (
          <ProfileForm user={me} />
        ) : null}
      </main>
    </div>
  );
}
