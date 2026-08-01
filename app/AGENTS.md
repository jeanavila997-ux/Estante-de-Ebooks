# AGENTS.md — EstanteApp

> Compact instructions for OpenCode working on this Electron + React 18 + TypeScript + Vite desktop app. Read this first.

## Project layout

- `main/` — Electron main process + business logic.
  - `main.ts` — window creation, IPC registration, dev/prod loading.
  - `config.ts` — paths, JWT secret; supports env overrides for server/VPS reuse.
  - `db/connection.ts` — `node:sqlite` (`DatabaseSync`) with WAL + FK; must call `initDatabase()` before use.
  - `services/*.service.ts` — pure business logic; **must never import `electron`**.
  - `ipc/*.ipc.ts` — thin IPC adapters over services; only place that touches `ipcMain`.
  - `preload.ts` — exposes `window.api` to renderer via `contextBridge`.
- `renderer/` — React 18 + Vite renderer process.
  - `lib/api.ts` — the **only** file that calls `window.api`; all components go through it.
  - `main.tsx` / `App.tsx` — entry + React Router routes (hash router).
  - `store/` — Zustand stores (auth, theme), persisted to `localStorage`.
- `shared/types.ts` — shared TypeScript types between main and renderer.
- `mobile/` — local PWA companion server (`server.cjs`), started by the `.bat` launchers.
- `resources/icon.ico` — installer + desktop shortcut icon.

## Commands that matter

| Task | Command |
|------|---------|
| Install deps | `npm install --legacy-peer-deps` |
| Type-check both sides | `npm run typecheck` |
| Build both sides | `npm run build` |
| Dev (main watch + Vite) | `npm run dev` |
| Start Electron in dev mode | `npm run electron:dev` |
| Run compiled app | `npx electron .` |
| Build installer (NSIS) | `npm run dist` → output `release/` |
| Launch desktop + iPhone server | `ABRIR-ESTANTE.bat` (builds first if needed) |

### Verification order before reporting work done

```text
npm run typecheck && npm run build
```

No tests currently exist; if you add them, place them under the natural package they exercise and wire into `package.json`.

## Build notes

- `tsconfig.main.json` emits CommonJS to `dist/main/`; `vite.config.ts` bundles renderer into `dist/renderer/`.
- `package.json` `main` points to `dist/main/main/main.js` (Electron loads this).
- Dev mode loads `http://localhost:5173`; production loads `dist/renderer/index.html` from `__dirname/../..`.
- Vite warning about large chunks >500 kB is expected (PDF worker); not an error.

## Data & environment

Runtime data lives under `%APPDATA%/estante-app/` (or `ESTANTE_USER_DATA`):

- `config.json` — db path, ebooks directory, JWT secret.
- `estante.db` — SQLite database (WAL mode).
- `ebooks/` — imported ebook files.

### Env vars (all optional)

| Var | Purpose |
|-----|---------|
| `ESTANTE_DB_PATH` | SQLite file path |
| `ESTANTE_EBOOKS_DIR` | Ebook storage directory |
| `ESTANTE_JWT_SECRET` | JWT secret (set on server) |
| `ESTANTE_USER_DATA` | Base config dir (enables non-Electron/server mode) |
| `ESTANTE_RESET_ADMIN=1` | Resets ADMIN password to `201502` on next boot |
| `ESTANTE_DEBUG=1` | Mirrors renderer console logs to terminal |
| `ESTANTE_DEBUG_OPEN=<id>` | Auto-logs in as ADMIN and opens ebook reader for that id |

Legacy compatibility: if `D:\DOWNLOADS\BANCO DE DADOS\estante.db` or `D:\DOWNLOADS\Ebooks` exist, they are adopted automatically on first run.

## Architecture rules to preserve

1. **Services are Electron-free.** `main/services/*.ts` must not import `electron`; they take `(AuthContext, args)` and return plain data.
2. **Renderer does not touch `window.api` directly.** Always route IPC calls through `renderer/lib/api.ts` so the PWA/web migration stays easy.
3. **Auth boundary.** `main/ipc/auth-context.ts` builds `AuthContext` from the token; `requireAdmin(ctx)` guards admin-only flows.
4. **Role visibility.** Non-admin users only see ebooks with `status = 'publicado'`; this is enforced in the service layer.

## Key constraints

- **React must stay at v18.** `react-router-dom` is pinned at `^6.30.4`; v7/v8 require React ≥19.
- **`node:sqlite` requires Node 22.5+ / Electron 35+.** Do not downgrade Electron below v35.
- Native module `canvas` is pulled by `react-pdf`; if install scripts are blocked, approve them with `npm approve-scripts canvas electron-winstaller`.
- The lockfile may need `--legacy-peer-deps` because of React 18 peer constraints.

## Gotchas

- `initDatabase()` must run before any service call; Electron's `main.ts` calls it in `bootstrap()` and then `seedIfEmpty()`.
- Default login: **ADMIN** / **201502**. Change it after first login.
- The `.bat` launchers compile on first run if `dist\main\main\db\connection.js` is missing.
- Mobile PWA currently runs only on the local network via the `mobile/server.cjs` server.

## Roadmap context

`PLANO-PWA.md` describes migrating to a VPS-backed PWA. Preserve the two reuse rules above and the migration is straightforward.
