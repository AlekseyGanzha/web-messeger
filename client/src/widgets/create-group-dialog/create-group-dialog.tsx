"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api";
import { Button, Input } from "@/shared/ui";
import { createGroupChat } from "@/features/create-chat";
import type { Chat, User } from "@web-messager/shared";
import { useUserSearch } from "./model/use-user-search";
import { SearchResults } from "./ui/search-results";
import { SelectedMembers } from "./ui/selected-members";

const MIN_MEMBERS = 1;

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (chat: Chat) => void;
}

export function CreateGroupDialog({ open, onClose, onCreated }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { results, searching } = useUserSearch({ open, query });

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;

    setName("");
    setQuery("");
    setSelected([]);
    setError(null);
    setLoading(false);
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

        <SelectedMembers selected={selected} onToggle={toggleUser} />

        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-fg">Участники</span>
            <Input
              value={query}
              placeholder="Поиск по логину или имени"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <SearchResults
            query={query}
            searching={searching}
            users={visibleResults}
            onToggle={toggleUser}
          />
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
