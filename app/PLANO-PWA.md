# Plano — EstanteApp como PWA (uso mobile)

## Contexto

O EstanteApp hoje é um app **Electron desktop**: o renderer (React + Vite) conversa com o
processo principal via IPC (`window.api`). Um **PWA** (Progressive Web App) é um site que o
cliente abre no navegador do celular e pode "instalar" na tela inicial, funcionando como um
app — exatamente o modelo de acesso web em VPS que já foi decidido.

A migração é viável com esforço **médio** porque a arquitetura já foi preparada para isso:

- Toda a lógica vive em `main/services/*.service.ts` como funções puras `(ctx, args) => resultado`, **sem importar `electron`** → reaproveitáveis por um servidor HTTP.
- `main/config.ts` roda fora do Electron via `ESTANTE_USER_DATA` (o `require("electron")` é tardio).
- Autenticação por token (JWT) já viaja como parâmetro → mapeia 1:1 para o header `Authorization: Bearer`.
- O renderer só toca `window.api` num único arquivo: `renderer/lib/api.ts`.

## Arquitetura alvo

```
Celular (navegador) ──HTTPS──> VPS
  PWA (React + Service Worker)      ┌─ servidor Node (Fastify)
  instalável na tela inicial        │    /api/*  → main/services/* (reuso)
                                     │    /api/ebooks/:id/content → stream do arquivo
                                     │    estático → build do PWA (dist/renderer)
                                     ├─ SQLite (estante.db)
                                     └─ pasta de ebooks no disco
```

Mesma base de código React serve **os dois alvos**: `api.ts` detecta o ambiente
(`window.api` existe → Electron; senão → `fetch` HTTP). O app desktop continua funcionando.

---

## Fase 1 — Servidor HTTP (backbone do PWA)

Novo diretório `server/` reutilizando `main/services`, `main/auth`, `main/db`, `main/config`.

- **Lib:** Fastify (leve, rápido, bom suporte a stream e multipart). Alternativa: Express.
- **`server/index.ts`** — sobe o Fastify, roda `initDatabase()` + `seedIfEmpty()` no boot
  (mesma sequência do `main/main.ts`), define `ESTANTE_USER_DATA`/`ESTANTE_JWT_SECRET` por env.
- **`server/routes.ts`** — um endpoint por canal IPC atual. Cada rota: extrai `Authorization:
  Bearer <token>` → `authenticate(token)` → chama o serviço (é o mesmo papel dos
  `main/ipc/*.ipc.ts` de hoje). Mapa:

  | IPC atual | Rota HTTP |
  |---|---|
  | `auth:login` / `me` / `logout` | `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/logout` |
  | `categories:list/create/update/remove/reorder/countEbooks` | `GET/POST/PUT/DELETE /api/categories` |
  | `ebooks:list` | `GET /api/ebooks?categoryId=` |
  | `ebooks:update/setStatus/remove` | `PUT/PATCH/DELETE /api/ebooks/:id` |
  | `ebooks:upload` | `POST /api/ebooks` (multipart) |
  | `ebooks:openContent` | `GET /api/ebooks/:id/content` (**stream**, ver abaixo) |
  | `dashboard:stats/getProgress/setProgress` | `GET /api/dashboard` · `GET/PUT /api/ebooks/:id/progress` |
  | `users:*` · `settings:*` | `GET/POST/DELETE /api/users` · `PUT /api/settings/*` |

- **Streaming de arquivo (importante para mobile):** o `openEbookContent` atual lê o arquivo
  inteiro para a memória. Para PDFs grandes (10 MB) no celular, criar uma rota dedicada que,
  após `authenticate` + checagem de visibilidade (não-admin só `publicado`), faz
  `fs.createReadStream(file_path)` com **suporte a Range** (`Accept-Ranges: bytes`) e
  `Content-Type` correto (`application/pdf`, `text/html`, `text/markdown`). Isso permite ao
  PDF carregar por partes e o navegador paginar sem baixar tudo.
- **CORS/segurança:** em produção o PWA e a API ficam no mesmo domínio (sem CORS). Adicionar
  `helmet`, rate-limit no `/api/auth/login`, e validar tamanho de upload (o serviço já limita 200 MB).
- **Reuso sem duplicação:** nenhuma regra de negócio é reescrita — as rotas são finas, como os
  `.ipc.ts`. Regra a manter: **serviços nunca importam `electron`**.

## Fase 2 — Frontend PWA

- **Instalabilidade:** adicionar `vite-plugin-pwa` (usa Workbox) ao `vite.config.ts`.
  - `manifest.webmanifest`: `name`, `short_name`, ícones 192/512 (reusar/derivar de `resources/icon.png`), `theme_color`, `background_color`, `display: "standalone"`, `start_url: "/"`, `orientation: "portrait"`.
  - Service worker: **precache do app shell** (HTML/JS/CSS do build) para abrir instantâneo e funcionar com rede ruim.
