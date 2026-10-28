import { create } from "zustand";
import type { PresenceUpdate, User } from "@web-messager/shared";

interface PresenceState {
  byUserId: Record<string, PresenceUpdate>;
  setPresence: (presence: PresenceUpdate) => void;
  setMany: (list: PresenceUpdate[]) => void;
  hydrate: (users: Pick<User, "id" | "isOnline" | "lastSeenAt">[]) => void;
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  byUserId: {},
  setPresence: (presence) =>
    set((s) => ({
      byUserId: { ...s.byUserId, [presence.userId]: presence },
    })),
  setMany: (list) =>
    set((s) => {
      const next = { ...s.byUserId };
      for (const p of list) next[p.userId] = p;
      return { byUserId: next };
    }),
  hydrate: (users) =>
    set((s) => {
      const next = { ...s.byUserId };
      for (const u of users) {
        if (!next[u.id]) {
          next[u.id] = { userId: u.id, isOnline: u.isOnline, lastSeenAt: u.lastSeenAt };
        }
      }
      return { byUserId: next };
    }),
  reset: () => set({ byUserId: {} }),
}));
