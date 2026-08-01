import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { api } from "../lib/api";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setError("Preencha usuário e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.login(username.trim(), password);
      setAuth(res.token, res.user);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full w-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary via-spine to-ink text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-60 rounded-sm bg-spine2 rotate-3 shadow-2xl" />
          <div className="absolute top-20 left-40 w-40 h-60 rounded-sm bg-gold -rotate-2 shadow-2xl" />
          <div className="absolute bottom-20 right-20 w-40 h-60 rounded-sm bg-ok rotate-6 shadow-2xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-6 w-6" />
            Estante de Ebooks
          </div>
        </div>
        <div className="relative space-y-3">
          <h1 className="text-4xl font-serif font-bold leading-tight">
            Sua biblioteca
            <br />
            <span className="italic text-gold">organizada e viva.</span>
          </h1>
          <p className="text-primary-foreground/80 max-w-md">
            Catalogue, organize e leia seus ebooks num só lugar. Status,
            categorias e leitor integrado — tudo offline.
          </p>
        </div>
        <div className="relative text-xs text-primary-foreground/60">
          v1.0 · uso local
        </div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6 bg-background">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="lg:hidden mb-6 flex items-center gap-2 justify-center">
              <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground grid place-items-center">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="font-semibold">Estante de Ebooks</span>
            </div>

            <h2 className="text-2xl font-semibold mb-1">Entrar</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Use suas credenciais para acessar a estante.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ADMIN"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {show ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground text-center">
              <p>
                Padrão inicial: <code className="font-mono">ADMIN</code> /{" "}
                <code className="font-mono">201502</code>
              </p>
              <p className="mt-1">
                Você poderá trocar a senha em Configurações.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}