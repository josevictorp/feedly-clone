# AGENTS.md — Instruções para outras sessões e IAs

Este arquivo existe para qualquer agente que não seja a sessão principal do Claude Code: outra sessão, um subagente, outro modelo, outra ferramenta. Ele resume o que está em [CLAUDE.md](CLAUDE.md), que continua sendo a fonte de verdade.

## Antes de fazer qualquer coisa

1. Leia [CLAUDE.md](CLAUDE.md) inteiro.
2. Leia [HANDOFF.md](HANDOFF.md) para saber onde o trabalho parou.
3. Leia [MEMORY.md](MEMORY.md) para decisões e achados.
4. Leia [INCIDENTS.md](INCIDENTS.md) para não cair em armadilhas já conhecidas.
5. Se for implementar algo, confirme que existe spec aprovada em `docs/superpowers/specs/` e PRD aprovado em `docs/prd/` cobrindo aquilo. Se não existir, pare e avise.

## O que este projeto é

Clone local do Feedly com fidelidade visual total e recursos premium. Sem hospedagem. Fase atual: execução da fatia 1 (leitor base), conforme o PRD em `docs/prd/`.

## Regras que valem para todos os agentes

- **Nenhum código de aplicação antes da aprovação do PRD pelo usuário.**
- **Fidelidade visual ao Feedly é requisito.** Não redesenhe, copie.
- **Português nas respostas e docs; inglês no código e nos commits.**
- **Commite a cada mudança significativa.** Não deixe trabalho sem commit ao final de uma etapa. Nunca faça push sem o usuário pedir.
- **Não envie** dados do projeto para serviços externos.
- **Escopo fechado:** faça só o que a fatia atual do plano pede. Ideias fora dela vão para [BACKLOG.md](BACKLOG.md).

## Ao terminar

- Marque no PRD (`docs/prd/`) os checkboxes do que foi entregue e atualize a tabela de progresso da seção 0. O PRD é documento vivo.
- Atualize [HANDOFF.md](HANDOFF.md) com o estado exato e o próximo passo.
- Registre mudanças relevantes em [CHANGELOG.md](CHANGELOG.md).
- Registre bugs e armadilhas em [INCIDENTS.md](INCIDENTS.md).
- Registre achados e decisões em [MEMORY.md](MEMORY.md).

## Stack e comandos

Stack fixada na spec (seção 13): Node 26, pnpm 12, TypeScript estrito; Hono 4 + `@hono/node-server` 2, Drizzle 0.45 + better-sqlite3 13, feedsmith 2.x, sanitize-html, pino; Vite 8, React 19, react-router, TanStack Query/Virtual, Zustand, CSS Modules; Vitest, Playwright 1.63.

Monorepo pnpm com `apps/server`, `apps/web` e `packages/shared`. Comandos na raiz:

| Comando | O que faz |
|---|---|
| `pnpm install` | Instala tudo. |
| `pnpm dev` | Servidor em watch (3000) + Vite (5173) com proxy de `/api`. |
| `pnpm build` | Compila shared → web → server. |
| `pnpm start` | Build e sobe em `http://localhost:3000`, abrindo o navegador. |
| `pnpm serve` | Sobe o build já feito, sem abrir o navegador. |
| `pnpm test` | `test:unit` (Vitest) e `test:e2e` (Playwright). |
| `pnpm lint` | ESLint (flat config em `eslint.config.mjs`). |
| `pnpm typecheck` | `tsc --build --force` na solução. |

Convenções de código:

- ESM em todo lugar (`"type": "module"`). TypeScript estrito, sem `any`.
- Imports relativos levam a extensão `.ts`/`.tsx` (`rewriteRelativeImportExtensions`); em dev o servidor roda direto do fonte, via type stripping do Node 26.
- Nada de `console.*` no servidor: use o `logger` do pino em `apps/server/src/logger.ts`.
- Variáveis de ambiente: `PORT` (3000), `FEEDLY_DATA_DIR` (`./data`), `LOG_LEVEL` (`info`).
- TDD obrigatório no motor de feeds, no agendador e na API (PRD, seção 11).
- Prettier não toca em `docs/`, `.claude/` nem em `*.md`: specs aprovadas e docs de controle são escritas à mão.

## Skills

Em `.claude/skills/`: `brainstorming` (obrigatória antes de implementar), `grill-me` / `grilling` (entrevista de decisões, só a pedido do usuário).
