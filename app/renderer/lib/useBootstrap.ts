import { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useThemeStore, applyThemeToDocument } from "../store/theme";
import { api } from "./api";

export function useBootstrap() {
  const token = useAuthStore((s) => s.token);
  const clear = useAuthStore((s) => s.clear);
  const updateUser = useAuthStore((s) => s.updateUser);
  const theme = useThemeStore((s) => s.theme);

  // Aplica classe dark no <html> sempre que mudar
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Verifica sessão no boot
  useEffect(() => {
    if (!token) return;
    api.auth
      .me()
      .then((u) => updateUser(u))
      .catch(() => clear());
  }, [token, clear, updateUser]);
}