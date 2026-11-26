import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Upload, Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import type { Category, Ebook, EbookStatus } from "../../shared/types";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/auth";

const STATUS_CYCLE: EbookStatus[] = [
  "rascunho",
  "pronto",
  "publicado",
  "verificar",
];

const statusColors: Record<EbookStatus, string> = {
  rascunho: "bg-wip",
  pronto: "bg-ok",
  publicado: "bg-blue-500",
  verificar: "bg-off",
};

const themeClasses: Record<string, string> = {
  default: "bg-gradient-to-br from-spine to-spine2",
  alt: "bg-gradient-to-br from-[#245045] to-[#35705f]",
  dark: "bg-gradient-to-br from-[#2a2740] to-[#454063]",
  sand: "bg-gradient-to-br from-[#8a6a2f] to-[#b08a3e]",
};

export default function CategoryPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [category, setCategory] = useState<Category | null>(null);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [filter, setFilter] = useState<"all" | EbookStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const cats = await api.categories.list();
      const c = cats.find((x) => x.code === code);
      if (!c) {
        setError("Categoria não encontrada.");
        setCategory(null);
        return;
      }
      setCategory(c);
      const all = await api.ebooks.list(c.id);
      setEbooks(all);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  async function cycleStatus(ebook: Ebook) {
    const idx = STATUS_CYCLE.indexOf(ebook.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    try {
      const updated = await api.ebooks.setStatus(ebook.id, next);
      setEbooks((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {}
  }

  async function handleUpload(file: File) {
    if (!category) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const title = file.name.replace(/\.(pdf|html?|md)$/i, "");
      await api.ebooks.upload(file.name, buf, category.id, title, "Ebook", "");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  const visible =
    filter === "all" ? ebooks : ebooks.filter((e) => e.status === filter);

  if (loading)
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="text-xs font-mono text-gold">
            {category?.code ?? code}
          </div>
          <h1 className="text-2xl font-serif font-bold">
            {category?.title ?? "Categoria"}
          </h1>
          {category?.note && (
            <p className="text-sm text-muted-foreground italic mt-0.5">
              {category.note}
            </p>
          )}
        </div>
        {isAdmin && (
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.html,.htm,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="md" disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando..." : "Adicionar ebook"}
            </Button>
          </label>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          {(["all", ...STATUS_CYCLE] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize",
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              )}
            >
              {f === "all" ? "Todos" : f}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground italic py-12">
            Nenhum item para este filtro.
          </div>
        )}
        {visible.map((ebook) => {
          const theme = category?.theme ?? "default";
          return (
            <div
              key={ebook.id}
              className={cn(
                "relative rounded-r-md rounded-l-sm pl-3 min-h-[180px] flex flex-col justify-between text-paper p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all",
                themeClasses[theme] ?? themeClasses.default
              )}
              style={{
                boxShadow:
                  "-6px 0 0 rgba(0,0,0,.18) inset, 0 10px 22px -12px rgba(0,0,0,.5)",
              }}
            >
              <div>
                {ebook.kind && (
                  <div className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] opacity-80">
                    {ebook.kind}
                  </div>
                )}
                <div className="text-lg font-bold leading-tight mt-2 mb-1.5">
                  {ebook.title}
                </div>
                {ebook.description && (
                  <div className="text-xs leading-snug opacity-85 font-sans line-clamp-3">
                    {ebook.description}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-4">
                {isAdmin ? (
                  <button
                    onClick={() => cycleStatus(ebook)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-white cursor-pointer border-none",
                      statusColors[ebook.status]
                    )}
                    title="Clique para alternar status"
                  >
                    {ebook.status}
                  </button>
                ) : (
                  <span />
                )}
                {ebook.file_path ? (
                  <Link
                    to={`/read/${ebook.id}`}
                    className="text-xs font-semibold opacity-80 hover:opacity-100 hover:underline inline-flex items-center gap-1"
                  >
                    Abrir <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-xs opacity-50 italic">sem arquivo</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        Material educativo, sem indicação de conduta. Converse com seu médico
        antes de qualquer mudança.
      </p>
    </div>
  );
}