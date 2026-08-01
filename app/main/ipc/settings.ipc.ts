import { IpcMain } from "electron";
import { getDb } from "../db/connection";
import { authenticate } from "./auth-context";
import { hashPassword, verifyPassword } from "../auth";

export function registerSettingsIpc(ipc: IpcMain) {
  ipc.handle(
    "settings:setTheme",
    async (_evt, token: string, theme: "light" | "dark") => {
      const ctx = authenticate(token);
      getDb().prepare(`UPDATE users SET theme = ? WHERE id = ?`).run(
        theme,
        ctx.userId
      );
    }
  );

  ipc.handle(
    "settings:changePassword",
    async (_evt, token: string, current: string, next: string) => {
      const ctx = authenticate(token);
      const row = getDb()
        .prepare(`SELECT password_hash FROM users WHERE id = ?`)
        .get(ctx.userId) as { password_hash: string };
      if (!verifyPassword(current, row.password_hash)) {
        throw new Error("Senha atual incorreta.");
      }
      if (next.length < 6) {
        throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
      }
      getDb()
        .prepare(`UPDATE users SET password_hash = ? WHERE id = ?`)
        .run(hashPassword(next), ctx.userId);
    }
  );
}