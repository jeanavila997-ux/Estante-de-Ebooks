import { useAuthStore } from "../store/auth";
import type {
  AuthResponse,
  Category,
  CategoryInput,
  DashboardStats,
  Ebook,
  EbookContent,
  EbookStatus,
  EbookUpdate,
  User,
} from "../../shared/types";

function token(): string {
  const t = useAuthStore.getState().token;
  if (!t) throw new Error("Não autenticado.");
  return t;
}

export const api = {
  auth: {
    login: (username: string, password: string): Promise<AuthResponse> =>
      window.api.auth.login(username, password),
    me: (): Promise<User> => window.api.auth.me(token()),
    logout: (): Promise<void> => window.api.auth.logout(token()),
  },
  categories: {
    list: (): Promise<Category[]> => window.api.categories.list(token()),
    create: (input: CategoryInput): Promise<Category> =>
      window.api.categories.create(token(), input),
    update: (id: number, input: Partial<CategoryInput>): Promise<Category> =>
      window.api.categories.update(token(), id, input),
    countEbooks: (id: number): Promise<number> =>
      window.api.categories.countEbooks(token(), id),
    remove: (id: number): Promise<void> =>
      window.api.categories.remove(token(), id),
    reorder: (orderedIds: number[]): Promise<Category[]> =>
      window.api.categories.reorder(token(), orderedIds),
  },
  ebooks: {
    list: (categoryId?: number): Promise<Ebook[]> =>
      window.api.ebooks.list(token(), categoryId),
    setStatus: (id: number, status: EbookStatus): Promise<Ebook> =>
      window.api.ebooks.setStatus(token(), id, status),
    update: (id: number, patch: EbookUpdate): Promise<Ebook> =>
      window.api.ebooks.update(token(), id, patch),
    remove: (id: number, deleteFile: boolean): Promise<void> =>
      window.api.ebooks.remove(token(), id, deleteFile),
    openContent: (id: number): Promise<EbookContent> =>
      window.api.ebooks.openContent(token(), id),
    upload: (
      fileName: string,
      fileData: ArrayBuffer,
      categoryId: number,
      title: string,
      kind: string,
      description: string,
      status?: EbookStatus
    ): Promise<Ebook> =>
      window.api.ebooks.upload(
        token(),
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
    stats: (): Promise<DashboardStats> => window.api.dashboard.stats(token()),
    setProgress: (ebookId: number, progress: number): Promise<void> =>
      window.api.dashboard.setProgress(token(), ebookId, progress),
    getProgress: (ebookId: number): Promise<number> =>
      window.api.dashboard.getProgress(token(), ebookId),
  },
  users: {
    list: (): Promise<User[]> => window.api.users.list(token()),
    create: (
      username: string,
      password: string,
      email: string | null,
      role: "admin" | "user"
    ): Promise<User> =>
      window.api.users.create(token(), username, password, email, role),
    remove: (id: number): Promise<void> => window.api.users.remove(token(), id),
  },
  settings: {
    setTheme: (theme: "light" | "dark"): Promise<void> =>
      window.api.settings.setTheme(token(), theme),
    changePassword: (current: string, next: string): Promise<void> =>
      window.api.settings.changePassword(token(), current, next),
  },
};
