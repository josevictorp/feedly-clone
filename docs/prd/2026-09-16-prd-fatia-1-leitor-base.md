# PRD: Feedly Clone, fatia 1 (leitor base)

Data: 2026-09-16
Status: APROVADO pelo usuário em 2026-09-16. **Documento vivo:** os checkboxes são marcados conforme cada item é entregue e testado. Última atualização: 2026-09-16.
Spec de origem: `docs/superpowers/specs/2026-09-16-feedly-clone-leitor-base-design.md` (seções 13 e 14 trazem a stack e as decisões da grelha)
Referência visual: `docs/research/`

## 0. Progresso

Marque cada item ao entregá-lo: um marco só conta como fechado com testes verdes, commit e HANDOFF atualizado.

| Marco | Estado | Fechado em |
|---|---|---|
| M0. Fundação | ✅ concluído | 2026-09-16 |
| M1. Banco e modelo | ✅ concluído | 2026-09-16 |
| M2. Motor de feeds | ✅ concluído | 2026-09-16 |
| M3. Agendador, API e SSE | ✅ concluído | 2026-09-16 |
| M4. Design system e casca | ⬜ próximo (gate visual, para aprovação) | — |
| M5. Streams nos quatro modos | ⬜ pendente (gate visual) | — |
| M6. Leitor | ⬜ pendente (gate visual) | — |
| M7. Today, Discover, Onboarding, Organize, Ir para, atalhos | ⬜ pendente (gate visual) | — |
| M8. Preferências | ⬜ pendente (gate visual) | — |
| M9. Fechamento da fatia | ⬜ pendente | — |

Os checkboxes da seção 5 (requisitos) só são marcados quando o requisito está utilizável ponta a ponta na interface, não quando a camada de baixo existe.

## 1. Resumo

Um leitor de RSS que roda na máquina do usuário e reproduz a interface do Feedly com fidelidade visual, em português, servindo de base para os recursos premium das fatias seguintes. Um processo Node serve a API, o agendador de fetch e a SPA React. Dados em SQLite.

## 2. Objetivos

1. Ler feeds RSS, Atom e JSON Feed organizados em pastas, com atualização automática em background.
2. Reproduzir as telas do Feedly a ponto de as capturas de referência e o clone serem indistinguíveis em 1440x900, exceto pelo idioma.
3. Deixar a arquitetura pronta para Ler depois avançado, Boards, notas, busca, Leo e descoberta sem retrabalho.

## 3. Não objetivos desta fatia

Boards, tags, notas, highlights, busca full-text, prioridade, mute, dedupe entre feeds, resumos, Ask AI, AI Feeds, Explore por tópicos, newsletters, Reddit, YouTube, integrações, compartilhamento externo, extração de artigo completo, autenticação, hospedagem, Safari e Firefox, serviço launchd.

## 4. Usuário e contexto

Um único usuário, na própria máquina, Chrome mais recente, macOS. Já usa o Feedly (plano gratuito, ~40 feeds em 2 pastas) e vai importar o OPML exportado de lá.

## 5. Requisitos funcionais

Numerados para rastrear no plano e nos testes.

### Fontes e pastas

- [ ] RF-01 Seguir uma fonte a partir de qualquer URL: o servidor descobre o feed (URL direta, `<link rel="alternate">`, caminhos comuns) e lista os candidatos.
- [ ] RF-02 Ao seguir, escolher uma ou mais pastas ou criar uma nova no mesmo diálogo, como no Feedly.
- [ ] RF-03 Renomear feed, favoritar, mover de pasta, deixar de seguir (menu "..." do feed na sidebar e na página Organize).
- [ ] RF-04 Criar, renomear, reordenar, colapsar e apagar pastas. Apagar pasta não apaga feeds.
- [ ] RF-05 Importar OPML (cria pastas, ignora duplicados, agenda fetch) e exportar OPML.
- [ ] RF-06 Favicon por feed, com cache local e ícone genérico de RSS como fallback.

### Atualização

