import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../../shared/types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clear: () => void;
  updateUser: (u: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
      updateUser: (u) =>
        set((s) => ({ user: s.user ? { ...s.user, ...u } : s.user })),
    }),
    { name: "estante-auth" }
  )
);