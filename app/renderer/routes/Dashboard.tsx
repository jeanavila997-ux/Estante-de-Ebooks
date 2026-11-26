import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Info,
  Send,
  HelpCircle,
  PenLine,
} from "lucide-react";
import type { DashboardStats } from "../../shared/types";
import { Card, CardContent } from "../components/ui/Card";
import { api } from "../lib/api";
import { cn } from "../lib/utils";
import { useAuthStore } from "../store/auth";

const statusInfo = {
  rascunho: { label: "Rascunhos", icon: PenLine, color: "text-wip" },
  pronto: { label: "Prontos", icon: CheckCircle2, color: "text-ok" },
  publicado: { label: "Publicados", icon: Send, color: "text-blue-500" },
  verificar: { label: "Verificar", icon: HelpCircle, color: "text-off" },
};

export default function Dashboard() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.dashboard
      .stats()
      .then((s) => alive && setStats(s))
      .catch((e) => alive && setError(e?.message ?? "Erro ao carregar"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading)
    return (
      <div className="p-8 text-muted-foreground">Carregando dashboard...</div>
    );
  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!stats) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 lg:space-y-8">
      <header>
        <h1 className="text-2xl font-serif font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Visão geral da sua estante de ebooks."
            : "Sua estante de ebooks disponíveis."}
        </p>
      </header>

      <div
        role="note"
        className="flex items-start gap-3 rounded-lg border border-wip/50 bg-wip/10 px-4 py-3.5 text-sm"
      >
        <Info className="h-5 w-5 shrink-0 mt-0.5 text-wip" />
        <div>
          <b>Nada aqui é indicação, prescrição ou diagnóstico.</b> Todo o
          material é educativo. Qualquer decisão sobre tratamento é única e
          exclusivamente do seu médico.
        </div>
      </div>

      <section
        className={cn(
          "grid gap-4",
          isAdmin ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-2 max-w-md"
        )}
      >
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label={isAdmin ? "Total" : "Ebooks disponíveis"}
          value={stats.total}
          tone="text-foreground"
        />
        {isAdmin &&
          (Object.keys(statusInfo) as (keyof typeof statusInfo)[]).map((k) => {
            const info = statusInfo[k];
            return (
              <StatCard
                key={k}
                icon={<info.icon className="h-5 w-5" />}
                label={info.label}
                value={(stats as any)[k] as number}
                tone={info.color}
              />
            );
          })}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Categorias</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.categories.map((c) => (
            <Link key={c.id} to={`/category/${c.code}`}>
              <Card className="hover:border-primary/60 hover:shadow-md transition cursor-pointer h-full">
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gold mb-1">
                      {c.code}
                    </div>
                    <div className="font-semibold">{c.title}</div>
                    {c.note && (
                      <div className="text-xs text-muted-foreground italic mt-1 line-clamp-2">
                        {c.note}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 rounded-md bg-primary/10 text-primary px-3 py-1.5 text-sm font-semibold">
                    {c.count}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {stats.reading.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Continuar lendo</h2>
          <div className="space-y-2">
            {stats.reading.map((r) => (
              <Link
                key={r.ebook_id}
                to={`/read/${r.ebook_id}`}
                className="block"
              >
                <Card className="hover:border-primary/60 transition cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Categoria {r.category_code} · {r.progress}% lido
                      </div>
                    </div>
                    <div className="w-24 shrink-0">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${r.progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("mb-2", tone)}>{icon}</div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}