import { verifyToken, sessionValid, getUserById, publicUser } from "../auth";
import type { User } from "../../shared/types";

export interface AuthContext {
  user: User;
  userId: number;
}

export function authenticate(token: string): AuthContext {
  if (!token) throw new Error("Token ausente.");
  const payload = verifyToken(token);
  if (!payload || !sessionValid(token)) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  const u = getUserById(payload.sub);
  if (!u) throw new Error("Usuário não encontrado.");
  return { user: publicUser(u), userId: u.id };
}

export function requireAdmin(ctx: AuthContext) {
  if (ctx.user.role !== "admin") {
    throw new Error("Acesso restrito ao administrador.");
  }
}