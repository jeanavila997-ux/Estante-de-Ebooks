# Abrir a Estante no iPhone (PWA)

Versão web instalável para ler os ebooks no celular, na mesma rede Wi‑Fi do PC.

## Como usar

1. No PC, dê **duplo clique** em **`ABRIR-NO-IPHONE.bat`** (na pasta do projeto).
   Vai abrir uma janela preta mostrando um endereço, por exemplo:
   `http://192.168.1.103:8080`
2. No **iPhone** (conectado no **mesmo Wi‑Fi**), abra o **Safari** e digite esse endereço.
3. Faça login (admin: `ADMIN` / sua senha).
4. Para instalar como app: toque em **Compartilhar** (ícone de seta) → **Adicionar à Tela de Início**.
   Vai criar um ícone de livro na tela inicial, abrindo em tela cheia como um app.

Deixe a janela preta aberta no PC enquanto estiver usando no iPhone. Para encerrar, feche a janela.

## Observações

- **Clientes só veem ebooks `publicado`.** Crie contas de cliente (papel `user`) na
  Administração do app de desktop; elas verão apenas o que estiver publicado.
- **PDF** abre no leitor nativo do iPhone; **HTML/Markdown** abrem dentro do próprio app.
- Só funciona com o PC ligado e na mesma rede. Para acesso de qualquer lugar (internet),
  é preciso publicar num VPS com HTTPS — ver `PLANO-PWA.md`.
- O cache offline (Service Worker) só ativa sob HTTPS; na rede local via `http://` a
  "Adicionar à Tela de Início" funciona, mas sem leitura offline.
- Porta padrão 8080. Para trocar: rode `set PORT=9000` antes, ou edite o `.bat`.
