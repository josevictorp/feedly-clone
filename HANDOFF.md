# HANDOFF.md — Estado para a próxima sessão

Sobrescreva a seção "Estado atual" ao fim de cada sessão. Não acumule histórico aqui; histórico vai para CHANGELOG.md.

## Estado atual

**Data:** 2026-09-16

**Fase:** EXECUÇÃO da fatia 1. **M0, M1, M2 e M3 concluídos.** Backend completo e testado; nenhuma tela ainda. Próximo marco: **M4 (Design system e casca)** — o primeiro com gate visual, que termina em aprovação do usuário.

**Documentos que governam a execução (leia nesta ordem):**

1. `CLAUDE.md` — regras, convenções, commits.
2. `docs/prd/2026-09-16-prd-fatia-1-leitor-base.md` — **documento vivo**: seção 0 tem a tabela de progresso, seção 8 o plano por marco com checkboxes. Marque o que entregar.
3. `docs/superpowers/specs/2026-09-16-feedly-clone-leitor-base-design.md` — seção 5 = modelo de dados, 7 = API, 8 = front e design system, 13 = stack, 14 = grelha.
4. `docs/research/README.md` — índice das 72 capturas e do CSS extraído. `docs/research/feedly-research.md` seções 2.1 e 2.9 a 2.11 = tokens de cor, fontes, dimensões. **O M4 começa aqui.**
5. `MEMORY.md`, `INCIDENTS.md`, `AGENTS.md`.

**O que já existe (backend pronto de ponta a ponta):**

- **M0** monorepo pnpm 12 / Node 26 / TypeScript 5.9 estrito, ESLint 10, Prettier, Vitest, Playwright. Scripts na raiz (ver AGENTS.md).
- **M1** schema Drizzle das 6 tabelas com índices, migrações no boot com backup, preferências semeadas com os padrões reais do Feedly, repositórios, sidebar em 1 statement, paginação por cursor, retenção diária.
- **M2** motor de feeds: fetch condicional com timeout, charset (header → prólogo → UTF-8), parser RSS 2.0/Atom/RDF/JSON Feed, normalização, sanitização, descoberta em 3 etapas, favicon em cache, OPML ida e volta. 15 fixtures em `apps/server/src/feeds/__fixtures__/`.
- **M3** agendador (concorrência 4, backoff, refresh prioritário), todas as rotas `/api` com Zod em `packages/shared`, SSE em `/api/events`.
- **321 testes passando** (319 Vitest + 2 Playwright). `pnpm test`, `pnpm lint` e `pnpm typecheck` limpos.

**Próximo passo exato: M4 (Design system e casca), PRD seção 8.**

- Tokens CSS claro e escuro a partir de `docs/research/feedly-research.md`; fontes locais via Fontsource; SVGs extraídos de `docs/research/dom/` para `design-system/icons/`.
- Componentes base: Button, IconButton, Menu, Submenu, Modal, Tooltip, Tabs, Radio, Toggle, Avatar, Favicon, UnreadBadge.
- Layout raiz com react-router; sidebar completa de 320 px (perfil, links, Ler depois, Lidos recentemente, Feeds com pastas e contadores, "N feeds a mais", menus "..." e "+", rodapé, fixar/esconder/peek); header do stream com as ações.
- Tema sistema/claro/escuro sem recarregar. Dicionário pt-BR com teste que falha em chave faltando.
- Hook global de atalhos: `g t`, `g a`, `g l`, `g i`, `g o`, `g p`, `[`, `?`, `⌘K` (páginas destino podem ser placeholders).
- **Gate visual do M4:** sidebar escondida; Todos em tema escuro (lista vazia mascarada). Termina em aprovação do usuário — parar e mostrar.

**Regras que valem na execução:**

- Só o que está no PRD. Ideia nova → BACKLOG.md. Feature nova → brainstorm antes.
- Commit a cada mudança significativa. Push só quando o usuário pedir.
- Português nas respostas e docs; inglês no código e commits.
- Perguntas de decisão via componente do VS Code (AskUserQuestion), não no corpo do chat.
- TDD no motor de feeds, no agendador e na API; no front, teste junto com o componente.
- M0 a M3 são aprovados por testes; M4 a M8 fecham com gate visual e aprovação do usuário; M9 fecha a fatia.
- Bugs e armadilhas → INCIDENTS.md.

**Ambiente:**

- Node 26.8.1, pnpm 12.4.2 (instalado por `npm i -g pnpm@12.4.2`; Node 26 não traz corepack). Chromium do Playwright já em cache.
- **Porta 3000 está ocupada por outro projeto do usuário** (`pulse`, Next.js dev). Rodar com `PORT=3001 pnpm start` ou parar o outro processo. Ver INCIDENTS.
- `allowBuilds` no `pnpm-workspace.yaml`: better-sqlite3 **negado** de propósito (usa binário pronto), esbuild liberado. Ver INCIDENTS.
- OPML real do usuário em `docs/research/feedly-export.opml`; cópia reduzida como fixture em `apps/server/src/opml/__fixtures__/`. Copiar o real para `data/feedly-export.opml` no M9.

**Pendências abertas:** ver BACKLOG.md.
