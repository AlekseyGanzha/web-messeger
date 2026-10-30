import { Avatar } from "@/shared/ui";
import type { User } from "@web-messager/shared";

interface SearchResultsProps {
  query: string;
  searching: boolean;
  users: User[];
  onToggle: (user: User) => void;
}

export function SearchResults({ query, searching, users, onToggle }: SearchResultsProps) {
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-line">
      {searching && <p className="p-3 text-sm text-muted">Поиск…</p>}

      {!searching && query.trim().length < 2 && (
        <p className="p-3 text-sm text-muted">Введите хотя бы 2 символа</p>
      )}

      {!searching && query.trim().length >= 2 && users.length === 0 && (
        <p className="p-3 text-sm text-muted">Никого не нашли</p>
      )}

      <ul className="divide-y divide-line">
        {users.map((user) => (
          <li key={user.id}>
            <button
              type="button"
              onClick={() => onToggle(user)}
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
  );
}
