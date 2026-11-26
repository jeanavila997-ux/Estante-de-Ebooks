# Registro de mudanças

## 01/08/2026 — Organização editorial inicial

- Criado o inventário de materiais em `INVENTARIO-DE-MATERIAIS.md`.
- Documentado o fluxo obrigatório: revisão → aprovação explícita → entrada em `conteudo/`.
- Mantidos todos os ebooks, cópias e caminhos existentes sem movimentação, exclusão ou renomeação.

## 01/08/2026 — Instruções para Claude Code

- Criado `Agentes/CLAUDE.md` com regras operacionais e de segurança para o Claude Code, no mesmo espírito de `AGENTS.md`.
- Atualizado `Agentes/README.md` para referenciar os dois arquivos de instrução.

## 01/08/2026 — Integração do EstanteApp

- Integrado em `app/` o código atualizado do aplicativo Electron/React.
- Incluídos a administração de ebooks e categorias, leitores de PDF/HTML/Markdown, serviços compartilháveis e o modo móvel PWA para rede local.
- Mantidos fora do repositório dados locais, segredos, dependências instaladas, builds, instaladores e materiais editoriais ainda não aprovados.

## 26/11/2026 — Design de telas: avisos educativos e leitor paginado

- Avisos educativos com os textos do design em Login, Dashboard, Categoria e rodapé do leitor (`app/renderer/routes/`).
- Leitor paginado para todos os formatos, com virada de página 3D de 0,8 s e numeração no pé da folha:
  - PDF: cada página do documento é uma folha (`PdfReader.tsx`).
  - HTML e Markdown: o texto flui em colunas CSS da largura da folha e quebra linha a linha, sem páginas vazias.
  - Controles e progresso compartilhados em `components/reader/PagedReader.tsx`; animações em `tailwind.config.ts`.
- Removido `components/reader/ScrollReader.tsx`, que não tinha mais uso depois da paginação em colunas.
- Não implementados nesta etapa: ganchos de 6 segundos e as duas pausas ativas (mini-teste e playground). Dependem de decisão sobre onde esse conteúdo entra nos ebooks.
- Validado com `npm run typecheck` e `npm run build`, e no navegador com um `window.api` simulado (paginação, virada, PDF e layout de celular).
