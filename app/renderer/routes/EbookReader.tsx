import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Info, Loader2 } from "lucide-react";
import type { EbookContent } from "../../shared/types";
import { Button } from "../components/ui/Button";
import { api } from "../lib/api";
import PdfReader from "../components/reader/PdfReader";
import HtmlReader from "../components/reader/HtmlReader";
import MarkdownReader from "../components/reader/MarkdownReader";

export default function EbookReader() {
  const { ebookId } = useParams();
  const id = Number(ebookId);
  const [content, setContent] = useState<EbookContent | null>(null);
  const [initialProgress, setInitialProgress] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const progressRef = useRef<number>(0);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setError("Ebook inválido.");
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setContent(null);
    setError(null);
    Promise.all([api.ebooks.openContent(id), api.dashboard.getProgress(id)])
      .then(([res, saved]) => {
        if (!alive) return;
        setInitialProgress(saved);
        setProgress(saved);
        progressRef.current = saved;
        setContent(res);
      })
      .catch((e: Error) => {
        if (!alive) return;
        const msg = e?.message ?? "";
        if (/não encontrado/i.test(msg)) {
          setNotFound(true);
        }
        setError(msg || "Erro ao abrir ebook.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  // Grava o progresso com debounce (1s) durante a leitura...
  const saveProgress = useCallback(
    async (percent: number) => {
      try {
        await api.dashboard.setProgress(id, percent);
      } catch {
        // Falha silenciosa: o progresso continua em memória.
      }
    },
    [id]
  );

  const handleProgress = useCallback(
    (percent: number) => {
      setProgress(percent);
      progressRef.current = percent;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveProgress(percent).catch(() => {});
      }, 1000);
    },
    [id, saveProgress]
  );

  useEffect(
    () => () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      // ...e salva imediatamente ao desmontar o leitor.
      const current = progressRef.current;
      if (Number.isFinite(id) && id > 0 && current > 0) {
        saveProgress(current);
      }
    },
    [id, saveProgress]
  );

  return (
    <div className="h-full flex flex-col">
      <header className="border-b border-border bg-card px-5 py-3 flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{content?.name || "Leitor"}</div>
          {content && (
            <div className="text-xs text-muted-foreground uppercase">
              {content.format} · {progress}% lido
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col">
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-20">
            <Loader2 className="h-5 w-5 animate-spin" /> Carregando ebook...
          </div>
        )}
        {notFound && (
          <div className="text-center max-w-md mx-auto p-8 space-y-4">
            <div className="text-xl font-semibold">Ebook não encontrado</div>
            <div className="text-sm text-muted-foreground">
              O ebook solicitado não existe ou não está disponível para você.
            </div>
            <Link to="/">
              <Button variant="outline">Voltar ao Dashboard</Button>
            </Link>
          </div>
        )}
        {error && !notFound && (
          <div className="text-destructive text-center max-w-md mx-auto p-8">
            {error}
          </div>
        )}
        {content && !error && content.format === "pdf" && (
          <PdfReader
            data={content.data as Uint8Array}
            title={content.name}
            initialProgress={initialProgress}
            onProgress={handleProgress}
          />
        )}
        {content && !error && content.format === "html" && (
          <HtmlReader
            content={content.data as string}
            title={content.name}
            initialProgress={initialProgress}
            onProgress={handleProgress}
          />
        )}
        {content && !error && content.format === "md" && (
          <MarkdownReader
            content={content.data as string}
            title={content.name}
            initialProgress={initialProgress}
            onProgress={handleProgress}
          />
        )}
      </div>

      <div
        role="note"
        className="flex-none border-t border-border bg-card px-5 py-2 text-xs text-muted-foreground flex items-center gap-2"
      >
        <Info className="h-4 w-4 shrink-0" />
        Leitura educativa. Não indicamos, não prescrevemos e não diagnosticamos
        — a decisão é única e exclusivamente do seu médico.
      </div>
    </div>
  );
}
