# Copilot Instructions — Estante de Ebooks (EstanteApp)

Electron desktop app (React + TypeScript renderer, Node/Electron main process) for
cataloging and reading ebooks, backed by a local SQLite database.

## Build & run commands

- `npm run build` — full production build. Runs `build:main` (compiles `main/` + `shared/`
  via `tsconfig.main.json` → `dist/main/`) then `build:renderer` (typechecks via
  `tsconfig.json`, then `vite build` → `dist/renderer/`). Both steps must succeed;
  there is no bundler for the main process, so main-process code must stay plain
  CommonJS-compatible TS (no bundler-only syntax).
- `npm run dev` — runs `dev:main` (`tsc --watch` on `tsconfig.main.json`) and `dev:renderer`
  (Vite dev server on port 5173, `strictPort: true`) concurrently via `concurrently`.
- `npm run typecheck` — `tsc --noEmit` against both `tsconfig.main.json` (main) and
  `tsconfig.json` (renderer). Run this after any change — there is no test suite,
  so typecheck + build are the primary correctness signals.
- `npm start` — build then `electron .` (production-style launch).
- `npm run electron:dev` — build then launch Electron with `NODE_ENV=development` (loads
  `http://localhost:5173` instead of `dist/renderer/index.html` — needs the Vite dev server
  running separately, or use `npm run dev` + a manual `electron .` in dev env).
- `npm run dist` — build then `electron-builder` (produces a Windows NSIS installer into
  `release/`).
- There is no configured ESLint and no test runner — don't assume either is set up.
- Requires Electron 35+ (bundles Node 22.14+): the DB uses Node's built-in `node:sqlite`,
  which does not exist in the Node 20 bundled by Electron ≤ 31.

## Architecture

Two separate TypeScript projects compiled independently, joined only by `shared/`:

- **`main/`** — Electron main process, compiled with `tsconfig.main.json` (CommonJS, target
  `dist/main/main/`). Owns the SQLite DB, auth/session logic, business services, and all
  IPC handlers.
  - `main/main.ts` — creates the `BrowserWindow`, calls `initDatabase()` +
    `seedIfEmpty()` on `app.whenReady()`, then registers every `register*Ipc(ipcMain)`
    function from `main/ipc/*.ipc.ts`.
  - `main/config.ts` — per-install config (`config.json` under Electron `userData`):
    DB path, ebooks dir, and a randomly generated JWT secret. Env vars always win
    (`ESTANTE_DB_PATH`, `ESTANTE_EBOOKS_DIR`, `ESTANTE_JWT_SECRET`, `ESTANTE_USER_DATA`).
    `ESTANTE_USER_DATA` lets everything run outside Electron (tests / future server) —
    `electron` is only `require`d lazily when that env var is absent.
  - `main/db/connection.ts` — opens a single `DatabaseSync` (from Node's built-in
    `node:sqlite`, not `better-sqlite3`) at the path resolved by `main/config.ts`.
    `getDb()` throws if called before `initDatabase()`.
  - `main/db/schema.ts` — raw `CREATE TABLE IF NOT EXISTS` SQL run on every startup
    (no migration system — schema changes are additive `ALTER`/`CREATE` statements added
    here).
  - `main/db/seed.ts` — creates the default admin user (`ADMIN` / `201502`) only if the
    `users` table is empty, and seeds ebook categories from a hardcoded `SEED` array.
    Admin password is only reset when `ESTANTE_RESET_ADMIN=1` (emergency recovery).
  - `main/auth/index.ts` — bcrypt hashing + JWT signing/verification + a `sessions` table
    for token revocation/expiry (30-day TTL). JWT secret comes from `main/config.ts`.
  - `main/services/*.service.ts` — **all business logic lives here** as pure functions
    `(ctx: AuthContext, args) => result` that never import `electron`. This is deliberate:
    the future VPS HTTP API will reuse these services as-is. Role-based visibility is
    enforced here (non-admin users only ever see ebooks with status `publicado`).
  - `main/ipc/auth-context.ts` — `authenticate(token)` (throws if token missing/expired)
    and `requireAdmin(ctx)` are the auth guards composed by services/handlers.
  - `main/ipc/*.ipc.ts` — thin adapters: one file per feature area (`auth`, `users`,
    `ebooks`, `categories`, `dashboard`, `settings`), each exporting a single
    `register<Feature>Ipc(ipc: IpcMain)` that calls `ipc.handle("feature:action", ...)`,
    authenticates the token and delegates to the matching service.
  - `main/preload.ts` — the only bridge to the renderer, via
    `contextBridge.exposeInMainWorld("api", api)`. `contextIsolation: true`,
    `nodeIntegration: false` — the renderer has **zero** direct Node/Electron access.