- **Trocar o transporte em `renderer/lib/api.ts`** (única fronteira): criar
  `renderer/lib/api-http.ts` (cliente `fetch` que injeta `Authorization: Bearer` e trata
  erros/JSON) e fazer `api.ts` escolher em runtime:
  ```ts
  const useIpc = typeof window !== "undefined" && !!window.api;
  export const api = useIpc ? ipcApi : httpApi; // mesma forma → componentes não mudam
  ```
  O `openContent` no modo web vira `GET /api/ebooks/:id/content` (PDF como `ArrayBuffer` via
  `response.arrayBuffer()`; HTML/MD via `response.text()`) — o `EbookReader` não muda.
- **Sem quebrar o desktop:** o build atual do Electron continua usando o ramo `ipcApi`.

## Fase 3 — UI responsiva (mobile)

A UI hoje é desktop (sidebar fixa de 240px, tabela larga no admin). Ajustes com Tailwind
(breakpoints `sm:`/`md:`), sem reescrever componentes:

- **`renderer/components/AppLayout.tsx`** — no mobile, sidebar vira **drawer** (menu hambúrguer)
  ou **barra inferior de abas** (Dashboard / Categorias / Ler). Recomendo barra inferior — é o
  padrão mais confortável em celular.
- **`renderer/routes/Login.tsx`** — layout de 2 colunas → 1 coluna empilhada.
- **`renderer/routes/Category.tsx` / `Dashboard.tsx`** — grades já usam `grid-cols` responsivo;
  revisar espaçamentos e tamanho de toque.
- **`renderer/routes/Admin.tsx`** — a **tabela** de conteúdo não cabe em tela estreita: no
  mobile, renderizar cada ebook como **card empilhado** (título + selects de status/categoria +
  ações) em vez de linhas de tabela.
- **`renderer/components/reader/`** — PDF com botões de página maiores e pinch-zoom; HTML/MD já
  rolam bem. Garantir `viewport` meta e áreas de toque ≥ 44px.

## Fase 4 — Offline (leitura sem conexão)

Recomendação para a v1: **online-first com leitura offline dos ebooks já abertos**.

- App shell sempre disponível offline (precache do SW).
- Ao abrir um ebook, guardar o conteúdo no **Cache API/IndexedDB**; se offline, servir de lá.
- Botão "Baixar para ler offline" por ebook (opcional, fase posterior).
- Progresso de leitura: gravar local e sincronizar com `PUT /progress` quando voltar a rede.

Uma biblioteca 100% offline (baixar tudo antecipadamente) é possível, mas fica para depois —
aumenta complexidade de sincronização e storage no celular.

## Fase 5 — Deploy no VPS

- **Node** roda o servidor Fastify (API + estático do PWA), ou **nginx** serve o estático e faz
  proxy de `/api` para o Node. Recomendo nginx na frente (TLS + estático + proxy).
- **HTTPS obrigatório** — PWA/Service Worker e "instalar na tela inicial" só funcionam sob
  HTTPS. Usar **Let's Encrypt** (certbot) com um domínio.
- **Processo:** `pm2` ou `systemd` para manter o Node vivo; `ESTANTE_JWT_SECRET`,
  `ESTANTE_USER_DATA`, `ESTANTE_EBOOKS_DIR` definidos no ambiente.
- **Banco/arquivos:** `estante.db` (WAL) + pasta de ebooks no disco do VPS; backup com
  Litestream (replica o SQLite para storage externo em tempo real).

---

## Bibliotecas novas (mínimas)

| Pacote | Onde | Para quê |
|---|---|---|
| `fastify` (+ `@fastify/multipart`, `@fastify/static`, `@fastify/helmet`, `@fastify/rate-limit`) | server | API HTTP, upload, estático, segurança |
| `vite-plugin-pwa` | build | manifest + service worker (Workbox) |
| `idb` (opcional) | renderer | cache de ebooks offline (wrapper leve de IndexedDB) |

## Decisões em aberto (posso assumir os defaults recomendados)

1. **Profundidade offline** — recomendo online-first + cache dos ebooks abertos (Fase 4).
2. **Nav mobile** — recomendo barra inferior de abas.
3. **Deploy agora ou depois** — dá para rodar o servidor + PWA **localmente no celular** (mesma
   rede Wi-Fi, via IP do PC) para testar antes de contratar VPS/domínio. Recomendo validar
   local primeiro.

## Ordem de execução

Fase 1 (servidor HTTP + rota de stream) → Fase 2 (vite-plugin-pwa + `api-http.ts` + switch em
`api.ts`) → teste no celular pela rede local → Fase 3 (UI responsiva) → Fase 4 (offline) →
Fase 5 (VPS + HTTPS). O app Electron desktop continua funcionando o tempo todo.

## Arquivos principais

- Novos: `server/index.ts`, `server/routes.ts`, `server/stream.ts`, `renderer/lib/api-http.ts`, `renderer/public/manifest.webmanifest`, ícones PWA.
- Modificados: `renderer/lib/api.ts` (switch IPC/HTTP), `vite.config.ts` (plugin PWA), `renderer/components/AppLayout.tsx` (+ Login/Admin/reader responsivos), `package.json` (deps + scripts `server`/`build:web`).
- Reuso sem mudança: todo `main/services/*`, `main/auth`, `main/db`, `main/config`.
