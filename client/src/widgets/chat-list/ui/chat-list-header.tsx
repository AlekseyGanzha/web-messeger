import type { FormEvent } from "react";
import { Button, Input } from "@/shared/ui";

interface ChatListHeaderProps {
  username: string;
  onUsernameChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onOpenGroup: () => void;
}

export function ChatListHeader({
  username,
  onUsernameChange,
  loading,
  error,
  onCreate,
  onOpenGroup,
}: ChatListHeaderProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-line p-3">
      <form onSubmit={onCreate} className="flex gap-2">
        <Input
          placeholder="Логин собеседника"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
        />
        <Button type="submit" disabled={loading || !username.trim()}>
          +
        </Button>
      </form>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button type="button" variant="secondary" size="sm" onClick={onOpenGroup}>
        Создать группу
      </Button>
    </div>
  );
}
