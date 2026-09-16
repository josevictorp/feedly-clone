# HANDOFF.md — Estado para a próxima sessão

Sobrescreva a seção "Estado atual" ao fim de cada sessão. Não acumule histórico aqui; histórico vai para CHANGELOG.md.

## Estado atual

**Data:** 2026-09-16

**Fase:** EXECUÇÃO liberada. Spec e PRD aprovados pelo usuário. Nenhum código de app escrito ainda. Próximo marco: **M0 (Fundação)**.

**Documentos que governam a execução (leia nesta ordem):**
1. `CLAUDE.md` — regras, convenções, commits.
2. `docs/prd/2026-09-16-prd-fatia-1-leitor-base.md` — requisitos (RF/RNF) e plano em 10 marcos (M0 a M9). Seção 8 tem o que entregar em cada marco; seção 11 tem o processo.
3. `docs/superpowers/specs/2026-09-16-feedly-clone-leitor-base-design.md` — design detalhado. Seção 13 = stack e versões fixadas. Seção 14 = decisões da grelha.
4. `docs/research/README.md` — índice das capturas e do CSS extraído; `docs/research/feedly-research.md` seções 2.1 e 2.9 a 2.11 = tokens de cor, fontes, dimensões.
5. `MEMORY.md` e `INCIDENTS.md`.

**Feito nesta sessão (2026-09-16):**
- Brainstorm (7 perguntas, 8 seções de design), grelha (21 decisões), spec, PRD. Tudo aprovado.
- 72 capturas do Feedly real + DOM + tokens em `docs/research/`.
- Docs de controle criados. Skills instaladas em `.claude/skills/`.

**Próximo passo exato: executar o M0 conforme o PRD, seção 8.**
- Monorepo pnpm (`apps/server`, `apps/web`, `packages/shared`), `.nvmrc` = 26, TS estrito, ESLint, Prettier.
- Server Hono com `/api/health` e estáticos; web Vite + React 19 com página em branco e título "Feedly"; shared com build.
- Scripts `pnpm dev`, `build`, `start` (abre navegador), `test`, `lint`, `typecheck`.
- Vitest e Playwright com um teste cada. `data/` + `FEEDLY_DATA_DIR` + `PORT`.
- README "como rodar" e AGENTS.md com comandos.
- Pronto quando `pnpm start` abre `http://localhost:3000` e `pnpm test` passa. Commitar e atualizar CHANGELOG/HANDOFF. Depois seguir para M1.

**Regras que valem na execução:**
- Só o que está no PRD. Ideia nova → BACKLOG.md. Feature nova → brainstorm antes.
- Commit a cada mudança significativa. Nunca push sem pedir.
- Português nas respostas e docs; inglês no código e commits.
- Perguntas de decisão via componente do VS Code (AskUserQuestion), não no corpo do chat.
- M0 a M3 são aprovados por testes; M4 a M8 fecham com gate visual e aprovação do usuário; M9 fecha a fatia.
- Bugs e armadilhas → INCIDENTS.md.

**Ambiente:**
- Node 26.8.1 instalado, pnpm via npx ou corepack (verificar). Chrome 153.
- Chrome de captura: perfil em `~/.local/share/feedly-clone/chrome-profile`, porta 9333, ver `docs/research/README.md` para recapturar.
- OPML real do usuário ainda NÃO foi exportado; pedir ao usuário antes do M9 (Feedly → Preferences → Privacy & Personal Data → Export OPML) e salvar em `data/feedly-export.opml`.

**Pendências abertas:** ver BACKLOG.md.
