import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

/** Geometria de uma folha, calculada a partir da área disponível. */
export interface PageBox {
  width: number;
  height: number;
  padding: number;
  /** Área útil do texto ou do PDF dentro da folha. */
  innerWidth: number;
  innerHeight: number;
}

type Flip = { from: number; to: number; dir: "next" | "prev" };

const FLIP_MS = 820; // acompanha a animação de 0,8 s em tailwind.config.ts
const FOOTER_H = 28; // faixa da numeração no pé da folha

const SHEET_SHADOW =
  "0 10px 30px -12px rgba(0,0,0,.45), -10px 0 18px -14px rgba(0,0,0,.5) inset";
const LEAF_SHADOW = "0 10px 30px -12px rgba(0,0,0,.45)";

/** Estilo do fluxo de colunas: uma coluna por página, com altura da página em --page-h. */
function columnStyle(w: number, h: number): CSSProperties {
  return {
    width: w,
    height: h,
    columnWidth: w,
    columnGap: 0,
    columnFill: "auto",
    ["--page-h" as string]: `${h}px`,
  } as CSSProperties;
}

export function pageBox(areaW: number, areaH: number): PageBox {
  const width = Math.max(260, Math.min(560, areaW - 32));
  const padding = width < 420 ? 24 : 40;
  const height = Math.max(
    320,
    Math.min(Math.max(320, areaH - 32), Math.round(width * 1.4))
  );
  return {
    width,
    height,
    padding,
    innerWidth: width - padding * 2,
    innerHeight: height - padding * 2 - FOOTER_H,
  };
}

/**
 * Leitor paginado com virada de página em 3D.
 *
 * - `html` (HTML/Markdown já sanitizados): o texto flui em colunas CSS da
 *   largura da folha, então quebra linha a linha, sem deixar páginas vazias.
 *   Cada página é a coluna seguinte, deslocada horizontalmente.
 * - `pageCount` + `renderPage` (PDF): cada página do documento é uma folha.
 *
 * Reporta o progresso como página atual / total.
 */
