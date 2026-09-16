# HANDOFF.md — Estado para a próxima sessão

Sobrescreva a seção "Estado atual" ao fim de cada sessão. Não acumule histórico aqui; histórico vai para CHANGELOG.md.

## Estado atual

**Data:** 2026-09-16

**Fase:** EXECUÇÃO da fatia 1. Spec e PRD aprovados. **M0 (Fundação) concluído.** Em andamento: M1 (Banco e modelo).

**Documentos que governam a execução (leia nesta ordem):**

1. `CLAUDE.md` — regras, convenções, commits.
2. `docs/prd/2026-09-16-prd-fatia-1-leitor-base.md` — requisitos (RF/RNF) e plano em 10 marcos (M0 a M9). Seção 8 tem o que entregar em cada marco; seção 11 tem o processo.
3. `docs/superpowers/specs/2026-09-16-feedly-clone-leitor-base-design.md` — design detalhado. Seção 5 = modelo de dados, seção 7 = API, seção 13 = stack, seção 14 = decisões da grelha.
4. `docs/research/README.md` — índice das capturas e do CSS extraído; `docs/research/feedly-research.md` seções 2.1 e 2.9 a 2.11 = tokens de cor, fontes, dimensões.
5. `MEMORY.md`, `INCIDENTS.md` e `AGENTS.md` (comandos e convenções de código).

**M0 entregue (2026-09-16):**

- Monorepo pnpm: `apps/server`, `apps/web`, `packages/shared`. Node 26 (`.nvmrc`), pnpm 12, TypeScript 5.9 estrito em modo solução (`tsc --build`).
- `apps/server`: Hono 4 + `@hono/node-server` 2, rota `GET /api/health`, 404 tipado em `/api/*`, estáticos do SPA com fallback para `index.html`, logger pino, `EADDRINUSE` tratado.
- `apps/web`: Vite 8 + React 19, página em branco com título "Feedly", proxy de `/api` no dev.
- `packages/shared`: contrato da API (`API_PREFIX`, `HealthResponse`) com build para `dist/`.
- ESLint 10 flat config + Prettier (Prettier não toca em `docs/`, `.claude/` nem `*.md`).
- Vitest: 2 testes da API. Playwright 1.63: 2 testes de smoke contra o build real, em porta e `FEEDLY_DATA_DIR` próprios.
- README com "como rodar"; AGENTS.md com stack, comandos e convenções.

**Próximo passo exato: M1 (Banco e modelo), PRD seção 8.**

- Schema Drizzle das tabelas da spec seção 5 (`feeds`, `categories`, `feed_categories`, `entries`, `stream_settings`, `preferences`) com os índices listados lá.
- Migrações rodando no boot, com backup de `feedly.db` antes de migrar.
- Preferências semeadas com os padrões da spec na primeira execução.
- Repositórios (`feeds`, `categories`, `entries`, `streamSettings`, `preferences`) com as consultas agregadas de sidebar e de stream (paginação por cursor).
- Job de retenção: função pura + agendamento diário (lidos > 30 dias, teto de 1000 por feed, nunca apaga não lidos nem salvos).
- Testes: unitários dos repositórios contra SQLite em memória, retenção, e um teste provando que a consulta de sidebar não faz N+1.

**Regras que valem na execução:**

- Só o que está no PRD. Ideia nova → BACKLOG.md. Feature nova → brainstorm antes.
- Commit a cada mudança significativa. Nunca push sem pedir.
- Português nas respostas e docs; inglês no código e commits.
- Perguntas de decisão via componente do VS Code (AskUserQuestion), não no corpo do chat.
- TDD no motor de feeds, no agendador e na API.
- M0 a M3 são aprovados por testes; M4 a M8 fecham com gate visual e aprovação do usuário; M9 fecha a fatia.
- Bugs e armadilhas → INCIDENTS.md.

**Ambiente:**

- Node 26.8.1, pnpm 12.4.2 (instalado via `npm i -g pnpm@12.4.2`; Node 26 não traz corepack). Chrome 153; Chromium do Playwright já em cache.
- **Porta 3000 está ocupada por outro projeto do usuário** (`pulse`, Next.js dev). Ver INCIDENTS. Para rodar: parar o outro processo ou usar `PORT=3001`.
- Chrome de captura: perfil em `~/.local/share/feedly-clone/chrome-profile`, porta 9333, ver `docs/research/README.md` para recapturar.
- O OPML real do usuário já está em `docs/research/feedly-export.opml` (48 linhas). Copiar para `data/feedly-export.opml` no M9.

**Pendências abertas:** ver BACKLOG.md.
