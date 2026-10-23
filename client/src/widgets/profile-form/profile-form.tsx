"use client";

import { useState } from "react";
import { updateProfile } from "@/features/update-profile";
import { ApiError } from "@/shared/api";
import { Button, Input } from "@/shared/ui";
import type { User } from "@web-messager/shared";

export function ProfileForm({ user }: { user: User }) {
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextUsername = username.trim();
    const nextDisplayName = displayName.trim();
    if (!nextUsername || !nextDisplayName) {
      setError("Заполните логин и имя");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await updateProfile({
        username: nextUsername,
        displayName: nextDisplayName,
        avatarUrl: avatarUrl.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  }

  function resetSaved() {
    setSaved(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-line bg-surface p-6"
    >
      <div>
        <h1 className="text-lg font-semibold text-fg">Профиль</h1>
        <p className="text-sm text-muted">Изменения сохраняются сразу</p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-fg">Логин</span>
        <Input
          value={username}
          maxLength={32}
          required
          onChange={(e) => {
            setUsername(e.target.value);
            resetSaved();
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-fg">Имя</span>
        <Input
          value={displayName}
          maxLength={64}
          required
          onChange={(e) => {
            setDisplayName(e.target.value);
            resetSaved();
          }}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-fg">Ссылка на аватар</span>
        <Input
          value={avatarUrl}
          placeholder="https://..."
          onChange={(e) => {
            setAvatarUrl(e.target.value);
            resetSaved();
          }}
        />
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Сохраняем..." : "Сохранить"}
        </Button>
        {saved && <span className="text-sm text-success">Профиль обновлён</span>}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}

export default ProfileForm;
