# AGENTS.md — Instruções para outras sessões e IAs

Este arquivo existe para qualquer agente que não seja a sessão principal do Claude Code: outra sessão, um subagente, outro modelo, outra ferramenta. Ele resume o que está em [CLAUDE.md](CLAUDE.md), que continua sendo a fonte de verdade.

## Antes de fazer qualquer coisa

1. Leia [CLAUDE.md](CLAUDE.md) inteiro.
2. Leia [HANDOFF.md](HANDOFF.md) para saber onde o trabalho parou.
3. Leia [MEMORY.md](MEMORY.md) para decisões e achados.
4. Leia [INCIDENTS.md](INCIDENTS.md) para não cair em armadilhas já conhecidas.
5. Se for implementar algo, confirme que existe spec aprovada em `docs/superpowers/specs/` e PRD aprovado em `docs/prd/` cobrindo aquilo. Se não existir, pare e avise.

## O que este projeto é

Clone local do Feedly com fidelidade visual total e recursos premium. Sem hospedagem. Fase atual: design (nenhum código de app ainda).

## Regras que valem para todos os agentes

- **Nenhum código de aplicação antes da aprovação do PRD pelo usuário.**
- **Fidelidade visual ao Feedly é requisito.** Não redesenhe, copie.
- **Português nas respostas e docs; inglês no código e nos commits.**
- **Commite a cada mudança significativa.** Não deixe trabalho sem commit ao final de uma etapa. Nunca faça push sem o usuário pedir.
- **Não envie** dados do projeto para serviços externos.
- **Escopo fechado:** faça só o que a fatia atual do plano pede. Ideias fora dela vão para [BACKLOG.md](BACKLOG.md).

## Ao terminar

- Atualize [HANDOFF.md](HANDOFF.md) com o estado exato e o próximo passo.
- Registre mudanças relevantes em [CHANGELOG.md](CHANGELOG.md).
- Registre bugs e armadilhas em [INCIDENTS.md](INCIDENTS.md).
- Registre achados e decisões em [MEMORY.md](MEMORY.md).

## Stack e comandos

Stack fixada na spec (seção 13): Node 26, pnpm, TypeScript; Hono, Drizzle + better-sqlite3, feedsmith; Vite, React 19, TanStack Query/Virtual, Zustand, CSS Modules; Vitest, Playwright. Comandos (`pnpm dev`, `pnpm start`, `pnpm test`, `pnpm lint`, `pnpm typecheck`) passam a existir no marco M0 do PRD; até lá não há o que rodar.

## Skills

Em `.claude/skills/`: `brainstorming` (obrigatória antes de implementar), `grill-me` / `grilling` (entrevista de decisões, só a pedido do usuário).
