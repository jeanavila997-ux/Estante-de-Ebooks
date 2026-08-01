import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db/connection";
import { getJwtSecret } from "../config";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export interface JwtPayload {
  sub: number;
  username: string;
  role: "admin" | "user";
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as unknown as JwtPayload;
    if (
      decoded &&
      typeof (decoded as any).sub === "number" &&
      typeof (decoded as any).username === "string"
    ) {
      return decoded as JwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, userId: number) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(token, userId, expiresAt);
}

export function deleteSession(token: string) {
  try {
    getDb().prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
  } catch {}
}

export function sessionValid(token: string): boolean {
  try {
    const row = getDb()
      .prepare(`SELECT expires_at FROM sessions WHERE token = ?`)
      .get(token) as { expires_at: string } | undefined;
    if (!row) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  } catch {
    return false;
  }
}

export function getUserById(id: number) {
  return getDb()
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as
    | {
        id: number;
        username: string;
        email: string | null;
        password_hash: string;
        role: "admin" | "user";
        theme: "light" | "dark";
        created_at: string;
        last_login: string | null;
      }
    | undefined;
}

export function getUserByUsername(username: string) {
  return getDb()
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username) as ReturnType<typeof getUserById> | undefined;
}

export function publicUser(u: {
  id: number;
  username: string;
  email: string | null;
  role: "admin" | "user";
  theme: "light" | "dark";
  created_at: string;
  last_login: string | null;
}) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    theme: u.theme,
    created_at: u.created_at,
    last_login: u.last_login,
  };
}