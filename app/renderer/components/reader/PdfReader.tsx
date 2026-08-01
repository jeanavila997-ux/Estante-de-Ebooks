import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfReader({
  data,
  initialProgress,
  onProgress,
}: {
  data: Uint8Array;
  /** 0–100, usado para restaurar a página ao abrir */
  initialProgress: number;
  onProgress: (percent: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // pdf.js transfere o buffer para o worker (fica "detached"): entrega uma
  // CÓPIA e memoiza para o Document não recarregar a cada re-render.
  const file = useMemo(() => ({ data: data.slice() }), [data]);

  useEffect(() => {
    if (!numPages) return;
    onProgress(Math.round((pageNumber / numPages) * 100));
  }, [pageNumber, numPages, onProgress]);

  function onDocLoad({ numPages: total }: { numPages: number }) {
    setNumPages(total);
    const restored = Math.round((initialProgress / 100) * total);
    setPageNumber(Math.min(total, Math.max(1, restored || 1)));
  }

  if (error)
    return <div className="text-destructive text-center max-w-md p-8">{error}</div>;

  return (
    <div className="h-full flex flex-col">
      {numPages > 0 && (
        <div className="border-b border-border bg-card px-5 py-2 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {pageNumber} de {numPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-auto scrollbar-thin bg-muted/30 grid place-items-center">
        <Document
          file={file}
          onLoadSuccess={onDocLoad}
          onLoadError={(e) => setError(e?.message ?? "Falha ao carregar PDF.")}
          loading={
            <div className="text-muted-foreground flex items-center gap-2 py-20">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          }
          className="py-6"
        >
          <Page
            pageNumber={pageNumber}
            className="shadow-lg"
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      </div>
    </div>
  );
}
