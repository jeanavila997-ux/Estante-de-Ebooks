import { IpcMain } from "electron";
import { authenticate } from "./auth-context";
import * as ebooks from "../services/ebooks.service";
import type { EbookStatus, EbookUpdate } from "../../shared/types";

export function registerEbooksIpc(ipc: IpcMain) {
  ipc.handle("ebooks:list", async (_evt, token: string, categoryId?: number) =>
    ebooks.listEbooks(authenticate(token), categoryId)
  );

  ipc.handle(
    "ebooks:setStatus",
    async (_evt, token: string, id: number, status: string) =>
      ebooks.setEbookStatus(authenticate(token), id, status)
  );

  ipc.handle(
    "ebooks:update",
    async (_evt, token: string, id: number, patch: EbookUpdate) =>
      ebooks.updateEbook(authenticate(token), id, patch)
  );

  ipc.handle(
    "ebooks:remove",
    async (_evt, token: string, id: number, deleteFile: boolean) =>
      ebooks.removeEbook(authenticate(token), id, !!deleteFile)
  );

  ipc.handle("ebooks:openContent", async (_evt, token: string, id: number) =>
    ebooks.openEbookContent(authenticate(token), id)
  );

  ipc.handle(
    "ebooks:upload",
    async (
      _evt,
      token: string,
      fileName: string,
      fileData: ArrayBuffer | Uint8Array,
      categoryId: number,
      title: string,
      kind: string,
      description: string,
      status?: EbookStatus
    ) =>
      ebooks.uploadEbook(authenticate(token), {
        fileName,
        fileData,
        categoryId,
        title,
        kind,
        description,
        status,
      })
  );
}
