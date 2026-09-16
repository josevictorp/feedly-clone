# CHANGELOG.md

Registro das principais mudanças. Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas em ISO.

## [Unreleased]

### Adicionado
- 2026-09-16 — **M3 (Agendador, API e SSE).** Agendador em processo com tique de 60 s, concorrência 4, GET condicional, backoff de 30 min a 24 h, refresh prioritário e varredura no boot. Todas as rotas da spec (streams, entries, feeds, categories, sidebar, today, preferences, OPML, health) com validação Zod em `packages/shared`. SSE em `/api/events` com heartbeat, alimentado pelo agendador e pelas mutações. Servidor HTTP falso e relógio fixo nos testes. Logs pino por fetch. 319 testes unitários e de integração.
- 2026-09-16 — **M2 (Motor de feeds).** Fetch com timeout, User-Agent e GET condicional; detecção de charset (header → prólogo XML → UTF-8) antes do parse; parser feedsmith cobrindo RSS 2.0, Atom, RDF e JSON Feed; normalização de título, conteúdo, resumo, imagem, URLs relativas, datas e identidade; sanitização com allowlist ampla de texto e iframes só de YouTube/Vimeo em sandbox; descoberta de feed em três etapas; favicon com cache em `data/favicons/`; import e export de OPML com ida e volta. 15 fixtures congeladas (9 de feeds reais, 6 escritas à mão para os casos hostis). 252 testes unitários.
- 2026-09-16 — **M1 (Banco e modelo).** Schema Drizzle das seis tabelas da spec com os índices listados, migrações aplicadas no boot (com backup do `feedly.db` antes de atualizar um banco existente) e preferências semeadas com os padrões reais do Feedly. Repositórios de feeds, pastas, entradas, configurações por stream e preferências; consulta de sidebar agregada em um único statement SQL; paginação de stream por cursor `(ordem, id)`; job de retenção determinístico com agendamento diário. 86 testes unitários contra SQLite em memória.
- 2026-09-16 — **M0 (Fundação).** Monorepo pnpm com `apps/server` (Hono + `/api/health` + estáticos), `apps/web` (Vite 8 + React 19, página em branco com título "Feedly") e `packages/shared` (contrato da API, com build). TypeScript estrito em modo solução, ESLint 10 flat config, Prettier. Scripts `dev`, `build`, `start`, `serve`, `test`, `test:unit`, `test:e2e`, `lint`, `typecheck`, `format`. Vitest com o teste da rota de saúde e Playwright com o smoke do SPA. `data/` configurável por `FEEDLY_DATA_DIR`; porta por `PORT`.
- 2026-09-16 — Spec e PRD da fatia 1 aprovados pelo usuário. Execução liberada.
- 2026-09-16 — PRD da fatia 1 com plano de execução em 10 marcos: `docs/prd/2026-09-16-prd-fatia-1-leitor-base.md`. Grelha de 21 decisões incorporada à spec.
- 2026-09-16 — Spec de design da fatia 1 (leitor base) aprovada em conversa: `docs/superpowers/specs/2026-09-16-feedly-clone-leitor-base-design.md`.
- 2026-09-16 — Pesquisa de referência do Feedly em `docs/research/` (documento, 72 screenshots, DOM, tokens de CSS).
- 2026-09-16 — Documentação de controle do projeto: README, CLAUDE.md, AGENTS.md, MEMORY.md, BACKLOG.md, CHANGELOG.md, HANDOFF.md, INCIDENTS.md.
- 2026-09-16 — Skills instaladas em `.claude/skills/`: brainstorming (obra/superpowers), grill-me e grilling (mattpocock/skills).