- [ ] RF-07 Agendador busca cada feed no intervalo global (padrão 15 min, editável em Preferências), com GET condicional e backoff exponencial em erro.
- [ ] RF-08 Refresh manual do stream atual (botão e tecla `r`).
- [ ] RF-09 Feed com erro mostra alerta na sidebar e faixa no header do feed com "Tentar de novo".
- [ ] RF-10 Front recebe eventos SSE (`feed.updated`, `feed.error`, `counts.changed`) e atualiza contadores e listas sem recarregar; fallback para polling de 60 s.
- [ ] RF-11 Retenção: lidos apagados após 30 dias; teto de 1000 entradas por feed; não lidos e salvos nunca apagados.

### Streams e leitura

- [ ] RF-12 Streams: Todos, pasta, feed, Ler depois, Lidos recentemente.
- [ ] RF-13 Quatro modos: Title-Only, Magazine, Cards, Article. Densidades Compact, Cozy e Comfortable no Title-Only. Visão por stream sobrescreve a preferência global.
- [ ] RF-14 Cabeçalhos de data (Hoje, Ontem, data) em Magazine, Cards e Article; "Mais recentes" no Title-Only.
- [ ] RF-15 Ordenação: Mais recentes e Mais antigos funcionais; Mais compartilhados e Mais compartilhados + recentes desabilitados com "em breve".
- [ ] RF-16 Filtro "Só não lidos" (item lido permanece até recarregar o stream) e "Mostrar silenciados" desabilitado.
- [ ] RF-17 Marcar como lido: ao abrir; ao rolar conforme preferência (padrão só Article view); manual por item; marcar tudo com menu (todos, mais antigos que 1 dia, mais antigos que 1 semana); botão gigante ao fim da lista.
- [ ] RF-18 Ler depois: salvar e dessalvar (`s` e ação no hover); stream Ler depois ordenado por data de salvamento.
- [ ] RF-19 Lidos recentemente: stream com lidos dos últimos 7 dias, por data de leitura.
- [ ] RF-20 Contadores de não lidos por feed, pasta e total, com "1000+" acima de mil. Feeds com zero não lidos recolhidos em "N feeds a mais".
- [ ] RF-21 Coluna "Você também pode gostar" em Magazine e Cards, com título e botão "Explorar", sem sugestões.
- [ ] RF-22 Listas virtualizadas com paginação por cursor ao rolar.

### Leitor

- [ ] RF-23 Painel deslizante à direita nos modos Title-Only, Magazine e Cards; conteúdo inline no Article view.
- [ ] RF-24 Barra do leitor: fechar, ações (salvar, favoritar, marcar lido, link, "mais opções"), botões de compartilhar abrem "em breve".
- [ ] RF-25 Próximo e anterior (seta e `j`/`k`), abrir original em nova aba (`v`), fechar (`Esc`/`o`).
- [ ] RF-26 Conteúdo sanitizado no servidor; iframes só de YouTube e Vimeo em sandbox; imagens quebradas viram bloco cinza; conteúdo truncado mostra "Visitar site".
- [ ] RF-27 Fonte e tamanho do corpo conforme Preferências (Merriweather padrão).

### Páginas

- [ ] RF-28 Today: aba "Eu" com os 10 não lidos mais recentes por pasta, na ordem da sidebar, com marcar lidos por pasta; aba "Explorar" com "em breve".
- [ ] RF-29 Discover ("Seguir fontes"): abas Sites, Reddit, Newsletters, Google News (só Sites funcional), busca por URL, resultados com botão Seguir, diálogo de pastas.
- [ ] RF-30 Onboarding quando o banco está vazio: "Siga suas primeiras fontes" com busca e importar OPML.
- [ ] RF-31 Organize: pastas e feeds com renomear, mover, reordenar, remover.
- [ ] RF-32 "Ir para..." (`⌘K`): busca pastas, feeds e páginas; navegação por teclado; "Vistos recentemente".
- [ ] RF-33 Modal de atalhos (`?`) com a lista do Feedly.

### Preferências

