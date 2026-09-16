# MEMORY.md — Memória rápida do projeto

Uma linha por item, com data. Fatos, decisões e achados que outra sessão precisaria saber. Não repita o que já está em código ou em spec; aponte para lá.

## Decisões

- 2026-09-16 — Projeto é um clone local do Feedly, visualmente fiel, com recursos premium. Sem hospedagem por enquanto.
- 2026-09-16 — Fluxo obrigatório: brainstorm → grill → PRD → aprovação → execução. Nenhum código antes da aprovação do PRD.
- 2026-09-16 — Design system será cópia fiel do Feedly, não uma reinterpretação.
- 2026-09-16 — O projeto será decomposto em sub-projetos ordenados; a primeira spec cobre o primeiro deles.

## Decisões de design (brainstorm)

- 2026-09-16 — Q1 forma do produto: **web app em localhost** com servidor local e banco local (opção B). App desktop e só-navegador descartados.
- 2026-09-16 — Q2 ordem dos sub-projetos aprovada: 1) leitor base, 2) organização premium (Read Later, Boards, notas/highlights, tags, busca), 3) Leo (prioridade, mute, dedupe, resumos, tópicos), 4) descoberta e fontes extras (Explore, newsletters, Reddit, YouTube, integrações). Primeira spec cobre só a fatia 1.
- 2026-09-16 — Q3 referência visual: o usuário tem conta Feedly logada no Chrome; capturas serão feitas via integração Claude in Chrome (extensão instalada na máquina, mas sem ferramentas de browser ativas nesta sessão do VS Code; precisa reconectar/reiniciar). Screenshots vão para `docs/research/screenshots/`.
- 2026-09-16 — Q4 stack: sem restrições (opção A). Direção anunciada: TypeScript ponta a ponta, React no front, servidor Node único (API + front), SQLite local. Decisão final na etapa de abordagens.
- 2026-09-16 — Q5 idioma da UI: **português desde o início** (opção B). Layout deve absorver textos mais longos sem quebrar a fidelidade.
- 2026-09-16 — Q6 critério de aceite da fatia 1 aprovado: importar OPML com pastas/favicons/contadores; fetch automático + refresh manual; Today/All/pasta/feed nos 4 modos indistinguíveis das capturas em 1440x900 (exceto idioma); leitor inline com j/k/o/m/v/s e g t/g a/g l/?/[/Cmd+K; lido, marcar tudo, esconder lidos, ordenação e tema persistem.
- 2026-09-16 — Q7 abordagem escolhida: **A) SPA React (Vite + TS) + servidor Node único (API + agendador + estáticos) + SQLite (Drizzle)**. Next.js e SPA pura descartados.
- 2026-09-16 — Conta do usuário no Feedly é o plano gratuito (botão Upgrade visível); telas exclusivas de Pro/Pro+ (Boards, Leo, notas) precisam de referência externa (docs/blog) ou de upgrade temporário.

- 2026-09-16 — Grelha (21 decisões) registrada na seção 14 da spec; todas seguiram a recomendação. Stack fixada na seção 13: Node 26, pnpm, Hono, Drizzle 0.45 + better-sqlite3 13, feedsmith 2.x, Vite 8, React 19, TanStack Query/Virtual, Zustand, CSS Modules, Vitest, Playwright.
- 2026-09-16 — Usuário prefere perguntas via componente do VS Code (AskUserQuestion), não no corpo do chat.

## Achados sobre o Feedly

- 2026-09-16 — Pesquisa completa em `docs/research/feedly-research.md`: tiers e limites, tokens de cor light/dark/night extraídos do CSS de produção, fontes (Inter no app), dimensões de sidebar/header/cards, atalhos, modelo de dados da API (streams, categories, entries, tags, markers), clones open source e stacks.
- 2026-09-16 — 72 capturas da UI real em `docs/research/screenshots/` (índice em `docs/research/README.md`) e HTML renderizado em `docs/research/dom/`. Cobrem: Today, All, pasta, feed, 4 modos de leitura, leitor inline, atalhos, preferências (8 abas), discover/follow, tema escuro, densidades, menus de sidebar/header/leitor, Boards, Ask AI.
- 2026-09-16 — Feedly atual: sidebar 320px; header com Upgrade; ações do header: mark all read, Ask AI, share, refresh, more; modos Title-Only/Magazine/Cards/Article; leitor abre como painel deslizante à direita (exceto no Article view, que é inline); fonte do corpo do artigo é Merriweather por padrão (Inter opcional); temas System/Light/Dark (sem Night no menu atual); densidades Compact/Cozy/Comfortable.
- 2026-09-16 — Aba Mark as Read do Feedly tem 5 opções: botão gigante (sim), auto-mark ao rolar (só Article view | todas | não; padrão só Article), ao navegar n/p (não), ao clicar no contador (não), menu "older than" no marcar tudo (sim). Menu Sort: Most Shared, Most Shared + Newest, Newest, Oldest. Filter: Unread Only, Show Muted. Sidebar recolhe feeds com 0 não lidos em "N more feeds".

## Restrições e contexto técnico

- 2026-09-16 — Repositório git já inicializado. Usuário pediu commit a cada mudança significativa (regra em CLAUDE.md).
- 2026-09-16 — Skills instaladas em `.claude/skills/`: brainstorming, grill-me, grilling.
- 2026-09-16 — Claude in Chrome não está registrado no Chrome (sem native host em NativeMessagingHosts) e o perfil do Chrome é protegido por TCC (sem Full Disk Access). Solução: Chrome separado com perfil em `~/.local/share/feedly-clone/chrome-profile`, `--remote-debugging-port=9333`, controlado por playwright-core via CDP (script `shot.js` no scratchpad da sessão). Usuário loga no Feedly uma vez nesse perfil; o login persiste entre sessões.

## Preferências do usuário

- 2026-09-16 — Escreve em português; quer ser "grelhado" nas decisões antes do PRD; quer ler e aprovar o PRD antes de qualquer execução.
