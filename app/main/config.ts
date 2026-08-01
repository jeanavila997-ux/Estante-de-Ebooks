import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

/**
 * Configuração persistente da instalação (caminho do banco, pasta de ebooks,
 * segredo JWT). Vive em <userData>/config.json. Env vars sempre vencem, para
 * permitir rodar fora do Electron (ex.: futura API no VPS).
 */

export interface AppConfig {
  dbPath: string;
  ebooksDir: string;
  jwtSecret: string;
}

// Caminhos usados pelas primeiras versões — adotados se já existirem.
const LEGACY_DB_PATH = "D:\\DOWNLOADS\\BANCO DE DADOS\\estante.db";
const LEGACY_EBOOKS_DIR = "D:\\DOWNLOADS\\Ebooks";

let cached: AppConfig | null = null;

function userDataDir(): string {
  if (process.env.ESTANTE_USER_DATA) return process.env.ESTANTE_USER_DATA;
  // require tardio: fora do Electron (testes/servidor) o módulo não existe.
  const { app } = require("electron");
  return app.getPath("userData");
}

function configFilePath(): string {
  return path.join(userDataDir(), "config.json");
}

function readConfigFile(): Partial<AppConfig> {
  try {
    const raw = fs.readFileSync(configFilePath(), "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeConfigFile(cfg: AppConfig) {
  try {
    fs.mkdirSync(path.dirname(configFilePath()), { recursive: true });
    fs.writeFileSync(configFilePath(), JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.warn("[config] não foi possível gravar config.json:", err);
  }
}

export function getConfig(): AppConfig {
  if (cached) return cached;

  const stored = readConfigFile();
  const base = userDataDir();

  let dbPath =
    process.env.ESTANTE_DB_PATH ||
    stored.dbPath ||
    (fs.existsSync(LEGACY_DB_PATH) ? LEGACY_DB_PATH : "") ||
    path.join(base, "estante.db");

  let ebooksDir =
    process.env.ESTANTE_EBOOKS_DIR ||
    stored.ebooksDir ||
    (fs.existsSync(LEGACY_EBOOKS_DIR) ? LEGACY_EBOOKS_DIR : "") ||
    path.join(base, "ebooks");

  const jwtSecret =
    process.env.ESTANTE_JWT_SECRET ||
    stored.jwtSecret ||
    crypto.randomBytes(32).toString("hex");

  cached = { dbPath, ebooksDir, jwtSecret };

  // Persiste apenas o que não veio de env, para o valor ficar estável entre boots.
  writeConfigFile({
    dbPath: process.env.ESTANTE_DB_PATH ? stored.dbPath || dbPath : dbPath,
    ebooksDir: process.env.ESTANTE_EBOOKS_DIR
      ? stored.ebooksDir || ebooksDir
      : ebooksDir,
    jwtSecret: process.env.ESTANTE_JWT_SECRET
      ? stored.jwtSecret || jwtSecret
      : jwtSecret,
  });

  return cached;
}

export function getDbPath(): string {
  const p = getConfig().dbPath;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export function getEbooksDir(): string {
  const dir = getConfig().ebooksDir;
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getJwtSecret(): string {
  return getConfig().jwtSecret;
}
