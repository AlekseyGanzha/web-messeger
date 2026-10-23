"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth";
import { useUserStore } from "@/entities/user";
import { Button } from "@/shared/ui";
import { ThemeToggle } from "../theme-toggle";

export const AppHeader = () => {
  const router = useRouter();
  const me = useUserStore((s) => s.me);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4">
      <Link href="/chat" className="truncate text-base font-semibold text-fg hover:text-primary">
        Web Messager
      </Link>

      <ThemeToggle />

      <div className="flex items-center gap-2">
        {me && (
          <div className="mr-1 hidden items-center gap-2 sm:flex">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-white">
              {me.avatarUrl ? (
                <img
                  src={me.avatarUrl}
                  alt={me.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                (me.displayName || me.username).charAt(0).toUpperCase()
              )}
            </div>
            <div className="leading-tight">
              <p className="max-w-[140px] truncate text-sm font-medium text-fg">{me.displayName}</p>
              <p className="text-xs text-muted">@{me.username}</p>
            </div>
          </div>
        )}

        <Link
          href="/profile"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-hover"
        >
          Настройки
        </Link>

        <Button variant="danger" size="sm" onClick={handleLogout}>
          Выйти
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
