import { IpcMain } from "electron";
import { getDb } from "../db/connection";
import {
  verifyPassword,
  signToken,
  verifyToken,
  saveSession,
  deleteSession,
  sessionValid,
  getUserById,
  getUserByUsername,
  publicUser,
} from "../auth";

export function registerAuthIpc(ipc: IpcMain) {
  ipc.handle("auth:login", async (_evt, username: string, password: string) => {
    const db = getDb();
    const user = getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new Error("Usuário ou senha inválidos.");
    }
    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    saveSession(token, user.id);
    db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(user.id);
    return { token, user: publicUser(user) };
  });

  ipc.handle("auth:me", async (_evt, token: string) => {
    if (!token || !verifyToken(token) || !sessionValid(token)) {
      throw new Error("Sessão inválida.");
    }
    const payload = verifyToken(token)!;
    const user = getUserById(payload.sub);
    if (!user) throw new Error("Usuário não encontrado.");
    return publicUser(user);
  });

  ipc.handle("auth:logout", async (_evt, token: string) => {
    if (token) deleteSession(token);
  });
}