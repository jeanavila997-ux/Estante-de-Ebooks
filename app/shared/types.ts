export type Role = "admin" | "user";

export interface User {
  id: number;
  username: string;
  email: string | null;
  role: Role;
  theme: "light" | "dark";
  created_at: string;
  last_login: string | null;
}

export type EbookStatus =
  | "rascunho"
  | "pronto"
  | "publicado"
  | "verificar";

export interface Category {
  id: number;
  code: string;
  title: string;
  note: string | null;
  theme: string | null;
  sort_order: number;
}

export interface Ebook {
  id: number;
  category_id: number;
  title: string;
  kind: string | null;
  description: string | null;
  file_path: string | null;
  cover_color: string | null;
  status: EbookStatus;
  created_at: string;
  updated_at: string;
}

export type EbookFormat = "pdf" | "html" | "md";

export interface EbookContent {
  format: EbookFormat;
  name: string;
  /** PDF chega como Uint8Array; HTML/MD como string UTF-8. */
  data: Uint8Array | string;
}

export interface EbookUpdate {
  title?: string;
  kind?: string | null;
  description?: string | null;
  category_id?: number;
  status?: EbookStatus;
  cover_color?: string | null;
}

export interface CategoryInput {
  code: string;
  title: string;
  note?: string | null;
  theme?: string | null;
}

export interface EbookWithCategory extends Ebook {
  category_code?: string;
  category_title?: string;
}

export interface UserEbookProgress {
  user_id: number;
  ebook_id: number;
  progress: number;
  last_read: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  total: number;
  pronto: number;
  rascunho: number;
  publicado: number;
  verificar: number;
  categories: {
    id: number;
    code: string;
    title: string;
    note: string | null;
    theme: string | null;
    count: number;
  }[];
  reading: {
    ebook_id: number;
    title: string;
    progress: number;
    category_code: string;
  }[];
}