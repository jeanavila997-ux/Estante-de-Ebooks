// Servidor mobile (PWA) do EstanteApp — zero dependências (só Node built-in).
// Serve a versão web para o iPhone acessar pela rede Wi-Fi local,
// reaproveitando os serviços já compilados em dist/main.
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
process.env.ESTANTE_USER_DATA =
  process.env.ESTANTE_USER_DATA || path.join(process.env.APPDATA || os.homedir(), "estante-app");

const DIST = path.join(ROOT, "dist", "main", "main");
function reqDist(...p) {
  return require(path.join(DIST, ...p));
}

let db, auth, ebooksSvc, categoriesSvc, authCtx;
try {
  const conn = reqDist("db", "connection.js");
  conn.initDatabase();
  db = conn.getDb;
  auth = reqDist("auth", "index.js");
  authCtx = reqDist("ipc", "auth-context.js");
  ebooksSvc = reqDist("services", "ebooks.service.js");
  categoriesSvc = reqDist("services", "categories.service.js");
} catch (e) {
  console.error("\n[erro] Não consegui carregar o app compilado.");
  console.error("Rode antes:  npm run build\n");
  console.error(e.message);
  process.exit(1);
}

const PORT = Number(process.env.PORT || 8080);
const PUBLIC = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
  ".md": "text/markdown; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...headers, "Cache-Control": "no-cache, no-store, must-revalidate" });
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}
function bearer(req, url) {
  const h = req.headers["authorization"];
  if (h && h.startsWith("Bearer ")) return h.slice(7);
  return url.searchParams.get("t") || "";
}
function ctxFrom(req, url) {
  return authCtx.authenticate(bearer(req, url)); // lança se inválido
}

function serveStatic(res, file) {
  const full = path.join(PUBLIC, file);
  if (!fs.existsSync(full)) return send(res, 404, "não encontrado");
  const ct = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
  send(res, 200, fs.readFileSync(full), { "Content-Type": ct });
}

function streamFile(req, res, filePath, contentType) {
  const stat = fs.statSync(filePath);
  const range = req.headers.range;
  const isPdf = contentType === "application/pdf";
  const headers = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0",
  };
  if (isPdf) {
    // Evita que o iPhone baixe o PDF como arquivo ao abrir no iframe.
    headers["Content-Disposition"] = "inline";
  }
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
    if (isNaN(start)) start = 0;
    if (isNaN(end) || end >= stat.size) end = stat.size - 1;
    res.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      ...headers,
      "Content-Length": stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    // ---- Estáticos / PWA ----
    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return serveStatic(res, "index.html");
    }
    if (req.method === "GET" && p === "/manifest.webmanifest")
      return serveStatic(res, "manifest.webmanifest");
    if (req.method === "GET" && p === "/sw.js") return serveStatic(res, "sw.js");
    if (req.method === "GET" && /^\/(icon-192|icon-512|apple-touch-icon)\.png$/.test(p))
      return serveStatic(res, p.slice(1));

    // ---- API ----
    if (req.method === "POST" && p === "/api/login") {
      const { username, password } = JSON.parse((await readBody(req)) || "{}");
      const u = auth.getUserByUsername(String(username || ""));
      if (!u || !auth.verifyPassword(String(password || ""), u.password_hash))
        return sendJson(res, 401, { error: "Usuário ou senha inválidos." });
      const token = auth.signToken({ sub: u.id, username: u.username, role: u.role });
      auth.saveSession(token, u.id);
      return sendJson(res, 200, { token, user: auth.publicUser(u) });
    }

    if (req.method === "GET" && p === "/api/bootstrap") {
      const ctx = ctxFrom(req, url);
      const categories = categoriesSvc.listCategories(ctx);
      const list = ebooksSvc.listEbooks(ctx).map((e) => {
        let format = null;
        try {
          format = ebooksSvc.detectFormat(e.file_path || "");
        } catch {}
        const hasFile = !!(e.file_path && fs.existsSync(e.file_path));
        return {
          id: e.id,
          title: e.title,
          kind: e.kind,
          description: e.description,
          category_id: e.category_id,
          status: e.status,
          format,
          hasFile,
        };
      });
      return sendJson(res, 200, { user: ctx.user, categories, ebooks: list });
    }

    let m;
    if (req.method === "GET" && (m = /^\/api\/ebooks\/(\d+)\/file$/.exec(p))) {
      const ctx = ctxFrom(req, url);
      const id = Number(m[1]);
      const row = db()
        .prepare("SELECT title, file_path, status FROM ebooks WHERE id = ?")
        .get(id);
      if (!row) return send(res, 404, "não encontrado");
      if (ctx.user.role !== "admin" && row.status !== "publicado")
        return send(res, 403, "indisponível");
      if (!row.file_path || !fs.existsSync(row.file_path))
        return send(res, 404, "arquivo ausente");
      const ct = MIME[path.extname(row.file_path).toLowerCase()] || "application/octet-stream";
      return streamFile(req, res, row.file_path, ct);
    }

    if (req.method === "GET" && (m = /^\/api\/ebooks\/(\d+)\/content$/.exec(p))) {
      const ctx = ctxFrom(req, url);
      const id = Number(m[1]);
      const c = ebooksSvc.openEbookContent(ctx, id); // valida visibilidade
      const isBinary = c.format === "pdf";
      if (isBinary) {
        // PDF: redireciona para rota de streaming inline (melhor para iPhone).
        return sendJson(res, 200, { format: c.format, name: c.name, data: "" });
      }
      const data = typeof c.data === "string" ? c.data : "";
      return sendJson(res, 200, { format: c.format, name: c.name, data });
    }

    return send(res, 404, "rota não encontrada");
  } catch (e) {
    const msg = e && e.message ? e.message : "erro";
    const code = /sessão|token|restrito|administrador/i.test(msg) ? 401 : 500;
    return sendJson(res, code, { error: msg });
  }
});

function lanUrls() {
  const nets = os.networkInterfaces();
  const urls = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) urls.push(`http://${ni.address}:${PORT}`);
    }
  }
  return urls;
}

server.listen(PORT, "0.0.0.0", () => {
  const urls = lanUrls();
  console.log("\n===================================================");
  console.log("  ESTANTE DE EBOOKS — versão mobile (PWA) no ar");
  console.log("===================================================\n");
  console.log("  No iPhone (mesma rede Wi-Fi que este PC), abra no Safari:\n");
  if (urls.length) urls.forEach((u) => console.log("     " + u));
  else console.log("     http://localhost:" + PORT + "  (nenhuma rede Wi-Fi detectada)");
  console.log("\n  Depois toque em Compartilhar → 'Adicionar à Tela de Início'");
  console.log("  para instalar como app.\n");
  console.log("  Login: use suas credenciais (admin: ADMIN / sua senha).");
  console.log("  Deixe esta janela aberta enquanto usa no iPhone.");
  console.log("  Para encerrar: feche esta janela ou pressione Ctrl+C.\n");
});
