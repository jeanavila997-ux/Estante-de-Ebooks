# Estante de Ebooks

Esta pasta funciona como centro organizacional do projeto. O código atualizado do `EstanteApp` está integrado em `app/`; os materiais editoriais continuam separados e sujeitos ao fluxo de revisão e aprovação.

## Estrutura

- `app/` — aplicativo desktop Electron/React e seu modo móvel PWA para rede local.
- `conteudo/` — ebooks, textos e demais conteúdos editoriais.
- `documentacao/` — planos, decisões, manuais e documentação técnica.
- `midia/` — imagens, capas, ícones, vídeos e outros materiais visuais.
- `backups/` — cópias de segurança organizadas e identificadas por data.

Antes de adicionar arquivos, confirme a pasta adequada e evite duplicar dados sem necessidade.

## Aplicativo

As instruções de instalação, execução e arquitetura estão em `app/README.md` e `app/AGENTS.md`. Para abrir no Windows, use `app/ABRIR-ESTANTE.bat`.

## Fluxo para novos ebooks

`Plano e Ideias/arquivos variados/` é uma área de referência e estudo. Nenhum arquivo desse local deve ser tratado como conteúdo publicado ou copiado para `conteudo/` automaticamente.

O fluxo obrigatório é: **revisão → aprovação explícita do usuário → entrada em `conteudo/`**. Após a aprovação, registre a origem, a licença ou autorização de uso, o formato e o destino no inventário da documentação.
