import { IpcMain } from "electron";
import { authenticate } from "./auth-context";
import * as dashboard from "../services/dashboard.service";

export function registerDashboardIpc(ipc: IpcMain) {
  ipc.handle("dashboard:stats", async (_evt, token: string) =>
    dashboard.getDashboardStats(authenticate(token))
  );

  ipc.handle(
    "dashboard:setProgress",
    async (_evt, token: string, ebookId: number, progress: number) =>
      dashboard.setProgress(authenticate(token), ebookId, progress)
  );

  ipc.handle(
    "dashboard:getProgress",
    async (_evt, token: string, ebookId: number) =>
      dashboard.getProgress(authenticate(token), ebookId)
  );
}
