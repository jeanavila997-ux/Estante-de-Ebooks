import path from "node:path";
import fs from "node:fs";
import { getDb } from "../db/connection";
import { getEbooksDir } from "../config";
import { requireAdmin } from "../ipc/auth-context";
import type { AuthContext } from "../ipc/auth-context";
import type { Ebook, EbookContent, EbookStatus, EbookUpdate } from "../../shared/types";

const VALID_STATUS: EbookStatus[] = ["rascunho", "pronto", "publicado", "verificar"];
const ALLOWED_EXTENSIONS = [".pdf", ".html", ".htm", ".md"];
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ").trim();
}

function publicEbook(row: any): Ebook {
  return {
    id: row.id,
    category_id: row.category_id,
    title: row.title,
    kind: row.kind,
    description: row.description,
    file_path: row.file_path,
    cover_color: row.cover_color,
    status: row.status as EbookStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getEbookRow(id: number): any {
  const row = getDb().prepare(`SELECT * FROM ebooks WHERE id = ?`).get(id);
  if (!row) throw new Error("Ebook não encontrado.");
  return row;
}

export function detectFormat(filePath: string): EbookContent["format"] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".md") return "md";
  throw new Error(`Formato não suportado: ${ext || "(sem extensão)"}`);
}

export function listEbooks(ctx: AuthContext, categoryId?: number): Ebook[] {
  const db = getDb();
  const clauses: string[] = [];
  const params: (number | string)[] = [];
  if (categoryId) {
    clauses.push("category_id = ?");
    params.push(categoryId);
  }
  if (ctx.user.role !== "admin") {
    clauses.push("status = 'publicado'");
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(`SELECT * FROM ebooks ${where} ORDER BY id`).all(...params);
  return rows.map(publicEbook);
}

export function setEbookStatus(ctx: AuthContext, id: number, status: string): Ebook {
  requireAdmin(ctx);
  if (!VALID_STATUS.includes(status as EbookStatus)) {
    throw new Error("Status inválido.");
  }
  getDb()
    .prepare(`UPDATE ebooks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(status, id);
  return publicEbook(getEbookRow(id));
}

export function updateEbook(ctx: AuthContext, id: number, patch: EbookUpdate): Ebook {
  requireAdmin(ctx);
  getEbookRow(id);
  if (patch.status && !VALID_STATUS.includes(patch.status)) {
    throw new Error("Status inválido.");
  }
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new Error("Título não pode ficar vazio.");
  }

  const fields: string[] = [];
  const params: (string | number | null)[] = [];
  const set = (col: string, value: string | number | null) => {
    fields.push(`${col} = ?`);
    params.push(value);
  };
  if (patch.title !== undefined) set("title", patch.title.trim());
  if (patch.kind !== undefined) set("kind", patch.kind || null);
  if (patch.description !== undefined) set("description", patch.description || null);
  if (patch.category_id !== undefined) set("category_id", patch.category_id);
  if (patch.status !== undefined) set("status", patch.status);
  if (patch.cover_color !== undefined) set("cover_color", patch.cover_color || null);
  if (!fields.length) return publicEbook(getEbookRow(id));

  params.push(id);
  getDb()
    .prepare(
      `UPDATE ebooks SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(...params);
  return publicEbook(getEbookRow(id));
}

export function removeEbook(ctx: AuthContext, id: number, deleteFile: boolean): void {
  requireAdmin(ctx);
  const row = getEbookRow(id);
  getDb().prepare(`DELETE FROM ebooks WHERE id = ?`).run(id);
  if (deleteFile && row.file_path) {
    try {
      fs.unlinkSync(row.file_path);
    } catch {
      // Arquivo pode não existir ou estar fora da pasta gerenciada — o registro já foi removido.
    }
  }
}

export function openEbookContent(ctx: AuthContext, id: number): EbookContent {
  const row = getEbookRow(id);
  if (ctx.user.role !== "admin" && row.status !== "publicado") {
    throw new Error("Ebook não disponível.");
  }
  if (!row.file_path) throw new Error("Ebook sem arquivo.");
  if (!fs.existsSync(row.file_path)) {
    throw new Error("Arquivo não encontrado no disco: " + row.file_path);
  }
  const format = detectFormat(row.file_path);
  if (format === "pdf") {
    const buf = fs.readFileSync(row.file_path);
    return { format, name: row.title, data: new Uint8Array(buf) };
  }
  return { format, name: row.title, data: fs.readFileSync(row.file_path, "utf-8") };
}

export interface UploadArgs {
  fileName: string;
  fileData: Uint8Array | ArrayBuffer;
  categoryId: number;
  title: string;
  kind: string;
  description: string;
  status?: EbookStatus;
}

export function uploadEbook(ctx: AuthContext, args: UploadArgs): Ebook {
  requireAdmin(ctx);
  const safe = sanitizeFilename(args.fileName);
  const ext = path.extname(safe).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Extensão não permitida (${ext || "nenhuma"}). Use PDF, HTML ou MD.`);
  }
  const bytes =
    args.fileData instanceof Uint8Array
      ? args.fileData
      : new Uint8Array(args.fileData);
  if (bytes.byteLength === 0) throw new Error("Arquivo vazio.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo maior que 200 MB não é suportado.");
  }
  const status =
    args.status && VALID_STATUS.includes(args.status) ? args.status : "rascunho";

  const dir = getEbooksDir();
  let final = path.join(dir, safe);
  let i = 1;
  while (fs.existsSync(final)) {
    const base = path.basename(safe, path.extname(safe));
    final = path.join(dir, `${base} (${i})${path.extname(safe)}`);
    i++;
  }
  fs.writeFileSync(final, Buffer.from(bytes));

  const info = getDb()
    .prepare(
      `INSERT INTO ebooks (category_id, title, kind, description, file_path, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      args.categoryId,
      args.title.trim() || path.basename(safe, path.extname(safe)),
      args.kind || null,
      args.description || null,
      final,
      status
    );
  return publicEbook(getEbookRow(Number(info.lastInsertRowid)));
}
