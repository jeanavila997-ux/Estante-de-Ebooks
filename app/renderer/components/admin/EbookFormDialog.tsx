import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Category, Ebook, EbookStatus } from "../../../shared/types";
import { Button } from "../ui/Button";
import { Input, Label } from "../ui/Input";
import { api } from "../../lib/api";
import Modal from "./Modal";

export default function EbookFormDialog({
  ebook,
  categories,
  onClose,
  onSaved,
}: {
  ebook: Ebook;
  categories: Category[];
  onClose: () => void;
  onSaved: (updated: Ebook) => void;
}) {
  const [title, setTitle] = useState(ebook.title);
  const [kind, setKind] = useState(ebook.kind ?? "");
  const [description, setDescription] = useState(ebook.description ?? "");
  const [categoryId, setCategoryId] = useState(ebook.category_id);
  const [status, setStatus] = useState<EbookStatus>(ebook.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.ebooks.update(ebook.id, {
        title,
        kind: kind || null,
        description: description || null,
        category_id: categoryId,
        status,
      });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar ebook" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Tipo (ex.: Ebook, Guia, Relatório)</Label>
          <Input value={kind} onChange={(e) => setKind(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Categoria</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EbookStatus)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="rascunho">rascunho</option>
              <option value="pronto">pronto</option>
              <option value="publicado">publicado (visível p/ clientes)</option>
              <option value="verificar">verificar</option>
            </select>
          </div>
        </div>
        {ebook.file_path && (
          <div className="text-xs text-muted-foreground break-all">
            Arquivo: {ebook.file_path}
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
