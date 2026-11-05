"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/shared/api";
import { Avatar, Button, Input, SearchResults } from "@/shared/ui";
import { useUserSearch } from "@/shared/lib/use-user-search";
import {
  addGroupMembers,
  deleteGroup,
  leaveGroup,
  removeGroupMember,
} from "@/features/manage-group";
import { useChatStore } from "@/entities/chat";
import type { Chat, User } from "@web-messager/shared";

interface GroupSettingsDialogProps {
  open: boolean;
  chat: Chat;
  meId?: string;
  onClose: () => void;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function GroupSettingsDialog({ open, chat, meId, onClose }: GroupSettingsDialogProps) {
  const addChat = useChatStore((s) => s.addChat);
  const removeChat = useChatStore((s) => s.removeChat);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { results, searching } = useUserSearch({ open, query });

  useEffect(() => {
    if (open) return;

    setQuery("");
    setBusy(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const isOwner = chat.ownerId === meId;
  const memberIds = new Set(chat.members.map((member) => member.id));
  const visibleResults = results.filter((user) => !memberIds.has(user.id));

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError(null);

    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, "Не удалось выполнить действие"));
    } finally {
      setBusy(null);
    }
  }

  function handleAdd(user: User) {
    void run(`add:${user.id}`, async () => {
      const updated = await addGroupMembers(chat.id, [user.username]);
      addChat(updated);
      setQuery("");
    });
  }

  function handleRemove(user: User) {
    if (!window.confirm(`Удалить ${user.displayName} из группы?`)) return;

    void run(`remove:${user.id}`, async () => {
      const updated = await removeGroupMember(chat.id, user.id);
      addChat(updated);
    });
  }

  function handleLeave() {
    if (!window.confirm("Выйти из группы?")) return;

    void run("leave", async () => {
      await leaveGroup(chat.id);
      removeChat(chat.id);
      onClose();
    });
  }

  function handleDelete() {
    if (!window.confirm("Удалить группу для всех участников?")) return;

    void run("delete", async () => {
      await deleteGroup(chat.id);
      removeChat(chat.id);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки группы"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg">{chat.name ?? "Без названия"}</h2>
            <p className="text-xs text-muted">Участников: {chat.members.length}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Закрыть">
            ×
          </Button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-fg">Участники</h3>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {chat.members.map((member) => {
              const isChatOwner = member.id === chat.ownerId;
              const canRemove = isOwner && !isChatOwner && member.id !== meId;

              return (
                <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                  <Avatar
                    name={member.displayName}
                    src={member.avatarUrl}
                    size="sm"
                    isOnline={member.isOnline}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {member.displayName}
                      {member.id === meId ? " (вы)" : ""}
                    </p>
                    <p className="truncate text-xs text-muted">@{member.username}</p>
                  </div>
                  {isChatOwner && (
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-muted">
                      Владелец
                    </span>
                  )}
                  {canRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      disabled={busy !== null}
                      onClick={() => handleRemove(member)}
                      aria-label={`Удалить ${member.displayName}`}
                    >
                      ×
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {isOwner ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-fg">Добавить участников</h3>
            <Input
              value={query}
              placeholder="Поиск по логину или имени"
              onChange={(event) => setQuery(event.target.value)}
            />
            <SearchResults
              query={query}
              searching={searching}
              users={visibleResults}
              onToggle={handleAdd}
              emptyLabel="Никого не нашли или все уже в группе"
            />
            {busy?.startsWith("add:") && <p className="text-xs text-muted">Добавляем…</p>}
          </section>
        ) : (
          <p className="text-xs text-muted">
            Добавлять и удалять участников может только владелец группы.
          </p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <Button type="button" variant="secondary" onClick={handleLeave} disabled={busy !== null}>
            Выйти из группы
          </Button>
          {isOwner && (
            <Button type="button" variant="danger" onClick={handleDelete} disabled={busy !== null}>
              Удалить группу
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
