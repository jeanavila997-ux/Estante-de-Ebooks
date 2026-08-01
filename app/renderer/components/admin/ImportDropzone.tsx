import { useRef, useState } from "react";
import { FileUp, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import type { Category, EbookStatus } from "../../../shared/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

const ACCEPT = ".pdf,.html,.htm,.md";

interface QueueItem {
  file: File;
  title: string;
  categoryId: number;
  status: EbookStatus;
  state: "pendente" | "enviando" | "ok" | "erro";
  error?: string;
}

export default function ImportDropzone({
  categories,
  onImported,
}: {
  categories: Category[];
  onImported: () => void;
}) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultCategory = categories[0]?.id ?? 0;

  function addFiles(files: FileList | File[]) {
    const allowed = /\.(pdf|html?|md)$/i;
    const items: QueueItem[] = [];
    for (const file of Array.from(files)) {
      if (!allowed.test(file.name)) continue;
      items.push({
        file,
        title: file.name.replace(/\.(pdf|html?|md)$/i, ""),
        categoryId: defaultCategory,
        status: "rascunho",
        state: "pendente",
      });
    }
    if (items.length) setQueue((q) => [...q, ...items]);
  }

  function patchItem(index: number, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function importAll() {
    setBusy(true);
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.state === "ok") continue;
      patchItem(i, { state: "enviando", error: undefined });
      try {
        const data = await item.file.arrayBuffer();
        await api.ebooks.upload(
          item.file.name,
          data,
          item.categoryId,
          item.title,
          "Ebook",
          "",
          item.status
        );
        patchItem(i, { state: "ok" });
      } catch (e: any) {
        patchItem(i, { state: "erro", error: e?.message ?? "Falha no envio." });
      }
    }
    setBusy(false);
    onImported();
  }

  const pending = queue.filter((q) => q.state !== "ok").length;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <div className="text-sm font-medium">
          Arraste arquivos aqui ou clique para escolher
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          PDF, HTML ou Markdown · até 200 MB por arquivo
        </div>
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, i) => (
            <div
              key={`${item.file.name}-${i}`}
              className="flex items-center gap-2 border border-border rounded-md p-2.5 bg-card"
            >
              <div className="w-5 shrink-0">
                {item.state === "enviando" && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {item.state === "ok" && (
                  <CheckCircle2 className="h-4 w-4 text-ok" />
                )}
                {item.state === "erro" && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Input
                  value={item.title}
                  disabled={busy || item.state === "ok"}
                  onChange={(e) => patchItem(i, { title: e.target.value })}
                  className="h-8 text-xs"
                />
                <div className="text-[11px] text-muted-foreground truncate">
                  {item.file.name}
                  {item.error && (
                    <span className="text-destructive ml-2">{item.error}</span>
                  )}
                </div>
              </div>
              <select
                value={item.categoryId}
                disabled={busy || item.state === "ok"}
                onChange={(e) =>
                  patchItem(i, { categoryId: Number(e.target.value) })
                }
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.title}
                  </option>
                ))}
              </select>
              <select
                value={item.status}
                disabled={busy || item.state === "ok"}
                onChange={(e) =>
                  patchItem(i, { status: e.target.value as EbookStatus })
                }
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="rascunho">rascunho</option>
                <option value="pronto">pronto</option>
                <option value="publicado">publicado</option>
                <option value="verificar">verificar</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setQueue((q) => q.filter((_, x) => x !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button onClick={importAll} disabled={busy || pending === 0}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="h-4 w-4" />
              )}
              {busy ? "Importando..." : `Importar ${pending} arquivo(s)`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setQueue([])}
            >
              Limpar fila
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
