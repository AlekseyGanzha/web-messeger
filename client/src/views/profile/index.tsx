"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/widgets/app-header";
import { ProfileForm } from "@/widgets/profile-form";
import { api } from "@/shared/api";
import { apiConfig } from "@/shared/config";
import { useUserStore } from "@/entities/user";
import type { User } from "@web-messager/shared";

export default function ProfilePage() {
  const router = useRouter();
  const me = useUserStore((s) => s.me);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(apiConfig.TOKEN_KEY);
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const user = await api<User>("/users/me");
        if (cancelled) return;
        useUserStore.getState().setMe(user);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(apiConfig.TOKEN_KEY);
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-panel">
      <AppHeader />
      <main className="flex flex-1 justify-center p-6">
        {loading ? (
          <p className="text-sm text-muted">Загрузка...</p>
        ) : me ? (
          <ProfileForm user={me} />
        ) : null}
      </main>
    </div>
  );
}
