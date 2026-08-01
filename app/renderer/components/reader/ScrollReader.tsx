import { useEffect, useRef } from "react";

/**
 * Container scrollável compartilhado pelos leitores HTML e Markdown:
 * restaura a posição a partir do progresso salvo e reporta o progresso
 * de leitura (0–100) conforme o scroll, com throttle.
 */
export default function ScrollReader({
  html,
  className,
  initialProgress,
  onProgress,
}: {
  /** HTML já sanitizado (DOMPurify) — nunca passar conteúdo bruto. */
  html: string;
  className?: string;
  initialProgress: number;
  onProgress: (percent: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const throttleRef = useRef<number | null>(null);

  useEffect(() => {
    // rAF garante que o layout já foi calculado antes de medir o scroll.
    const raf = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el || el.clientHeight === 0) return;
      const range = el.scrollHeight - el.clientHeight;
      if (range > 0 && initialProgress > 0) {
        el.scrollTop = (initialProgress / 100) * range;
      } else if (range <= 0) {
        // Conteúdo cabe inteiro na tela: considerar lido ao abrir.
        onProgress(100);
      }
    });
    return () => cancelAnimationFrame(raf);
    // Restaura apenas na montagem do conteúdo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  function handleScroll() {
    if (throttleRef.current) return;
    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null;
      const el = ref.current;
      if (!el) return;
      const range = el.scrollHeight - el.clientHeight;
      if (range <= 0) return;
      onProgress(Math.round((el.scrollTop / range) * 100));
    }, 500);
  }

  useEffect(
    () => () => {
      if (throttleRef.current) window.clearTimeout(throttleRef.current);
    },
    []
  );

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="h-full overflow-auto scrollbar-thin bg-muted/30"
    >
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