export default function PagedReader({
  title,
  html,
  pageCount,
  renderPage,
  initialProgress,
  onProgress,
}: {
  title: string;
  /** HTML sanitizado, paginado por colunas. */
  html?: string;
  /** Conteúdo já paginado (PDF). */
  pageCount?: number;
  renderPage?: (index: number, box: PageBox) => ReactNode;
  /** 0–100, usado para restaurar a página ao abrir. */
  initialProgress: number;
  onProgress: (percent: number) => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [htmlPages, setHtmlPages] = useState(0);
  const [version, setVersion] = useState(0); // sobe quando uma imagem carrega
  const [manual, setManual] = useState<number | null>(null);
  const [flip, setFlip] = useState<Flip | null>(null);
  const flipTimer = useRef<number | null>(null);
  const lastPct = useRef<number | null>(null);

  const box = useMemo(() => pageBox(area.w, area.h), [area.w, area.h]);

  const total = html !== undefined ? htmlPages : pageCount ?? 0;
  const restored =
    Math.min(total, Math.max(1, Math.round((initialProgress / 100) * total) || 1)) - 1;
  // Derivado no render: a página restaurada já vale na primeira pintura.
  const index = total === 0 ? 0 : Math.min(total - 1, manual ?? restored);

  // Mede a área útil do corpo do leitor.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const update = () =>
      setArea((a) =>
        a.w === el.clientWidth && a.h === el.clientHeight
          ? a
          : { w: el.clientWidth, h: el.clientHeight }
      );
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Conta as colunas: o fluxo medido transborda para a direita, uma folha por coluna.
  useLayoutEffect(() => {
    if (html === undefined) return;
    const el = measureRef.current;
    if (!el || box.innerWidth <= 0) return;
    setHtmlPages(Math.max(1, Math.ceil((el.scrollWidth - 0.5) / box.innerWidth)));
  }, [html, box.innerWidth, box.innerHeight, version]);

  // Imagens que carregam mudam a altura do texto: repagina quando chegam.
  useEffect(() => {
    const el = measureRef.current;
    if (!el || html === undefined) return;
    const onLoad = () => setVersion((v) => v + 1);
    el.addEventListener("load", onLoad, true);
    return () => el.removeEventListener("load", onLoad, true);
  }, [html]);

  useEffect(
    () => () => {
      if (flipTimer.current) window.clearTimeout(flipTimer.current);
    },
    []
  );

  useEffect(() => {
    if (total === 0) return;
    const pct = Math.round(((index + 1) / total) * 100);
    if (pct === lastPct.current) return;
    lastPct.current = pct;
    onProgress(pct);
  }, [index, total, onProgress]);

  function turn(dir: "next" | "prev") {
    if (flip || total === 0) return;
    const to = dir === "next" ? index + 1 : index - 1;
    if (to < 0 || to >= total) return;
    setManual(to);
    setFlip({ from: index, to, dir });
    if (flipTimer.current) window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => setFlip(null), FLIP_MS);
  }

  function content(i: number): ReactNode {
    if (html !== undefined) {
      const w = box.innerWidth;
      return (
        <div className="relative overflow-hidden" style={{ width: w, height: box.innerHeight }}>
          <div
            className="reader-content reader-columns absolute left-0 top-0"
            style={{
              ...columnStyle(w, box.innerHeight),
              transform: `translateX(${-i * w}px)`,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      );
    }
    return renderPage?.(i, box) ?? null;
  }

  // Na virada, a folha que sai (from) e a que entra (to) trocam de face
  // conforme a direção; a folha de baixo já mostra a página nova.
  const frontIndex = flip ? (flip.dir === "next" ? flip.from : flip.to) : index;
  const backIndex = flip ? (flip.dir === "next" ? flip.to : flip.from) : index;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex-none border-b border-border bg-card px-5 py-2 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          aria-label="Página anterior"
          disabled={total === 0 || index <= 0}
          onClick={() => turn("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Página {total === 0 ? 0 : index + 1} de {total}
        </span>
        <Button
          variant="outline"
          size="sm"
          aria-label="Próxima página"
          disabled={total === 0 || index >= total - 1}
          onClick={() => turn("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={bodyRef}
        className="relative flex-1 min-h-0 overflow-auto scrollbar-thin bg-muted/30"
      >
        {total === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          </div>
        ) : (
          <div className="grid min-h-full place-items-center p-4">
            <div
              className="relative"
              style={{ width: box.width, height: box.height, perspective: 2000 }}
            >
              <Sheet
                box={box}
                pageNo={index + 1}
                title={title}
                style={{ boxShadow: SHEET_SHADOW }}
              >
                {content(index)}
              </Sheet>

              {flip && (
                <div
                  key={`${flip.from}-${flip.to}`}
                  className={cn(
                    "absolute inset-0 motion-reduce:hidden",
                    flip.dir === "next" ? "animate-flip-next" : "animate-flip-prev"
                  )}
                  style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
                >
                  <Sheet
                    box={box}
                    pageNo={frontIndex + 1}
                    title={title}
                    style={{ backfaceVisibility: "hidden", boxShadow: LEAF_SHADOW }}
                  >
                    {content(frontIndex)}
                  </Sheet>
                  <Sheet
                    box={box}
                    pageNo={backIndex + 1}
                    title={title}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      boxShadow: LEAF_SHADOW,
                    }}
                  >
                    {content(backIndex)}
                  </Sheet>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medição escondida: o mesmo fluxo em colunas, só para contar as páginas. */}
        {html !== undefined && (
          <div
            aria-hidden
            className="absolute left-0 top-0 overflow-hidden"
            style={{
              width: 0,
              height: 0,
              visibility: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              ref={measureRef}
              className="reader-content reader-columns"
              style={columnStyle(box.innerWidth, box.innerHeight)}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Sheet({
  box,
  pageNo,
  title,
  style,
  children,
}: {
  box: PageBox;
  pageNo: number;
  title: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-card"
      style={{
        padding: box.padding,
        borderRadius: "2px 8px 8px 2px",
        ...style,
      }}
    >
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">{children}</div>
      <div
        className="flex-none flex items-center justify-between gap-4 border-t border-border pt-2.5 text-[11px] text-muted-foreground"
        style={{ height: FOOTER_H }}
      >
        <span className="tabular-nums">{pageNo}</span>
        <span className="truncate">{title}</span>
      </div>
    </div>
  );
}
