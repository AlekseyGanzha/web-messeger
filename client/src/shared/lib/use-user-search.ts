import { useEffect, useState } from "react";
import { api } from "@/shared/api";
import type { User } from "@web-messager/shared";

interface UseUserSearchOptions {
  open: boolean;
  query: string;
}

export function useUserSearch({ open, query }: UseUserSearchOptions) {
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

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
    setResults([]);
    setSearching(false);
  }, [open]);

  return { results, searching };
}
