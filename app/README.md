# Estante de Ebooks (EstanteApp)

Aplicativo desktop desenvolvido com **Electron**, **React**, **TypeScript**, **Vite** e **Tailwind CSS** para catalogação, gerenciamento e leitura de ebooks (PDF, HTML e Markdown), com área administrativa para controlar o que os clientes veem.

---

## 📐 Estrutura do Projeto

```text
EstanteApp/
├── main/                   # Processo Principal (Electron Main Process)
│   ├── auth/               # Autenticação (JWT + bcryptjs)
│   ├── config.ts           # Configuração da instalação (caminhos + segredo JWT)
│   ├── db/                 # Banco de Dados (SQLite com node:sqlite)
│   │   ├── connection.ts   # Conexão e PRAGMAs do SQLite
│   │   ├── schema.ts       # Definição das tabelas
│   │   └── seed.ts         # Dados iniciais e admin padrão
│   ├── services/           # Lógica de negócio pura (sem dependência do Electron)
│   ├── ipc/                # Handlers IPC — adaptadores finos sobre os services
│   ├── types/              # Definições TypeScript para node:sqlite
│   ├── main.ts             # Janela do Electron e ciclo de vida da aplicação
│   └── preload.ts          # ContextBridge para comunicação segura Main <-> Renderer
├── renderer/               # Processo do Renderizador (React + Vite)
│   ├── components/         # UI (Button, Card, Input, AppLayout, admin/, reader/)
│   ├── lib/                # Utilitários, cliente API IPC e hooks
│   ├── routes/             # Páginas (Dashboard, EbookReader, Category, Login, Settings, Admin)
│   ├── store/              # Gerenciamento de estado (Zustand: auth, theme)
│   ├── styles/             # Estilos CSS globais (Tailwind CSS)
│   ├── App.tsx             # Roteamento de páginas (React Router)
│   └── main.tsx            # Ponto de entrada do React
├── shared/                 # Tipos TypeScript compartilhados (Main + Renderer)
│   └── types.ts
├── resources/icon.png      # Ícone do instalador
├── package.json            # Scripts de build, dev e dependências
├── tailwind.config.ts      # Configuração do Tailwind CSS
├── tsconfig.main.json      # Configuração TypeScript do Main Process (emite dist/main)
├── tsconfig.json           # Configuração TypeScript do Renderer (noEmit; Vite bunda)
└── vite.config.ts          # Configuração do Bundler Vite
```

---

## 🗄️ Banco de dados e arquivos

O app usa **SQLite** (módulo nativo `node:sqlite`, requer Electron 35+ / Node 22.5+). Na primeira execução ele cria:

- `%APPDATA%\estante-app\config.json` — configuração da instalação (caminhos e segredo JWT gerado aleatoriamente);
- `%APPDATA%\estante-app\estante.db` — o banco;
- `%APPDATA%\estante-app\ebooks\` — pasta onde os ebooks importados são guardados.

Variáveis de ambiente (todas opcionais, vencem o `config.json`):

| Variável | Efeito |
| --- | --- |
| `ESTANTE_DB_PATH` | Caminho do arquivo do banco |
| `ESTANTE_EBOOKS_DIR` | Pasta dos ebooks |
| `ESTANTE_JWT_SECRET` | Segredo JWT (útil no servidor) |
| `ESTANTE_USER_DATA` | Pasta base de configuração (permite rodar fora do Electron) |
| `ESTANTE_RESET_ADMIN=1` | Reseta a senha do ADMIN para o padrão no próximo boot (recuperação) |

Compatibilidade: se `D:\DOWNLOADS\BANCO DE DADOS\estante.db` ou `D:\DOWNLOADS\Ebooks` existirem, são adotados automaticamente na primeira execução.

## 👥 Papéis e visibilidade

- **admin** — vê tudo; acessa a página **Administração** (`/admin`): importação de ebooks (arrastar e soltar, múltiplos arquivos PDF/HTML/MD), edição de metadados, mudança de categoria/status, exclusão, e CRUD/reordenação de categorias.
- **user** (cliente) — vê **apenas ebooks com status `publicado`**. Os status `rascunho`, `pronto` e `verificar` são fluxo interno do admin.

O leitor embutido suporta **PDF** (react-pdf), **HTML** e **Markdown** (sanitizados com DOMPurify), com progresso de leitura salvo por usuário e restaurado ao reabrir.

### Credenciais Padrão
- **Usuário**: `ADMIN`
- **Senha**: `201502` (troque em Configurações após o primeiro login)

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Node.js 22.5+ (recomendado 22 LTS ou superior)
- npm

### Comandos Principais

1. **Instalar dependências**: `npm install`
2. **Modo Desenvolvimento** (Main em watch + Vite): `npm run dev` e, em outro terminal, `npm run electron:dev`
3. **Verificação de Tipos**: `npm run typecheck`
4. **Compilar para Produção**: `npm run build`
5. **Rodar o app compilado**: `npx electron .`
6. **Gerar Instalador Windows (NSIS)**: `npm run dist` → saída em `release/`

---

## ☁️ Roadmap: migração para VPS (acesso web dos clientes)

A arquitetura atual já foi preparada para virar um site acessado pelos clientes:

1. **API HTTP** — a lógica de negócio vive em `main/services/*` e não importa nada do Electron. Basta escrever um adaptador Fastify/Express que extraia o token do header `Authorization` → `authenticate(token)` → chame o serviço (mesmo papel que os arquivos `main/ipc/*.ipc.ts` fazem hoje). Rodar com `ESTANTE_USER_DATA` apontando para uma pasta do servidor.
2. **Banco** — o SQLite continua servindo bem no VPS no início (WAL + backups com Litestream). Migrar para PostgreSQL apenas se surgir concorrência de escrita relevante.
3. **Arquivos** — servir os ebooks por endpoint autenticado com streaming; o contrato `openContent` (formato + dados) se traduz direto.
4. **Frontend web** — o renderer é React puro; `renderer/lib/api.ts` é a única fronteira com `window.api`. Trocar por um cliente `fetch` é a única mudança estrutural. **Regra a preservar: componentes nunca chamam `window.api` diretamente, sempre via `api.ts`.**
5. **Auth** — trocar o TTL fixo de 30 dias por access + refresh tokens e definir `ESTANTE_JWT_SECRET` no servidor.
