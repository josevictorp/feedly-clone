# Feedly Clone

Leitor de RSS local que reproduz fielmente a interface do [Feedly](https://feedly.com) e seus recursos premium (Boards, Read Later, notas e highlights, busca, filtros de mute, priorização estilo Leo, entre outros).

## Estado atual

Fase de execução da fatia 1 (leitor base). O projeto segue um fluxo spec-driven: brainstorm → grill → PRD → aprovação → execução. Progresso por marco em [HANDOFF.md](HANDOFF.md).

## Princípios

- **Fidelidade visual.** O design system é uma cópia fiel do Feedly: layout, cores, tipografia, espaçamentos, ícones, modos de leitura e atalhos de teclado.
- **Local first.** Roda na máquina do usuário. Sem hospedagem por enquanto.
- **Recursos premium.** A meta inclui os recursos pagos do Feedly, não só o básico de RSS.

## Documentos

| Arquivo | Para quê |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Orquestrador do projeto: regras, fluxo de trabalho, convenções |
| [AGENTS.md](AGENTS.md) | Instruções para outras sessões, agentes ou IAs |
| [MEMORY.md](MEMORY.md) | Memória rápida: achados, decisões, contexto |
| [BACKLOG.md](BACKLOG.md) | Pendências e ideias ainda não priorizadas |
| [CHANGELOG.md](CHANGELOG.md) | Registro das principais mudanças |
| [HANDOFF.md](HANDOFF.md) | Estado do trabalho para quem pegar a próxima sessão |
| [INCIDENTS.md](INCIDENTS.md) | Bugs, armadilhas e lições aprendidas |
| `docs/superpowers/specs/` | Specs de design aprovadas |
| `docs/prd/` | PRD e plano de execução |

## Como rodar

### Requisitos

- **Node 26** (a versão está em `.nvmrc`; com `nvm`, rode `nvm use`).
- **pnpm 12** (`npm i -g pnpm@12`).

### Instalação

```bash
pnpm install
```

### Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe o servidor em watch (porta 3000) e o Vite em `http://localhost:5173` com proxy de `/api`. Use para desenvolver. |
| `pnpm start` | Faz o build completo, sobe um processo em `http://localhost:3000` servindo API e SPA, e abre o navegador. |
| `pnpm build` | Compila `packages/shared`, `apps/web` e `apps/server`. |
| `pnpm serve` | Sobe o servidor já compilado, sem build e sem abrir o navegador. |
| `pnpm test` | Testes unitários (Vitest) e end-to-end (Playwright). |
| `pnpm test:unit` / `pnpm test:e2e` | Cada suíte isolada. |
| `pnpm lint` | ESLint em todo o repositório. |
| `pnpm typecheck` | `tsc --build` em todos os pacotes. |
| `pnpm format` | Prettier (código e configuração; docs ficam de fora). |

### Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `3000` | Porta do servidor. |
| `FEEDLY_DATA_DIR` | `./data` | Onde ficam `feedly.db` e `favicons/`. |
| `LOG_LEVEL` | `info` | Nível do pino. |

Se a porta 3000 já estiver ocupada, o servidor encerra com uma mensagem explicando o motivo; suba com `PORT=3001 pnpm start`.

### Estrutura

```
apps/server/     API Hono, agendador de feeds, estáticos
apps/web/        SPA React + Vite
packages/shared/ Tipos e schemas compartilhados
e2e/             Testes Playwright
data/            Banco e favicons (fora do git)
```
