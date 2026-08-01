import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Category, Ebook, EbookStatus } from "../../shared/types";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import ImportDropzone from "../components/admin/ImportDropzone";
import EbookFormDialog from "../components/admin/EbookFormDialog";
import CategoryFormDialog from "../components/admin/CategoryFormDialog";

type Tab = "conteudo" | "categorias";

const STATUS_OPTIONS: EbookStatus[] = ["rascunho", "pronto", "publicado", "verificar"];

export default function Admin() {
  const [tab, setTab] = useState<Tab>("conteudo");
  const [categories, setCategories] = useState<Category[]>([]);
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<{
    id: number;
    count: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, books] = await Promise.all([
        api.categories.list(),
        api.ebooks.list(),
      ]);
      setCategories(cats);
      setEbooks(books);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const visibleEbooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ebooks;
    return ebooks.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (categoryById.get(e.category_id)?.title ?? "").toLowerCase().includes(q)
    );
  }, [ebooks, search, categoryById]);

  async function changeStatus(ebook: Ebook, status: EbookStatus) {
    try {
      const updated = await api.ebooks.setStatus(ebook.id, status);
      setEbooks((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (e: any) {
      setError(e?.message ?? "Falha ao alterar status.");
    }
  }

  async function removeEbook(id: number, deleteFile: boolean) {
    try {
      await api.ebooks.remove(id, deleteFile);
      setEbooks((prev) => prev.filter((e) => e.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Falha ao excluir.");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function askRemoveCategory(cat: Category) {
    try {
      const count = await api.categories.countEbooks(cat.id);
      setConfirmDeleteCat({ id: cat.id, count });
    } catch (e: any) {
      setError(e?.message ?? "Falha ao consultar categoria.");
    }
  }

  async function removeCategory(id: number) {
    try {
      await api.categories.remove(id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao excluir categoria.");
    } finally {
      setConfirmDeleteCat(null);
    }
  }

  async function moveCategory(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);
    try {
      const fresh = await api.categories.reorder(reordered.map((c) => c.id));
      setCategories(fresh);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao reordenar.");
      load();
    }
  }

  if (loading)
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-serif font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe ebooks, ajuste metadados e controle o que os clientes veem.
          Apenas itens com status <b>publicado</b> aparecem para os clientes.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["conteudo", "Conteúdo"],
            ["categorias", "Categorias"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
              tab === key
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {tab === "conteudo" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-semibold mb-3">Importar ebooks</h2>
              <ImportDropzone categories={categories} onImported={load} />
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título ou categoria..."
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {visibleEbooks.length} de {ebooks.length} itens
            </div>
          </div>

          <div className="hidden lg:block border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Título</th>
                  <th className="px-4 py-2.5 font-medium">Categoria</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Visível</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visibleEbooks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground italic"
                    >
                      Nenhum ebook encontrado.
                    </td>
                  </tr>
                )}
                {visibleEbooks.map((ebook) => (
                  <tr key={ebook.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{ebook.title}</div>
                      {ebook.kind && (
                        <div className="text-xs text-muted-foreground">
                          {ebook.kind}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {categoryById.get(ebook.category_id)?.title ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={ebook.status}
                        onChange={(e) =>
                          changeStatus(ebook, e.target.value as EbookStatus)
                        }
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      {ebook.status === "publicado" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-500">
                          <Eye className="h-3.5 w-3.5" /> Sim
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1 items-center">
                        {confirmDelete === ebook.id ? (
                          <>
                            <span className="text-xs text-muted-foreground mr-1">
                              Excluir?
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeEbook(ebook.id, false)}
                            >
                              Só registro
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeEbook(ebook.id, true)}
                            >
                              + arquivo
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingEbook(ebook)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(ebook.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {visibleEbooks.length === 0 && (
              <div className="text-center text-muted-foreground italic py-8">
                Nenhum ebook encontrado.
              </div>
            )}
            {visibleEbooks.map((ebook) => (
              <Card key={ebook.id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <div className="font-medium">{ebook.title}</div>
                    {ebook.kind && (
                      <div className="text-xs text-muted-foreground">{ebook.kind}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {categoryById.get(ebook.category_id)?.title ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={ebook.status}
                      onChange={(e) => changeStatus(ebook, e.target.value as EbookStatus)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {ebook.status === "publicado" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-500">
                        <Eye className="h-3.5 w-3.5" /> Visível
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Oculto</span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    {confirmDelete === ebook.id ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeEbook(ebook.id, false)}
                        >
                          Só registro
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeEbook(ebook.id, true)}
                        >
                          + arquivo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingEbook(ebook)}
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(ebook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "categorias" && (
        <div className="space-y-4">
          <Button onClick={() => setCreatingCategory(true)}>
            <Plus className="h-4 w-4" /> Nova categoria
          </Button>
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <Card key={cat.id}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5"
                      disabled={i === 0}
                      onClick={() => moveCategory(i, -1)}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1.5"
                      disabled={i === categories.length - 1}
                      onClick={() => moveCategory(i, 1)}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gold">{cat.code}</div>
                    <div className="font-semibold">{cat.title}</div>
                    {cat.note && (
                      <div className="text-xs text-muted-foreground italic truncate">
                        {cat.note}
                      </div>
                    )}
                  </div>
                  {confirmDeleteCat?.id === cat.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive">
                        {confirmDeleteCat.count > 0
                          ? `Excluir junto ${confirmDeleteCat.count} ebook(s)?`
                          : "Excluir categoria vazia?"}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeCategory(cat.id)}
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteCat(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCategory(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => askRemoveCategory(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {editingEbook && (
        <EbookFormDialog
          ebook={editingEbook}
          categories={categories}
          onClose={() => setEditingEbook(null)}
          onSaved={(updated) =>
            setEbooks((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            )
          }
        />
      )}
      {(editingCategory || creatingCategory) && (
        <CategoryFormDialog
          category={editingCategory}
          onClose={() => {
            setEditingCategory(null);
            setCreatingCategory(false);
          }}
          onSaved={load}
        />
      )}
    </div>
  );
}