- **`renderer/`** — React 18 SPA, compiled with `tsconfig.json` (bundler
  resolution, path aliases `@/*` → `renderer/*` and `@shared/*` → `shared/*`), built by
  Vite (`vite.config.ts`, root `renderer/`, output `dist/renderer/`).
  - `renderer/lib/api-types.ts` declares the global `window.api` shape (must mirror
    `preload.ts` exactly) via `declare global { interface Window { api: EstanteApi } }`.
  - `renderer/lib/api.ts` wraps every `window.api.*` call, injecting the auth token from
    `useAuthStore` automatically — **UI code should call `api.foo.bar(...)` from
    `renderer/lib/api.ts`, never `window.api` directly**, so the token plumbing stays in
    one place.
  - `renderer/store/auth.ts` and `renderer/store/theme.ts` — Zustand stores with the
    `persist` middleware (localStorage-backed). `useBootstrap()`
    (`renderer/lib/useBootstrap.ts`) runs once at app start to re-validate the persisted
    token against `auth:me` and to apply the persisted theme to `<html>`.
  - `renderer/App.tsx` — React Router routes; a `Protected` wrapper redirects to `/login`
    when there's no token (client-side only — the real enforcement is the `authenticate()`
    check on every IPC handler in `main/`).
  - Ebook files are read entirely in the main process (`ebooks:openContent`) and passed
    to the renderer over IPC as `{ format: "pdf" | "html" | "md", name, data }` — PDF as
    `Uint8Array`, HTML/MD as UTF-8 strings. There is no `file://` loading in the renderer.
    HTML and Markdown are sanitized with DOMPurify before rendering
    (`renderer/components/reader/`); Markdown is parsed with `marked`.
  - `renderer/routes/Admin.tsx` (admin-only, guarded by `RequireAdmin` in `App.tsx`) is
    the content-management page: multi-file import dropzone, metadata editing, status
    control, and category CRUD/reordering.

- **`shared/types.ts`** — the only module imported by both `main/` and `renderer/`
  (domain types: `User`, `Ebook`, `Category`, `DashboardStats`, etc.). Add new
  cross-boundary types here so both TS projects (and both `tsconfig.*.json` includes)
  pick them up.

## Conventions

- IPC channel names are `"<feature>:<action>"` strings (e.g. `"ebooks:setStatus"`,
  `"dashboard:setProgress"`) — keep this convention for new channels, and register new
  handlers in a new `main/ipc/<feature>.ipc.ts` exporting `register<Feature>Ipc`, then wire
  it into `registerAllIpc()` in `main/main.ts`.
- Every IPC handler takes `token: string` as its first argument (checked via
  `authenticate(token)`); add `requireAdmin(ctx)` for admin-only actions.
- All user-facing strings (errors, seed data, UI copy) are in Portuguese (pt-BR) — match
  this when adding new strings.
- Ebook status is a fixed enum: `"rascunho" | "pronto" | "publicado" | "verificar"`
  (also enforced by a SQL `CHECK` constraint in `schema.ts`) — keep the TS type in
  `shared/types.ts`, the SQL check, and any UI status maps in sync if it changes.
- Path aliases: use `@/*` for `renderer/*` and `@shared/*` for `shared/*` in renderer code
  (configured in both `tsconfig.json` and `vite.config.ts`); `main/` code uses
  relative imports plus `@shared/*` (configured in `tsconfig.main.json`) since it isn't
  bundled.
- Default login is `ADMIN` / `201502` (see `main/db/seed.ts`); the DB is a single local
  SQLite file, not shared/networked — there's no multi-instance or server concern here.
- Ebook status doubles as client visibility: `publicado` = visible to `user` role;
  `rascunho`/`pronto`/`verificar` are admin-internal. Enforce this in services, not just UI.
