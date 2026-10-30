import type { User } from "@web-messager/shared";

interface SelectedMembersProps {
  selected: User[];
  onToggle: (user: User) => void;
}

export function SelectedMembers({ selected, onToggle }: SelectedMembersProps) {
  if (selected.length === 0) return null;

  return (
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
            onClick={() => onToggle(user)}
            aria-label={`Убрать ${user.displayName}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
