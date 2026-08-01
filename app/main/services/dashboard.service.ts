import { getDb } from "../db/connection";
import type { AuthContext } from "../ipc/auth-context";
import type { DashboardStats } from "../../shared/types";

export function getDashboardStats(ctx: AuthContext): DashboardStats {
  const db = getDb();
  const isAdmin = ctx.user.role === "admin";
  // Clientes só enxergam ebooks publicados em todas as contagens.
  const visibleWhere = isAdmin ? "" : "WHERE status = 'publicado'";
  const visibleAnd = isAdmin ? "" : "AND e.status = 'publicado'";

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM ebooks ${visibleWhere}`).get() as { c: number }
  ).c;
  const byStatus = (s: string) =>
    (
      db.prepare(`SELECT COUNT(*) AS c FROM ebooks WHERE status = ?`).get(s) as {
        c: number;
      }
    ).c;

  const cats = db
    .prepare(
      `SELECT c.id, c.code, c.title, c.note, c.theme,
              (SELECT COUNT(*) FROM ebooks e WHERE e.category_id = c.id ${visibleAnd}) AS count
       FROM categories c
       ORDER BY c.sort_order, c.code`
    )
    .all() as DashboardStats["categories"];

  const reading = db
    .prepare(
      `SELECT ue.ebook_id, e.title, ue.progress,
              (SELECT c.code FROM categories c WHERE c.id = e.category_id) AS category_code
       FROM user_ebooks ue
       JOIN ebooks e ON e.id = ue.ebook_id
       WHERE ue.user_id = ? AND ue.progress > 0 ${visibleAnd}
       ORDER BY ue.last_read DESC
       LIMIT 5`
    )
    .all(ctx.userId) as DashboardStats["reading"];

  return {
    total,
    pronto: isAdmin ? byStatus("pronto") : 0,
    rascunho: isAdmin ? byStatus("rascunho") : 0,
    publicado: byStatus("publicado"),
    verificar: isAdmin ? byStatus("verificar") : 0,
    categories: cats,
    reading,
  };
}

export function setProgress(ctx: AuthContext, ebookId: number, progress: number): void {
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  getDb()
    .prepare(
      `INSERT INTO user_ebooks (user_id, ebook_id, progress, last_read)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, ebook_id) DO UPDATE SET
         progress = excluded.progress,
         last_read = excluded.last_read`
    )
    .run(ctx.userId, ebookId, p);
}

export function getProgress(ctx: AuthContext, ebookId: number): number {
  const row = getDb()
    .prepare(`SELECT progress FROM user_ebooks WHERE user_id = ? AND ebook_id = ?`)
    .get(ctx.userId, ebookId) as { progress: number } | undefined;
  return row?.progress ?? 0;
}
