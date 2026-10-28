"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/shared/api";
import { Avatar, Button, Input } from "@/shared/ui";
import { createGroupChat } from "@/features/create-chat";
import type { Chat, User } from "@web-messager/shared";

const MIN_MEMBERS = 1;

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (chat: Chat) => void;
}

export function CreateGroupDialog({ open, onClose, onCreated }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const users = await api<User[]>(`/users?q=${encodeURIComponent(q)}`);
        if (!cancelled) setResults(users);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    if (open) return;

    setName("");
    setQuery("");
    setResults([]);
    setSelected([]);
    setError(null);
    setLoading(false);
    setSearching(false);
  }, [open]);

  if (!open) return null;

  const selectedIds = new Set(selected.map((user) => user.id));
  const visibleResults = results.filter((user) => !selectedIds.has(user.id));
  const canCreate = name.trim().length >= 2 && selected.length >= MIN_MEMBERS && !loading;

  function toggleUser(user: User) {
    setSelected((prev) =>
      prev.some((item) => item.id === user.id)
        ? prev.filter((item) => item.id !== user.id)
        : [...prev, user],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreate) return;

    setLoading(true);
    setError(null);

    try {
      const chat = await createGroupChat({
        name: name.trim(),
        usernames: selected.map((user) => user.username),
      });
      onCreated(chat);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать группу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Создать группу"
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Новая группа</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Закрыть">
            ×
          </Button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg">Название</span>
          <Input
            value={name}
            maxLength={64}
            placeholder="Например, Друзья"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((user) => (
              <span
                key={user.id}
                className="flex items-center gap-1 rounded-full bg-elevated px-2 py-1 text-xs text-fg"
              >
                {user.displayName}
                <button
                  type="button"
                  className="text-muted hover:text-danger"
                  onClick={() => toggleUser(user)}
                  aria-label={`Убрать ${user.displayName}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-fg">Участники</span>
            <Input
              value={query}
              placeholder="Поиск по логину или имени"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="max-h-56 overflow-y-auto rounded-lg border border-line">
            {searching && <p className="p-3 text-sm text-muted">Поиск…</p>}

            {!searching && query.trim().length < 2 && (
              <p className="p-3 text-sm text-muted">Введите хотя бы 2 символа</p>
            )}

            {!searching && query.trim().length >= 2 && visibleResults.length === 0 && (
              <p className="p-3 text-sm text-muted">Никого не нашли</p>
            )}

            <ul className="divide-y divide-line">
              {visibleResults.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => toggleUser(user)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover"
                  >
                    <Avatar
                      name={user.displayName}
                      src={user.avatarUrl}
                      size="sm"
                      isOnline={user.isOnline}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-fg">
                        {user.displayName}
                      </span>
                      <span className="block truncate text-xs text-muted">@{user.username}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">Вы + минимум {MIN_MEMBERS} участник</p>
          <Button type="submit" disabled={!canCreate}>
            {loading ? "Создаём…" : "Создать группу"}
          </Button>
        </div>
      </form>
    </div>
  );
}
