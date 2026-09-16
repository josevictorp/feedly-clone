# CLAUDE.md — Orquestrador do projeto

Este arquivo governa qualquer sessão de IA que trabalhe neste repositório. Leia-o inteiro antes de agir.

## O projeto

Clone local do Feedly (https://feedly.com): leitor de RSS com fidelidade visual total ao original e com os recursos premium dele. Sem hospedagem por enquanto. Detalhes em [README.md](README.md).

## Regra número um: sem código antes da aprovação

O projeto é spec-driven. Ordem obrigatória:

1. **Brainstorm** (skill `brainstorming`) → spec em `docs/superpowers/specs/YYYY-MM-DD-<topico>-design.md`
2. **Grill** (skill `grill-me` / `grilling`) → estressar as decisões da spec com o usuário
3. **PRD** completo em `docs/prd/`
4. **Aprovação explícita do usuário** sobre o PRD
5. **Execução**, em fatias pequenas, seguindo o plano

Não escreva código de aplicação, não faça scaffold, não instale dependências do app antes do passo 4. Isso vale mesmo para tarefas "simples". Depois da aprovação, cada nova feature ou mudança de comportamento passa de novo pelo brainstorm (caminho bounded ou arquitetural, conforme o tamanho).

## Fidelidade visual é requisito, não preferência

Ao implementar UI, a referência é o Feedly real. Antes de construir uma tela, compare com o original (screenshots, pesquisa salva em `docs/research/`). Cores, tipografia, espaçamento, ícones, densidade, modos de leitura e atalhos precisam bater. Na dúvida, copie o Feedly; não invente.

## Arquivos de controle e quando atualizar cada um

| Arquivo | Atualize quando |
|---|---|
| [MEMORY.md](MEMORY.md) | Descobrir algo que outra sessão precisaria saber: decisão tomada, achado sobre o Feedly, restrição técnica, preferência do usuário. Uma linha por item, com data. |
| [BACKLOG.md](BACKLOG.md) | Algo ficar pendente, for adiado ou surgir como ideia fora do escopo atual. |
| [CHANGELOG.md](CHANGELOG.md) | Concluir uma mudança relevante: feature, correção, decisão de arquitetura, mudança de stack. Formato Keep a Changelog. |
| [HANDOFF.md](HANDOFF.md) | Terminar uma sessão de trabalho. Escreva o que foi feito, o que está no meio, o próximo passo exato. Sobrescreva a seção "Estado atual"; não acumule histórico ali. |
| [INCIDENTS.md](INCIDENTS.md) | Encontrar um bug não trivial, uma armadilha (CORS, encoding de feed, parser que quebra) ou perder tempo com algo que outro perderia também. Registre causa, solução e como evitar. |
| [AGENTS.md](AGENTS.md) | Mudar convenções, stack ou fluxo que outras IAs precisam seguir. |

Ao final de toda sessão: atualize HANDOFF.md e, se houve mudanças, CHANGELOG.md.

## Skills disponíveis neste projeto

Em `.claude/skills/`:

- `brainstorming` — obrigatória antes de qualquer trabalho criativo ou de implementação. Tem HARD-GATE de aprovação.
- `grill-me` → chama `grilling` — entrevista em rodadas para estressar decisões. Só quando o usuário pedir.

## Convenções

- **Idioma:** o usuário escreve em português. Responda em português. Documentação do projeto em português. Código, comentários, nomes de variáveis, commits e nomes de arquivo em inglês.
- **Commits:** commite a cada mudança significativa (nova doc, decisão registrada, spec, fatia implementada, correção). Não acumule trabalho sem commit. Mensagens em inglês, imperativo, curtas, terminando com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Nunca faça push sem o usuário pedir.
- **Stack:** ainda não definida. Será decidida na spec e registrada aqui e em AGENTS.md. Até lá, não assuma framework nenhum.
- **Escopo:** o projeto é grande e será decomposto em sub-projetos ordenados. Cada sub-projeto tem sua própria spec → plano → execução. Não misture sub-projetos numa mesma fatia.
- **YAGNI:** nada além do que a spec aprovada pede.
- **Testes:** definidos na spec. Nenhuma fatia é "concluída" sem os testes que o plano pedir.

## Estrutura de pastas (docs)

```
docs/
  superpowers/specs/   specs de design aprovadas
  prd/                 PRD e plano de execução
  research/            pesquisa sobre o Feedly (features, UI, API, cores)
```

## O que nunca fazer

- Implementar sem aprovação do PRD ou do design.
- Alterar a direção visual para "melhorar" o Feedly.
- Apagar ou reescrever specs aprovadas sem o usuário pedir. Crie uma nova versão datada.
- Hospedar, publicar ou enviar dados do projeto para serviços externos.
