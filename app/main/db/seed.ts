import { getDb } from "./connection";
import { hashPassword } from "../auth";
import { getEbooksDir } from "../config";

interface SeedEbook {
  title: string;
  kind: string;
  desc: string;
  href: string;
  status: "rascunho" | "pronto" | "publicado" | "verificar";
}

interface SeedCategory {
  cat: string;
  title: string;
  note: string;
  theme: string;
  items: SeedEbook[];
}

const SEED: SeedCategory[] = [
  {
    cat: "01",
    title: "TDAH",
    note: "seu núcleo — é aqui que está o dinheiro",
    theme: "default",
    items: [
      {
        title: "TDAH Depois dos 40",
        kind: "Ebook principal",
        desc: "Guia para quem passou a vida achando que estava quebrado. Produto de R$ 37.",
        href: "01_TDAH/TDAH-Depois-dos-40_versaoA.html",
        status: "rascunho",
      },
      {
        title: "TDAH na Vida Real",
        kind: "Guia de rotina",
        desc: "Entenda, organize e melhore a rotina. Produto 2 ou item de bundle.",
        href: "01_TDAH/TDAH-na-Vida-Real_PDF-REAL.pdf",
        status: "pronto",
      },
      {
        title: "Cartilha TDAH (ABP)",
        kind: "Cartilha · 56 pgs",
        desc: "Nome sugere material de terceiros. Verificar direitos antes de postar.",
        href: "01_TDAH/Cartilha-TDAH-ABP_PDF-REAL.pdf",
        status: "verificar",
      },
    ],
  },
  {
    cat: "02",
    title: "Saúde Feminina",
    note: "segundo nicho — só depois do TDAH vender",
    theme: "alt",
    items: [
      {
        title: "Corpo em Sintonia",
        kind: "Ebook · ciclo",
        desc: "Nutrição, treino e sono pelas 4 fases do ciclo. Finalizar antes.",
        href: "02_Saude_Feminina/Corpo-em-Sintonia_ebook.html",
        status: "rascunho",
      },
      {
        title: "Rotina Leve — Playbook",
        kind: "Playbook · 66 pgs",
        desc: "Produto grande. Avaliar se vira 1 ebook ou vários.",
        href: "02_Saude_Feminina/Rotina-Leve-Playbook_PDF-REAL.pdf",
        status: "rascunho",
      },
      {
        title: "Oráculo da Saúde Feminina",
        kind: "Pesquisa",
        desc: "Relatório de obstáculos 2026. Matéria-prima, não produto pronto.",
        href: "02_Saude_Feminina/Oraculo-Saude-Feminina_PDF-REAL.pdf",
        status: "rascunho",
      },
    ],
  },
  {
    cat: "03",
    title: "Farmacologia & Neurociência",
    note: "órfãos — guardar, não dispersar agora",
    theme: "dark",
    items: [
      {
        title: "Venvanse no Corpo Humano",
        kind: "Ebook",
        desc: "Como o medicamento age. Casa com TDAH — possível bônus/upsell.",
        href: "03_Farmacologia_Neurociencia/Venvanse-no-Corpo-Humano.md",
        status: "rascunho",
      },
      {
        title: "Neuroplasticidade & Psicodélicos",
        kind: "Ebook",
        desc: "O cérebro que se reescreve. Nicho diferente — fila.",
        href: "03_Farmacologia_Neurociencia/Neuroplasticidade-e-Psicodelicos.md",
        status: "rascunho",
      },
    ],
  },
  {
    cat: "05",
    title: "Pesquisas & Análises",
    note: "combustível para tráfego, não produto",
    theme: "sand",
    items: [
      {
        title: "Análise TDAH nas Redes",
        kind: "Relatório",
        desc: "#ADHD 11bi views; história pessoal converte. Use para roteiro de vídeos.",
        href: "05_Pesquisas_Analises/Analise-TDAH-Redes-Sociais_PDF.pdf",
        status: "pronto",
      },
    ],
  },
];

export async function seedIfEmpty() {
  const db = getDb();

  const userCount = (
    db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number }
  ).c;
  if (userCount === 0) {
    db.prepare(
      `INSERT INTO users (username, email, password_hash, role, theme)
       VALUES (?, ?, ?, ?, ?)`
    ).run("ADMIN", "admin@estante.local", hashPassword("201502"), "admin", "light");
    console.log("[seed] ADMIN criado (ADMIN / 201502)");
  } else if (process.env.ESTANTE_RESET_ADMIN === "1") {
    // Recuperação de emergência: só reseta a senha se pedido explicitamente.
    db.prepare(
      `UPDATE users SET password_hash = ?, username = 'ADMIN' WHERE LOWER(username) = 'admin'`
    ).run(hashPassword("201502"));
    console.log("[seed] Senha do ADMIN resetada (ESTANTE_RESET_ADMIN=1)");
  }

  const catCount = (
    db.prepare(`SELECT COUNT(*) AS c FROM categories`).get() as { c: number }
  ).c;
  if (catCount > 0) return;

  let order = 0;
  for (const c of SEED) {
    const info = db
      .prepare(
        `INSERT INTO categories (code, title, note, theme, sort_order)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(c.cat, c.title, c.note, c.theme, order++);

    const categoryId = Number(info.lastInsertRowid);
    for (const it of c.items) {
      const filePath = `${getEbooksDir()}\\${it.href.replace(/\//g, "\\")}`;
      db.prepare(
        `INSERT INTO ebooks (category_id, title, kind, description, file_path, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        categoryId,
        it.title,
        it.kind,
        it.desc,
        filePath,
        it.status
      );
    }
  }
  console.log("[seed] Categorias e ebooks iniciais inseridos.");
}