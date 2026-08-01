import { getDb } from "../db/connection";
import { requireAdmin } from "../ipc/auth-context";
import type { AuthContext } from "../ipc/auth-context";
import type { Category, CategoryInput } from "../../shared/types";

function getCategoryRow(id: number): Category {
  const row = getDb()
    .prepare(`SELECT id, code, title, note, theme, sort_order FROM categories WHERE id = ?`)
    .get(id) as Category | undefined;
  if (!row) throw new Error("Categoria não encontrada.");
  return row;
}

export function listCategories(_ctx: AuthContext): Category[] {
  return getDb()
    .prepare(
      `SELECT id, code, title, note, theme, sort_order FROM categories ORDER BY sort_order, code`
    )
    .all() as Category[];
}

export function createCategory(ctx: AuthContext, input: CategoryInput): Category {
  requireAdmin(ctx);
  const code = input.code.trim();
  const title = input.title.trim();
  if (!code || !title) throw new Error("Código e título são obrigatórios.");
  const maxOrder = (
    getDb().prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories`).get() as {
      m: number;
    }
  ).m;
  try {
    const info = getDb()
      .prepare(
        `INSERT INTO categories (code, title, note, theme, sort_order) VALUES (?, ?, ?, ?, ?)`
      )
      .run(code, title, input.note || null, input.theme || "default", maxOrder + 1);
    return getCategoryRow(Number(info.lastInsertRowid));
  } catch (err: any) {
    if (String(err?.message).includes("UNIQUE")) {
      throw new Error(`Já existe uma categoria com o código "${code}".`);
    }
    throw err;
  }
}

export function updateCategory(
  ctx: AuthContext,
  id: number,
  input: Partial<CategoryInput>
): Category {
  requireAdmin(ctx);
  getCategoryRow(id);
  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  if (input.code !== undefined) {
    if (!input.code.trim()) throw new Error("Código não pode ficar vazio.");
    fields.push("code = ?");
    params.push(input.code.trim());
  }
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new Error("Título não pode ficar vazio.");
    fields.push("title = ?");
    params.push(input.title.trim());
  }
  if (input.note !== undefined) {
    fields.push("note = ?");
    params.push(input.note || null);
  }
  if (input.theme !== undefined) {
    fields.push("theme = ?");
    params.push(input.theme || "default");
  }
  if (!fields.length) return getCategoryRow(id);
  params.push(id);
  try {
    getDb()
      .prepare(`UPDATE categories SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);
  } catch (err: any) {
    if (String(err?.message).includes("UNIQUE")) {
      throw new Error("Já existe uma categoria com esse código.");
    }
    throw err;
  }
  return getCategoryRow(id);
}

export function countCategoryEbooks(ctx: AuthContext, id: number): number {
  requireAdmin(ctx);
  return (
    getDb()
      .prepare(`SELECT COUNT(*) AS c FROM ebooks WHERE category_id = ?`)
      .get(id) as { c: number }
  ).c;
}

export function removeCategory(ctx: AuthContext, id: number): void {
  requireAdmin(ctx);
  getCategoryRow(id);
  // FK ON DELETE CASCADE remove os ebooks junto — a UI confirma antes via countCategoryEbooks.
  getDb().prepare(`DELETE FROM categories WHERE id = ?`).run(id);
}

export function reorderCategories(ctx: AuthContext, orderedIds: number[]): Category[] {
  requireAdmin(ctx);
  const db = getDb();
  const update = db.prepare(`UPDATE categories SET sort_order = ? WHERE id = ?`);
  orderedIds.forEach((id, index) => update.run(index, id));
  return listCategories(ctx);
}
