import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Category } from "../../../shared/types";
import { Button } from "../ui/Button";
import { Input, Label } from "../ui/Input";
import { api } from "../../lib/api";
import Modal from "./Modal";

const THEMES = ["default", "alt", "dark", "sand"];

export default function CategoryFormDialog({
  category,
  onClose,
  onSaved,
}: {
  /** null = criar nova categoria */
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(category?.code ?? "");
  const [title, setTitle] = useState(category?.title ?? "");
  const [note, setNote] = useState(category?.note ?? "");
  const [theme, setTheme] = useState(category?.theme ?? "default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (category) {
        await api.categories.update(category.id, { code, title, note, theme });
      } else {
        await api.categories.create({ code, title, note, theme });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={category ? "Editar categoria" : "Nova categoria"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[100px_1fr] gap-3">
          <div>
            <Label>Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="01"
            />
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Nota (opcional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div>
          <Label>Tema visual</Label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={saving || !code.trim() || !title.trim()}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
