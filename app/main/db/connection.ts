import { DatabaseSync } from "node:sqlite";
import { getDbPath } from "../config";
import { SCHEMA_SQL } from "./schema";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) throw new Error("DB não inicializado. Chame initDatabase() antes.");
  return db;
}

export function initDatabase() {
  const dbPath = getDbPath();
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(SCHEMA_SQL);

  console.log(`[db] aberto: ${dbPath}`);
}

export function closeDatabase() {
  try {
    db?.close();
  } catch {}
  db = null;
}