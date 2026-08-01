import { useEffect, useState } from "react";
import { Trash2, Loader2, Plus, User as UserIcon } from "lucide-react";
import type { User } from "../../shared/types";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const { theme, set: setTheme } = useThemeStore();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    role: "user" as "user" | "admin",
  });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isAdmin) refreshUsers();
  }, [isAdmin]);

  async function refreshUsers() {
    setLoadingUsers(true);
    try {
      const list = await api.users.list();
      setUsers(list);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function changeTheme(t: "light" | "dark") {
    setTheme(t);
    try {
      await api.settings.setTheme(t);
      updateUser({ theme: t });
    } catch {}
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    try {
      await api.users.create(
        newUser.username.trim(),
        newUser.password,
        newUser.email.trim() || null,
        newUser.role
      );
      setNewUser({ username: "", password: "", email: "", role: "user" });
      await refreshUsers();
    } catch (e: any) {
      alert(e?.message ?? "Falha ao criar usuário.");
    }
  }

  async function handleRemoveUser(id: number) {
    if (!confirm("Remover este usuário?")) return;
    try {
      await api.users.remove(id);
      await refreshUsers();
    } catch (e: any) {
      alert(e?.message ?? "Falha ao remover.");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    if (!pw.current || !pw.next) return;
    if (pw.next.length < 6) {
      setPwErr("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    try {
      await api.settings.changePassword(pw.current, pw.next);
      setPwMsg("Senha alterada com sucesso.");
      setPw({ current: "", next: "" });
    } catch (e: any) {
      setPwErr(e?.message ?? "Falha ao trocar senha.");
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-serif font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preferências da conta e do aplicativo.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Usuário: </span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{user?.email ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Papel: </span>
            <span className="font-medium capitalize">{user?.role}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => changeTheme(t)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm border capitalize transition-colors",
                  theme === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary"
                )}
              >
                {t === "light" ? "Claro" : "Escuro"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
            <div>
              <Label>Senha atual</Label>
              <Input
                type="password"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            {pwErr && (
              <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {pwErr}
              </div>
            )}
            {pwMsg && (
              <div className="text-sm text-ok bg-ok/10 px-3 py-2 rounded-md">
                {pwMsg}
              </div>
            )}
            <Button type="submit">Atualizar senha</Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {loadingUsers && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              )}
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-2.5 rounded-md border border-border"
                >
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{u.username}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email ?? "—"} · {u.role}
                    </div>
                  </div>
                  {u.id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveUser(u.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreateUser}
              className="border-t border-border pt-4 space-y-3"
            >
              <div className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" /> Novo usuário
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label>Usuário</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Email (opcional)</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Papel</Label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as "user" | "admin",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <Button type="submit">Criar usuário</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}