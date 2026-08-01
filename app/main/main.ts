import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import { registerAuthIpc } from "./ipc/auth.ipc";
import { registerUsersIpc } from "./ipc/users.ipc";
import { registerEbooksIpc } from "./ipc/ebooks.ipc";
import { registerCategoriesIpc } from "./ipc/categories.ipc";
import { registerDashboardIpc } from "./ipc/dashboard.ipc";
import { registerSettingsIpc } from "./ipc/settings.ipc";
import { initDatabase } from "./db/connection";
import { seedIfEmpty } from "./db/seed";

const isDev = !!process.env.NODE_ENV && process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;

async function bootstrap() {
  initDatabase();
  await seedIfEmpty();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#e9e2d0",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Diagnóstico: ESTANTE_DEBUG=1 espelha o console do renderer no terminal.
  if (process.env.ESTANTE_DEBUG === "1") {
    mainWindow.webContents.on("console-message", (_e, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on("did-fail-load", (_e, code, desc, url) => {
      console.log(`[renderer] did-fail-load ${code} ${desc} ${url}`);
    });
  }

  // ESTANTE_DEBUG_OPEN=<id> loga como ADMIN e abre o leitor do ebook <id>.
  const debugOpen = process.env.ESTANTE_DEBUG_OPEN;
  if (debugOpen) {
    mainWindow.webContents.once("did-finish-load", async () => {
      try {
        const { getUserByUsername, signToken, saveSession, publicUser } =
          await import("./auth");
        const u = getUserByUsername("ADMIN");
        if (!u) throw new Error("ADMIN não existe");
        const token = signToken({ sub: u.id, username: u.username, role: u.role });
        saveSession(token, u.id);
        const persisted = JSON.stringify({
          state: { token, user: publicUser(u) },
          version: 0,
        });
        mainWindow!.webContents.once("did-finish-load", () => {
          void mainWindow!.webContents.executeJavaScript(
            `console.log("[boot] hash=", location.hash);` +
              `window.addEventListener("hashchange", () => console.log("[hashchange] ->", location.hash));`
          );
        });
        await mainWindow!.webContents.executeJavaScript(
          `localStorage.setItem("estante-auth", ${JSON.stringify(persisted)});` +
            `location.hash = "#/read/${Number(debugOpen)}"; location.reload();`
        );
        console.log(`[debug] aberto leitor do ebook ${debugOpen}`);
        const probeAt = (ms: number) =>
          setTimeout(async () => {
            try {
              const probe = await mainWindow!.webContents.executeJavaScript(`
                JSON.stringify({
                  t: ${ms},
                  hash: location.hash,
                  canvases: document.querySelectorAll("canvas").length,
                  readerContent: !!document.querySelector(".reader-content"),
                  texto: document.body.innerText.replace(/\\s+/g, " ").slice(0, 300),
                })
              `);
              console.log(`[debug] probe: ${probe}`);
            } catch (e) {
              console.log("[debug] probe falhou:", e);
            }
          }, ms);
        probeAt(3000);
        probeAt(9000);
      } catch (e) {
        console.log("[debug] falha:", e);
      }
    });
  }

  if (isDev) {
    // Em dev, carrega Vite dev server (porta 5173)
    void mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // __dirname = dist/main/main → index.html fica em dist/renderer
    void mainWindow.loadFile(
      path.join(__dirname, "..", "..", "renderer", "index.html")
    );
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerAllIpc() {
  registerAuthIpc(ipcMain);
  registerUsersIpc(ipcMain);
  registerEbooksIpc(ipcMain);
  registerCategoriesIpc(ipcMain);
  registerDashboardIpc(ipcMain);
  registerSettingsIpc(ipcMain);
}

app.whenReady().then(async () => {
  await bootstrap();
  Menu.setApplicationMenu(null);
  registerAllIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});