- [ ] RF-34 Geral: página inicial, apresentação padrão, ordenação padrão, esconder lidos, intervalo de atualização.
- [ ] RF-35 Aparência: tema (sistema, claro, escuro), fonte do artigo, tamanho, densidade.
- [ ] RF-36 Marcar como lido: as cinco opções do Feedly com os padrões dele.
- [ ] RF-37 Seu perfil: foto (substituir, remover), nome, sobrenome. Nome aparece no topo da sidebar como "Feedly de <nome>", padrão "Meu Feedly".
- [ ] RF-38 Privacidade e dados: exportar OPML, apagar todos os dados (com confirmação).
- [ ] RF-39 Feedly AI, Salvar e compartilhar, Logins: "disponível em breve".
- [ ] RF-40 Toda preferência persiste no banco e sobrevive a reinícios.

### Atalhos

- [ ] RF-41 `?`, `⌘K`, `g t`, `g a`, `g l`, `g i`, `g o`, `g p`, `shift+j`, `shift+k`, `r`, `[`, `j`, `k`, `n`, `p`, `shift+a`, `o`, `v`, `m`, `x`, `s`. Ignorados com foco em campo de texto.

### Idioma

- [ ] RF-42 Toda string da UI vem do dicionário pt-BR. Nome "Feedly" num token único. Datas relativas compactas em pt-BR.

## 6. Requisitos não funcionais

- [ ] RNF-01 Fidelidade: 16 telas passam no gate visual (pixel-diff com máscaras de texto, 1%, 2880x1800) e na aprovação manual.
- [ ] RNF-02 Desempenho: Todos com 5000 entradas abre em menos de 300 ms de API e rola a 60 fps; sidebar com 200 feeds em uma consulta.
- [ ] RNF-03 Resiliência: um feed quebrado nunca derruba o agendador; servidor fora mostra faixa e reconecta.
- [ ] RNF-04 Segurança: HTML de feed sempre sanitizado; nenhum dado sai da máquina.
- [ ] RNF-05 Operação: `pnpm dev` e `pnpm start`; dados em `data/`; logs com pino.
- [ ] RNF-06 Qualidade: TypeScript estrito; lint e typecheck sem erros; testes unitários, integração e e2e passando.

## 7. Arquitetura

Resumo; detalhes na spec.

- `apps/server`: Hono, Drizzle + better-sqlite3, feedsmith, sanitize-html, agendador, SSE, estáticos.
- `apps/web`: Vite, React 19, react-router, TanStack Query e Virtual, Zustand, CSS Modules, dicionário pt-BR.
- `packages/shared`: schemas Zod e tipos da API.
- Stack e versões: seção 13 da spec.

## 8. Plano de execução

Dez marcos, cada um pequeno o bastante para uma sessão de trabalho e terminando em estado utilizável. Ordem obrigatória. Cada marco fecha com: testes verdes, commit, CHANGELOG e HANDOFF atualizados, e, quando houver telas, o gate visual daquelas telas e sua aprovação.

### M0. Fundação ✅

Entrega: monorepo rodando com "olá" no servidor e no front.

- [x] pnpm workspace, `.nvmrc` (26), TypeScript estrito, ESLint, Prettier.
- [x] `apps/server` com Hono servindo `/api/health` e estáticos; `apps/web` com Vite e uma página em branco com o título "Feedly"; `packages/shared` vazio com build.
- [x] Scripts: `pnpm dev`, `pnpm build`, `pnpm start` (abre o navegador), `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- [x] Vitest e Playwright configurados; um teste de cada rodando.
- [x] `data/` com `FEEDLY_DATA_DIR` e `PORT`.
- [x] README com "como rodar"; AGENTS.md com a stack.

Pronto quando: `pnpm start` abre `http://localhost:3000` com a página em branco e `pnpm test` passa.

### M1. Banco e modelo ✅

Entrega: schema completo com migrações e camada de acesso.

- [x] Schema Drizzle das tabelas da spec (feeds, categories, feed_categories, entries, stream_settings, preferences) com índices.
- [x] Migrações no boot com backup do arquivo antes de migrar.
- [x] Preferências com valores padrão semeados na primeira execução.
- [x] Repositórios: feeds, categories, entries, streamSettings, preferences, com as consultas agregadas de sidebar e streams (cursor).
- [x] Job de retenção (função pura + agendamento diário).

