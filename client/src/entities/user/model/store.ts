import { create } from "zustand";
import type { User } from "@web-messager/shared";

interface UserState {
  me: User | null;
  setMe: (user: User | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  me: null,
  setMe: (me) => set({ me }),
}));
