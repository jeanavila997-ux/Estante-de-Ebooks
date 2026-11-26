import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";
import PagedReader from "./PagedReader";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfReader({
  data,
  title,
  initialProgress,
  onProgress,
}: {
  data: Uint8Array;
  title: string;
  /** 0–100, usado para restaurar a página ao abrir */
  initialProgress: number;
  onProgress: (percent: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  // Proporção (largura/altura) de cada página, medida quando ela carrega.
  const [aspects, setAspects] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);

  // pdf.js transfere o buffer para o worker (fica "detached"): entrega uma
  // CÓPIA e memoiza para o Document não recarregar a cada re-render.
  const file = useMemo(() => ({ data: data.slice() }), [data]);

  if (error)
    return <div className="text-destructive text-center max-w-md p-8">{error}</div>;

  return (
    <Document
      file={file}
      onLoadSuccess={({ numPages: total }: { numPages: number }) => setNumPages(total)}
      onLoadError={(e) => setError(e?.message ?? "Falha ao carregar PDF.")}
      loading={
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
        </div>
      }
      className="flex flex-1 min-h-0 flex-col"
    >
      <PagedReader
        title={title}
        pageCount={numPages}
        renderPage={(i, box) => {
          // Cabe na folha inteira: largura limitada pela altura, pela proporção
          // real desta página (cada página pode ter orientação diferente).
          const aspect = aspects[i];
          const width = aspect
            ? Math.min(box.innerWidth, Math.floor(box.innerHeight * aspect))
            : box.innerWidth;
          return (
            <div className="flex justify-center">
              <Page
                pageNumber={i + 1}
                width={width}
                onLoadSuccess={(page) => {
                  const ratio = page.originalWidth / page.originalHeight;
                  setAspects((prev) =>
                    prev[i] === ratio ? prev : { ...prev, [i]: ratio }
                  );
                }}
                renderTextLayer
                renderAnnotationLayer
              />
            </div>
          );
        }}
        initialProgress={initialProgress}
        onProgress={onProgress}
      />
    </Document>
  );
}
