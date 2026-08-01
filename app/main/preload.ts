import { contextBridge, ipcRenderer } from "electron";

const api = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke("auth:login", username, password),
    me: (token: string) => ipcRenderer.invoke("auth:me", token),
    logout: (token: string) => ipcRenderer.invoke("auth:logout", token),
  },
  categories: {
    list: (token: string) => ipcRenderer.invoke("categories:list", token),
    create: (token: string, input: unknown) =>
      ipcRenderer.invoke("categories:create", token, input),
    update: (token: string, id: number, input: unknown) =>
      ipcRenderer.invoke("categories:update", token, id, input),
    countEbooks: (token: string, id: number) =>
      ipcRenderer.invoke("categories:countEbooks", token, id),
    remove: (token: string, id: number) =>
      ipcRenderer.invoke("categories:remove", token, id),
    reorder: (token: string, orderedIds: number[]) =>
      ipcRenderer.invoke("categories:reorder", token, orderedIds),
  },
  ebooks: {
    list: (token: string, categoryId?: number) =>
      ipcRenderer.invoke("ebooks:list", token, categoryId),
    setStatus: (token: string, id: number, status: string) =>
      ipcRenderer.invoke("ebooks:setStatus", token, id, status),
    update: (token: string, id: number, patch: unknown) =>
      ipcRenderer.invoke("ebooks:update", token, id, patch),
    remove: (token: string, id: number, deleteFile: boolean) =>
      ipcRenderer.invoke("ebooks:remove", token, id, deleteFile),
    openContent: (token: string, id: number) =>
      ipcRenderer.invoke("ebooks:openContent", token, id),
    upload: (
      token: string,
      fileName: string,
      fileData: ArrayBuffer,
      categoryId: number,
      title: string,
      kind: string,
      description: string,
      status?: string
    ) =>
      ipcRenderer.invoke(
        "ebooks:upload",
        token,
        fileName,
        fileData,
        categoryId,
        title,
        kind,
        description,
        status
      ),
  },
  dashboard: {
    stats: (token: string) => ipcRenderer.invoke("dashboard:stats", token),
    setProgress: (token: string, ebookId: number, progress: number) =>
      ipcRenderer.invoke("dashboard:setProgress", token, ebookId, progress),
    getProgress: (token: string, ebookId: number) =>
      ipcRenderer.invoke("dashboard:getProgress", token, ebookId),
  },
  users: {
    list: (token: string) => ipcRenderer.invoke("users:list", token),
    create: (
      token: string,
      username: string,
      password: string,
      email: string | null,
      role: "admin" | "user"
    ) =>
      ipcRenderer.invoke("users:create", token, username, password, email, role),
    remove: (token: string, id: number) =>
      ipcRenderer.invoke("users:remove", token, id),
  },
  settings: {
    setTheme: (token: string, theme: "light" | "dark") =>
      ipcRenderer.invoke("settings:setTheme", token, theme),
    changePassword: (token: string, current: string, next: string) =>
      ipcRenderer.invoke("settings:changePassword", token, current, next),
  },
};

contextBridge.exposeInMainWorld("api", api);