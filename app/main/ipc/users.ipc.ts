import { IpcMain } from "electron";
import { getDb } from "../db/connection";
import { authenticate, requireAdmin } from "./auth-context";
import { hashPassword, publicUser } from "../auth";
import type { User } from "../../shared/types";

export function registerUsersIpc(ipc: IpcMain) {
  ipc.handle("users:list", async (_evt, token: string) => {
    const ctx = authenticate(token);
    requireAdmin(ctx);
    const rows = getDb().prepare(`SELECT * FROM users ORDER BY id`).all() as any[];
    return rows.map(publicUser) as User[];
  });

  ipc.handle(
    "users:create",
    async (
      _evt,
      token: string,
      username: string,
      password: string,
      email: string | null,
      role: "admin" | "user"
    ) => {
      const ctx = authenticate(token);
      requireAdmin(ctx);
      if (!username || !password) throw new Error("Usuário e senha são obrigatórios.");
      if (password.length < 6)
        throw new Error("A senha precisa ter pelo menos 6 caracteres.");
      const hash = hashPassword(password);
      try {
        const info = getDb()
          .prepare(
            `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`
          )
          .run(username, email, hash, role);
        const row = getDb()
          .prepare(`SELECT * FROM users WHERE id = ?`)
          .get(info.lastInsertRowid);
        return publicUser(row) as User;
      } catch (e: any) {
        if (String(e?.message || "").includes("UNIQUE")) {
          throw new Error("Nome de usuário ou email já existe.");
        }
        throw e;
      }
    }
  );

  ipc.handle("users:remove", async (_evt, token: string, id: number) => {
    const ctx = authenticate(token);
    requireAdmin(ctx);
    if (id === ctx.userId)
      throw new Error("Você não pode remover seu próprio usuário.");
    getDb().prepare(`DELETE FROM users WHERE id = ?`).run(id);
  });
}