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

interface EstanteApi {
  auth: {
    login: (username: string, password: string) => Promise<AuthResponse>;
    me: (token: string) => Promise<User>;
    logout: (token: string) => Promise<void>;
  };
  categories: {
    list: (token: string) => Promise<Category[]>;
    create: (token: string, input: CategoryInput) => Promise<Category>;
    update: (
      token: string,
      id: number,
      input: Partial<CategoryInput>
    ) => Promise<Category>;
    countEbooks: (token: string, id: number) => Promise<number>;
    remove: (token: string, id: number) => Promise<void>;
    reorder: (token: string, orderedIds: number[]) => Promise<Category[]>;
  };
  ebooks: {
    list: (token: string, categoryId?: number) => Promise<Ebook[]>;
    setStatus: (token: string, id: number, status: EbookStatus) => Promise<Ebook>;
    update: (token: string, id: number, patch: EbookUpdate) => Promise<Ebook>;
    remove: (token: string, id: number, deleteFile: boolean) => Promise<void>;
    openContent: (token: string, id: number) => Promise<EbookContent>;
    upload: (
      token: string,
      fileName: string,
      fileData: ArrayBuffer,
      categoryId: number,
      title: string,
      kind: string,
      description: string,
      status?: EbookStatus
    ) => Promise<Ebook>;
  };
  dashboard: {
    stats: (token: string) => Promise<DashboardStats>;
    setProgress: (token: string, ebookId: number, progress: number) => Promise<void>;
    getProgress: (token: string, ebookId: number) => Promise<number>;
  };
  users: {
    list: (token: string) => Promise<User[]>;
    create: (
      token: string,
      username: string,
      password: string,
      email: string | null,
      role: "admin" | "user"
    ) => Promise<User>;
    remove: (token: string, id: number) => Promise<void>;
  };
  settings: {
    setTheme: (token: string, theme: "light" | "dark") => Promise<void>;
    changePassword: (token: string, current: string, next: string) => Promise<void>;
  };
}

declare global {
  interface Window {
    api: EstanteApi;
  }
}

export {};