Testes: unitários dos repositórios contra SQLite em memória; retenção; consulta de sidebar sem N+1.

### M2. Motor de feeds ✅

Entrega: dado bytes de um feed, entradas normalizadas no banco; dada uma URL, feeds descobertos.

- [x] Fetch com timeout, User-Agent, decodificação de charset (header → prólogo XML → UTF-8) antes do parse.
- [x] Parser feedsmith e normalização (título, conteúdo, resumo, imagem, URLs relativas, datas, identidade).
- [x] Sanitização (sanitize-html com allowlist de iframe).
- [x] Descoberta de feed em três etapas.
- [x] Favicon com cache em `data/favicons/`.
- [x] OPML import e export.
- [x] Dedupe por feed com atualização de conteúdo sem tocar em `is_read`.
- [x] Fixtures: pelo menos 12 feeds reais congelados (RSS 2.0, Atom, JSON Feed, RDF, ISO-8859-1, sem guid, datas quebradas, HTML malicioso, conteúdo truncado, relativo, media RSS, feed do OPML real).

Testes: unitários de cada etapa com as fixtures; OPML de ida e volta.

### M3. Agendador, API e SSE ✅

Entrega: servidor completo, usável por curl.

- [x] Agendador com fila, concorrência 4, GET condicional, backoff, refresh prioritário, boot.
- [x] Todas as rotas da spec com validação Zod em `packages/shared`.
- [x] SSE em `/api/events` e emissão de eventos pelo agendador e pelas mutações.
- [x] Servidor de feeds falso para testes (fixtures, relógio fixo, respostas 304 e 500 sob comando).
- [x] Logs pino por fetch.

Testes: integração de todas as rotas; agendador com relógio falso (backoff, condicional, refresh); SSE recebe eventos.

### M4. Design system e casca

Entrega: app abre com sidebar, header e tema, sem lista ainda.

- [ ] Tokens CSS light e dark a partir da pesquisa; fontes locais; SVGs extraídos do DOM em `design-system/icons/`.
- [ ] Componentes base: Button, IconButton, Menu, Submenu, Modal, Tooltip, Tabs, Radio, Toggle, Avatar, Favicon, UnreadBadge.
- [ ] Layout raiz com rotas; sidebar completa (perfil, links, Ler depois, Lidos recentemente, Feeds com pastas, contadores, "N feeds a mais", menus "..." e "+", rodapé Boards e links institucionais, fixar, esconder, peek); header do stream com ações.
- [ ] Tema sistema, claro e escuro aplicado sem recarregar.
- [ ] Dicionário pt-BR e função de tradução; teste que falha em chave faltando.
- [ ] Hook global de atalhos com `g t`, `g a`, `g l`, `g i`, `g o`, `g p`, `[`, `?`, `⌘K` (as páginas destino podem ser placeholders neste marco).

Gate visual: sidebar escondida; Todos em tema escuro (lista vazia mascarada).

### M5. Streams nos quatro modos

Entrega: ler artigos em Todos, pasta, feed, Ler depois e Lidos recentemente.

- [ ] EntryList virtualizado com paginação por cursor.
- [ ] Renderers Title-Only (três densidades), Magazine, Cards, Article; cabeçalhos de data.
- [ ] Seleção com `n`/`p`, ações no hover, `m`, `x`, `s`, `shift+a`.
- [ ] Menu "..." com Mudar visão, Filtrar, Ordenar; menu de marcar tudo; botão gigante.
- [ ] Regras de marcar ao rolar por preferência; "só não lidos" com permanência até recarregar.
- [ ] Coluna "Você também pode gostar".
- [ ] Contadores atualizando por SSE.

Gate visual: Todos nos quatro modos; pasta; feed.

### M6. Leitor

Entrega: abrir, ler e navegar artigos.

- [ ] Painel deslizante com escurecimento e barra de ações; inline no Article view.
- [ ] `o`, `Esc`, `j`, `k`, `v`, seta de próximo; `?entry=` na URL.
- [ ] Conteúdo com fonte e tamanho das Preferências; imagens quebradas; "Visitar site".
- [ ] Marcar lido ao abrir.

Gate visual: leitor aberto em Magazine; leitor em tema escuro.

### M7. Today, Discover, Onboarding, Organize, Ir para, atalhos

Entrega: todas as páginas de navegação.

- [ ] Today com grupos por pasta e marcar lidos por pasta; aba Explorar "em breve".
- [ ] Discover com abas, busca por URL, resultados, diálogo Seguir com pastas.
- [ ] Onboarding no banco vazio, com importar OPML.
- [ ] Organize.
- [ ] Paleta "Ir para..." com busca e vistos recentemente.
- [ ] Modal de atalhos.
- [ ] Ações "em breve" para itens premium; links institucionais para o README.

Gate visual: Today; Discover; Ir para; modal de atalhos.

### M8. Preferências

Entrega: modal completo.

- [ ] Abas Geral, Aparência, Marcar como lido, Seu perfil (foto, nome, sobrenome), Privacidade e dados (exportar OPML, apagar tudo), e as três abas "em breve".
- [ ] Nome no topo da sidebar; avatar com inicial ou foto.
- [ ] Persistência de tudo, inclusive visão por stream.

Gate visual: Preferências Geral; Preferências Aparência.

### M9. Fechamento da fatia

Entrega: fatia 1 aceita.

- [ ] Importar o OPML real do usuário e corrigir o que quebrar (cada caso vira fixture e entrada no INCIDENTS).
- [ ] E2E completo: importar OPML, navegar, ler, atalhos, tema, reiniciar servidor e conferir persistência.
- [ ] Gate visual das 16 telas de uma vez; sessão de aprovação manual com o usuário.
- [ ] Revisão de desempenho (RNF-02) com 5000 entradas geradas.
- [ ] README, AGENTS.md, CHANGELOG, HANDOFF, BACKLOG atualizados; INCIDENTS com o que apareceu.

Pronto quando: os cinco itens do critério de aceite (spec, seção 12) foram verificados pelo usuário.

## 9. Rastreabilidade

| Critério de aceite (Q6) | Requisitos | Marcos |
|---|---|---|
| 1. OPML importado, pastas, favicons, contadores | RF-05, RF-06, RF-20 | M2, M4, M7, M9 |
| 2. Fetch automático e refresh manual | RF-07, RF-08, RF-10 | M3, M5 |
| 3. Quatro modos indistinguíveis das capturas | RF-13, RF-14, RF-21, RNF-01 | M4, M5, M6, M9 |
| 4. Leitor e atalhos | RF-23 a RF-25, RF-32, RF-33, RF-41 | M6, M7 |
| 5. Persistência entre reinícios | RF-40, RF-17, RF-15 | M1, M8, M9 |

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Fidelidade visual custar mais que o previsto (fontes, sub-pixel, sombras) | Tokens vindos do CSS real; gate visual por marco, não só no fim; máscaras em vez de perseguir pixel. |
| Feeds reais quebrarem o parser | Fixtures reais desde M2; OPML do usuário em M9 com cada falha virando fixture. |
| Texto em português alargar componentes | Traduções curtas escolhidas com a largura em mente; larguras fixas onde o Feedly fixa. |
| Sanitização derrubar conteúdo legítimo | Allowlist ampla de tags de texto; fixture de HTML rico. |
| better-sqlite3 falhar ao instalar | Versão 13.x fixada; se falhar, alternativa documentada é node:sqlite com Drizzle 1.0 RC. |
| Escopo crescer durante a execução | Tudo fora dos RF vai para o BACKLOG; nova feature passa pelo brainstorm. |

## 11. Processo de execução

- Cada marco começa com a leitura de HANDOFF e da spec, e termina com commit, CHANGELOG e HANDOFF.
- Desenvolvimento orientado a testes: teste antes do código em motor, agendador e API; teste junto com o componente no front.
- Commits pequenos e frequentes, em inglês, com o trailer combinado.
- A aprovação do usuário acontece ao fim de cada marco que tem gate visual (M4 a M8) e no fechamento (M9). Marcos M0 a M3 são aprovados por testes.
- Nada fora desta fatia é implementado sem passar pelo brainstorm.
