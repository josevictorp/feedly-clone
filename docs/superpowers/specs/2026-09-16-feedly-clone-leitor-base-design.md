# Spec de design: Feedly Clone, fatia 1 (leitor base)

Data: 2026-09-16
Status: aprovada em conversa e refinada pela grelha (seção 14); aguardando confirmação final
Referências: `docs/research/feedly-research.md`, `docs/research/screenshots/`, `docs/research/dom/`

## 1. Objetivo

Construir um leitor de RSS local que reproduza com fidelidade visual a interface do Feedly (feedly.com) e que sirva de base para os recursos premium nas fatias seguintes. Esta spec cobre apenas a fatia 1: o leitor base.

## 2. Decisões de contexto

| # | Decisão | Escolha |
|---|---|---|
| Q1 | Forma do produto | Web app em localhost com servidor local. Sem app desktop, sem hospedagem. |
| Q2 | Ordem dos sub-projetos | 1) leitor base, 2) organização premium (Ler depois, Boards, notas/highlights, tags, busca), 3) Leo (prioridade, mute, dedupe, resumos, tópicos), 4) descoberta e fontes extras (Explore, newsletters, Reddit, YouTube, integrações). |
| Q3 | Referência visual | Capturas da conta real do usuário, viewport 1440x900, mais CSS de produção extraído. Conta é plano gratuito. |
| Q4 | Stack | Sem restrições. TypeScript ponta a ponta. |
| Q5 | Idioma da interface | Português do Brasil desde o início. |
| Q6 | Critério de aceite | Ver seção 12. |
| Q7 | Arquitetura | SPA React + servidor Node único + SQLite. |

## 3. Escopo da fatia 1

Incluído:

- Casca visual fiel: sidebar, header do stream, área central, coluna "Você também pode gostar", tema claro e escuro.
- Seguir fontes por URL (descoberta automática de feed) e importar/exportar OPML.
- Pastas (categories) com um feed podendo pertencer a mais de uma.
- Fetch e parsing de RSS 0.9x/1.0/2.0, Atom e JSON Feed, com agendador em background.
- Os quatro modos de leitura: Title-Only, Magazine, Cards, Article. Densidades Compact, Cozy, Comfortable no Title-Only.
- Painel do artigo (leitor inline) e navegação entre artigos.
- Lido/não lido, marcar tudo como lido, esconder lidos, ordenação.
- Ler depois (salvar/dessalvar com `s`) e Lidos recentemente.
- Página Today (aba "Me") agrupada por pasta.
- Página Discover com busca por URL e diálogo de seguir.
- Página Organize (lista de pastas e feeds com renomear, mover, remover).
- Modal de Preferences com as abas do Feedly; conteúdo nas abas Geral, Aparência e Marcar como lido.
- Atalhos de teclado do Feedly e o modal de atalhos.
- Paleta "Ir para..." (⌘K) com pastas e feeds.

Excluído (fatias seguintes):

- Boards, tags, notas, highlights, busca full-text (fatia 2). "Ler depois" (flag simples por entrada, tecla `s`) e "Lidos recentemente" (entradas por `read_at`) entram na fatia 1 porque o critério de aceite exige `s` e a sidebar exige as duas páginas; Boards de verdade ficam para a fatia 2.
- Prioridade, mute, dedupe entre feeds, resumos, tópicos, Ask AI, AI Feeds (fatia 3). Os botões existem na UI e abrem um aviso "disponível em breve".
- Explore por tópicos, newsletters, Reddit, YouTube, Google News, integrações, compartilhamento externo (fatia 4).
- Autenticação e múltiplos usuários. Nunca previstos: app local de usuário único.

## 4. Arquitetura e estrutura de pastas

Monorepo pnpm com três pacotes e um único processo em execução.

```
feedly-clone/
  apps/
    server/          Node 26 + TypeScript. Hono (HTTP), Drizzle + better-sqlite3, agendador, parser.
    web/             Vite + React 19 + TypeScript. SPA.
  packages/
    shared/          Tipos e schemas Zod da API, usados por server e web.
  docs/              specs, prd, research
  data/              feedly.db e favicons/. Ignorado pelo git.
```

Servidor organizado por domínio:

- `feeds/` descoberta, parsing, normalização, favicon.
- `scheduler/` fila de fetch, GET condicional, backoff, refresh manual.
- `entries/` leitura, marcação de lido, contadores.
- `opml/` import e export.
- `http/` rotas Hono por recurso, validação Zod, respostas tipadas.
- `db/` schema Drizzle, migrações, conexão.

Front organizado por domínio:

- `app/` roteamento, layout raiz, provedores.
- `features/` `sidebar`, `stream`, `reader`, `today`, `discover`, `organize`, `preferences`, `shortcuts`, `goto`.
- `design-system/` tokens, componentes base.
- `api/` cliente HTTP tipado e hooks TanStack Query.
- `i18n/` dicionário pt-BR.

Fluxo de dados: agendador busca feed → parser normaliza → grava em SQLite → API expõe → TanStack Query mantém cache no front e invalida após ações ou eventos SSE.

Execução: `pnpm dev` sobe server e Vite com proxy; `pnpm start` faz build e sobe um processo em `http://localhost:3000` servindo API e estáticos.

## 5. Modelo de dados

SQLite em `data/feedly.db`. Timestamps em inteiro (ms UTC). IDs inteiros autoincrementais.

**feeds**: `id`, `feed_url` (único), `site_url`, `title` (editável), `original_title`, `description`, `icon_path`, `language`, `etag`, `last_modified`, `last_fetched_at`, `next_fetch_at`, `error_count`, `last_error`, `is_favorite`, `sort_order`, `created_at`. (Sem intervalo por feed: o intervalo é global, em preferences.)

**categories**: `id`, `label`, `sort_order`, `is_collapsed`, `created_at`.

**feed_categories**: `feed_id`, `category_id`, `sort_order`. Chave primária composta.

**entries**: `id`, `feed_id`, `guid`, `url`, `title`, `author`, `summary` (texto puro, até 400 caracteres), `content_html` (sanitizado), `image_url`, `published_at`, `crawled_at`, `is_read`, `read_at`, `is_saved`, `saved_at`, `engagement` (nulo nesta fatia).
Índices: `(feed_id, guid)` único, `(feed_id, is_read)`, `(published_at)`, `(is_saved, saved_at)`, `(read_at)`.

**stream_settings**: `stream_id` (chave: `all`, `category:<id>`, `feed:<id>`, `saved`, `read`), `view_mode`, `sort`, `hide_read`. Sobrescreve as preferências globais por stream.

**preferences**: `key`, `value` (JSON). Chaves: `start_page` (today, first_folder, all), `default_view` (title_only, magazine, cards, article), `default_sort` (newest, oldest; `most_shared` e `most_shared_newest` aparecem desabilitados), `hide_read` (bool), `theme` (system, light, dark), `font_family` (merriweather, inter, sans_serif, open_dyslexic, noto_sans), `text_size` (small, medium, large, extra_large), `density` (compact, cozy, comfortable), `sidebar_pinned` (bool), `fetch_interval_min` (padrão 15), `giant_mark_read_button` (bool, padrão true), `mark_read_on_scroll` (article_only | all_views | off; padrão article_only), `mark_read_on_np` (bool, padrão false), `mark_read_on_count_click` (bool, padrão false), `mark_all_shows_older_than_menu` (bool, padrão true), `profile_given_name`, `profile_family_name`, `profile_picture_path`, `locale` (pt-BR).

Regras:

- Não lidos são calculados por consulta, nunca armazenados.
- "Ler depois" é o stream `saved` (`is_saved = 1`, ordenado por `saved_at`). "Lidos recentemente" é o stream `read` (`is_read = 1`, ordenado por `read_at`, últimos 7 dias).
- Retenção: job diário apaga entradas lidas com mais de 30 dias e aplica teto de 1000 entradas por feed, removendo as lidas mais antigas primeiro. Não lidas e salvas nunca são apagadas por retenção.
- Dedupe apenas dentro do mesmo feed, por `guid`.
- Deixar de seguir um feed apaga suas entradas.

## 6. Motor de feeds

**Descoberta.** Dada uma URL: 1) a própria URL é um feed válido; 2) a página tem `<link rel="alternate">` de tipo RSS, Atom ou JSON Feed; 3) caminhos comuns (`/feed`, `/rss`, `/atom.xml`, `/feed.json`, `/index.xml`, `/rss.xml`). Retorna lista de candidatos com título e URL.

**Parsing.** Biblioteca `feedsmith` 2.x estável (único com JSON Feed e namespaces DC, media, iTunes; migrar para 3.x quando sair do RC). Normalização:

- Título sem HTML, com trim; fallback "Sem título".
- Conteúdo: `content:encoded` → `content` → `summary` → `description`. Sanitizado com `sanitize-html`: tags de texto, listas, imagens, código, tabelas; iframes apenas de YouTube e Vimeo; remove scripts, estilos inline, formulários, eventos.
- Resumo: texto puro do conteúdo, 400 caracteres.
- Imagem: `media:content` ou `media:thumbnail` → enclosure de imagem → primeira `<img>` do conteúdo. Só URLs absolutas.
- URLs relativas resolvidas contra o `site_url`.
- Data: `published` → `updated` → data do fetch. Datas futuras viram "agora".
- Encoding: o servidor recebe bytes, detecta charset pelo header HTTP, depois pelo prólogo XML, fallback UTF-8, e decodifica com `TextDecoder` antes de chamar o parser (feedsmith não detecta encoding).
- Identidade: `guid` → hash da `url` → hash de `título + published_at`. Item existente com conteúdo alterado é atualizado sem alterar `is_read`.

**Agendador.** Dentro do processo do servidor.

- Verifica a cada 60 s os feeds com `next_fetch_at` vencido.
- Concorrência 4, timeout 20 s, User-Agent `FeedlyClone/1.0 (+local)`.
- GET condicional com `If-None-Match` e `If-Modified-Since`; 304 não altera nada além de `last_fetched_at` e `next_fetch_at`.
- Sucesso: `next_fetch_at = agora + fetch_interval_min` (preferência global, padrão 15 min), `error_count = 0`.
- Erro: backoff 30 min, 1 h, 2 h, 4 h, até 24 h; `error_count` incrementa; `last_error` guarda a mensagem.
- Refresh manual enfileira o stream na frente, ignorando `next_fetch_at`, mantendo GET condicional.
- No boot, feeds vencidos entram na fila imediatamente.

**Favicons.** Ao seguir: `<link rel="icon">` da página → `/favicon.ico` → `https://icons.duckduckgo.com/ip3/<host>.ico`. Salvo em `data/favicons/<feed_id>.<ext>`. Sem favicon, o front usa o ícone genérico de RSS.

**OPML.** Import cria pastas a partir de `<outline>` aninhados, ignora feeds já seguidos por `feed_url`, agenda fetch imediato dos novos, retorna contagens. Export gera a mesma estrutura.

## 7. API HTTP

JSON, prefixo `/api`, sem autenticação. Validação Zod com schemas em `packages/shared`. Erros: `{ error: { code, message } }`.

Streams (`streamId` é `all`, `category:<id>`, `feed:<id>`, `saved` ou `read`):

- `GET /api/streams/:streamId/entries?sort=newest|oldest&unreadOnly=bool&cursor=&limit=50` → paginado por cursor (`published_at` + `id`), com feed embutido.
- `GET|PUT /api/streams/:streamId/settings` → `view_mode`, `sort`, `hide_read`.
- `POST /api/streams/:streamId/mark-read` `{ olderThan? }`.
- `POST /api/streams/:streamId/refresh` → 202.

Entries:

- `GET /api/entries/:id` → com `content_html`.
- `POST /api/entries/mark` `{ ids, read }`.
- `POST /api/entries/save` `{ ids, saved }`.

Feeds:

- `GET /api/feeds` → com `unreadCount` e `categories`.
- `POST /api/feeds/discover` `{ query }` → candidatos.
- `POST /api/feeds` `{ feedUrl, title?, categoryIds }` → segue e faz fetch imediato.
- `PATCH /api/feeds/:id` → `title`, `isFavorite`, `categoryIds`.
- `DELETE /api/feeds/:id`.
- `GET /api/feeds/:id/icon`.

Categories:

- `GET /api/categories` → com `unreadCount` e feeds ordenados.
- `POST /api/categories`, `PATCH /api/categories/:id` (`label`, `sortOrder`, `isCollapsed`), `DELETE /api/categories/:id` (feeds ficam sem pasta).

Today: `GET /api/today` → por pasta, até 10 não lidos mais recentes.

OPML: `POST /api/opml/import` (multipart) → `{ added, skipped, categoriesCreated }`; `GET /api/opml/export`.

Preferences: `GET /api/preferences`, `PATCH /api/preferences` (parcial).

Sidebar: `GET /api/sidebar` → pastas, feeds, não lidos por feed, por pasta e total, em uma consulta agregada.

Eventos: `GET /api/events` (SSE) com `feed.updated`, `feed.error`, `counts.changed`. Fallback para polling de 60 s se o SSE cair.

Convenções: paginação sempre por cursor; sem N+1; tempo em ms UTC; sem versionamento de rota.

## 8. Front e design system

**Rotas**: `/i/my` (Today), `/i/collection/all`, `/i/collection/:categoryId`, `/i/subscription/:feedId`, `/i/saved` (Ler depois), `/i/read` (Lidos recentemente), `/i/discover`, `/i/organize`. Artigo aberto é `?entry=<id>`; o botão voltar do navegador fecha o painel.

**Layout raiz**: sidebar de 320 px (fixável, escondível com `[`, peek ao encostar na borda esquerda), header do stream sem o botão "Upgrade" (estado Pro+): título, contador, ações marcar tudo (menu: todos, mais antigos que 1 dia, mais antigos que 1 semana), Ask AI e compartilhar (abrem "disponível em breve"), refresh, mais opções, área central com largura máxima do Feedly, coluna "Você também pode gostar" visível apenas em Magazine e Cards. Na fatia 1 ela renderiza o título e o botão "Explorar" sem sugestões; as sugestões vêm na fatia 4.

**Design system**:

- Tokens CSS em `:root` e `[data-theme="dark"]`, copiados de `docs/research/feedly-research.md` (seções 2.1 e 2.9 a 2.11). Accent `#2bb24c`.
- Tipografia: Inter Variable na UI; corpo do artigo em Merriweather por padrão, com Inter, Sans Serif, OpenDyslexic e Noto Sans como opções. Fontes servidas localmente.
- Ícones: SVGs extraídos do DOM capturado do Feedly (`docs/research/dom/`), inline, sem biblioteca externa. São propriedade do Feedly; aceitável para uso local e pessoal. Se o projeto for publicado, trocar por ícones próprios.
- Componentes base: `Button`, `IconButton`, `Menu`, `Submenu`, `Modal`, `Tooltip`, `Tabs`, `Radio`, `Toggle`, `Avatar`, `Favicon`, `UnreadBadge`.
- CSS Modules. Sem Tailwind.

**Stream**: cabeçalhos de grupo por data ("Hoje", "Ontem", data por extenso) em Magazine, Cards e Article; "Mais recentes" no Title-Only, como o Feedly. Fuso horário da máquina. `EntryList` virtualizado (TanStack Virtual, alturas dinâmicas via `measureElement`) com renderers `TitleOnlyRow`, `MagazineItem`, `CardItem`, `ArticleItem`. Item selecionado com fundo cinza; ações no hover à direita (salvar, favoritar, marcar lido, marcar lido acima). Título lido em cinza. Com "só não lidos" ligado, um item lido agora continua visível até o stream recarregar (comportamento do Feedly). Menu de ordenação com as quatro opções do Feedly; "Mais compartilhados" e "Mais compartilhados + recentes" desabilitados com tooltip "em breve". Feeds com zero não lidos ficam recolhidos atrás de "N feeds a mais" na sidebar, como no Feedly. Contadores acima de 1000 mostram "1000+".

**Leitor**: painel deslizante à direita sobre a lista, com escurecimento; barra superior com fechar, ações e mais opções; largura de leitura 648 px; seta para o próximo. No modo Article, conteúdo inline sem painel. Abrir marca como lido. Conteúdo truncado é mostrado como veio, com botão "Visitar site"; sem extração de artigo completo nesta fatia. Botão gigante "Marcar como lidos" ao fim da lista, como no Feedly (configurável). Sem blocos de insights de IA dentro do artigo (fatia 3).

**Atalhos** (ignorados com foco em input): `?`, `⌘K`, `g t`, `g a`, `g l`, `g i`, `g o`, `g p`, `shift+j`, `shift+k`, `r`, `[`, `j`, `k`, `n`, `p`, `shift+a`, `o`, `v`, `m`, `x`, `s`. Modal de atalhos copiado do Feedly.

**Estado**: TanStack Query para dados da API; Zustand para UI efêmera (seleção, painel, sidebar). Preferências em cache; tema aplica na hora.

## 9. Internacionalização e preferências

- Dicionário único em `i18n/pt-BR.ts`, chaves por tela. Nenhuma string solta em componente. Função própria de tradução com interpolação; sem carregamento dinâmico.
- Traduções mantêm tamanho semelhante: Hoje, Ler depois, Seguir fontes, Todos, Marcar como lido. Termos que o Feedly não traduz permanecem: Boards, Feeds.
- Datas relativas com `Intl.RelativeTimeFormat` em formato compacto: "agora", "14 min", "2 h", "1 d".
- Preferences: modal com as abas Geral, Feedly AI, Aparência, Salvar e compartilhar, Marcar como lido, Logins, Privacidade e dados, Seu perfil (sem a aba Upgrade: estado Pro+). Na fatia 1 têm conteúdo: Geral (página inicial, apresentação padrão, ordenação padrão, esconder lidos, intervalo de atualização), Aparência (tema, fonte, tamanho, densidade), Marcar como lido (as cinco opções do Feedly: botão gigante, ao rolar [só Article | todas | não], ao navegar com n/p, ao clicar no contador, menu "mais antigos que"), Seu perfil (foto com substituir/remover, nome, sobrenome; sem e-mail) e Privacidade e dados (exportar OPML, apagar todos os dados). Feedly AI, Salvar e compartilhar e Logins mostram "disponível em breve".
- Marca: a UI mantém o nome "Feedly" (título da aba, "Meu Feedly", "Feedly AI") num único token de i18n, para troca futura.
- Primeira execução com banco vazio: tela de onboarding no estilo do Feedly ("Siga suas primeiras fontes") com busca por URL e botão de importar OPML.
- Tema `system` segue `prefers-color-scheme`. Troca sem recarregar.

## 10. Erros e resiliência

- Feed com erro: ícone de alerta na sidebar; faixa no header do feed com a mensagem e "Tentar de novo".
- Descoberta sem resultado: "Nenhum feed encontrado" com sugestão de colar a URL do RSS.
- Servidor fora: faixa persistente "Sem conexão com o servidor local"; SSE reconecta com backoff; ações desabilitadas.
- HTML de feed sempre sanitizado no servidor; front nunca injeta HTML de outra origem. Iframes permitidos em sandbox.
- Imagens quebradas: bloco cinza.
- Migrações Drizzle no boot com backup de `feedly.db` antes de cada migração.
- Dados em `data/` no projeto (ignorado pelo git), configurável por `FEEDLY_DATA_DIR`. Porta 3000 configurável por `PORT`. `pnpm start` abre o navegador. Serviço launchd no backlog.
- Logs com pino, nível info; cada fetch registra feed, status, duração, itens novos.

## 11. Testes

- Unitários (Vitest): parser e normalização com fixtures reais (RSS 2.0, Atom, JSON Feed, feeds quebrados, encodings), descoberta, OPML, agendador (backoff, condicional), sanitizador, datas, dicionário sem chaves faltando.
- Integração: API contra SQLite em memória; cada rota com sucesso e erro.
- E2E (Playwright): importar OPML, sidebar, quatro modos, abrir artigo, atalhos, tema, persistência após reinício.
- Regressão visual: Playwright `toHaveScreenshot` com `snapshotPathTemplate` apontando para `docs/research/screenshots/`, viewport 1440x900 com `deviceScaleFactor` 2 (as referências têm 2880x1800), `mask` sobre todo elemento de texto e sobre a região do botão Upgrade, `maxDiffPixelRatio` 0.01. Dezesseis telas no gate: Today; All em Title-Only, Magazine, Cards e Article; pasta; feed; leitor aberto em Magazine; sidebar escondida; Preferências Geral e Aparência; Discover; modal de atalhos; Ir para; tema escuro em All e no leitor. Falha bloqueia a fatia. Além do diff, aprovação manual do usuário por tela.
- Fixtures: servidor de feeds falso nos testes com RSS/Atom/JSON congelados, relógio fixo e OPML de teste com 8 a 10 feeds públicos derivados do OPML real do usuário. O OPML real fica em `data/feedly-export.opml`, fora do git.
- Navegador alvo: Chrome/Chromium mais recente. Safari e Firefox no backlog.

## 12. Critério de aceite (Q6)

A fatia 1 está pronta quando, na máquina do usuário:

1. Importa o OPML exportado do Feedly e as pastas com seus feeds aparecem na sidebar com favicons e contadores.
2. Artigos chegam sozinhos com o servidor rodando; refresh manual força atualização.
3. Today, All, pasta e feed renderizam nos quatro modos e, lado a lado com as capturas em 1440x900, são indistinguíveis exceto pelo idioma.
4. Leitor inline abre e navega com `j`, `k`, `o`, `m`, `v`, `s`; `g t`, `g a`, `g l`, `?`, `[` e `⌘K` funcionam.
5. Lido, marcar tudo, esconder lidos, ordenação e tema persistem entre reinícios.

Mais: todos os testes passando; CHANGELOG e HANDOFF atualizados.

## 13. Stack fixada

- Node 26 (`.nvmrc`, `engines`), pnpm 12, TypeScript.
- Servidor: Hono 4 + `@hono/node-server` 2 (SSE via `streamSSE`, estáticos via `serveStatic`), Drizzle ORM 0.45 estável + better-sqlite3 13 (N-API, binário embutido), feedsmith 2.x, sanitize-html 2.17 (`allowedIframeHostnames`), pino.
- Front: Vite 8, React 19, react-router, TanStack Query, TanStack Virtual, Zustand, CSS Modules. `resolve.dedupe` para react e react-dom no workspace.
- Fontes locais via Fontsource (Inter variável, Merriweather variável, Noto Sans variável, OpenDyslexic estática), todas SIL OFL.
- Testes: Vitest, Playwright 1.63.

## 14. Decisões da grelha (2026-09-16)

| # | Decisão |
|---|---|
| G1 | UI reproduz o estado Pro+: sem botão Upgrade, sem cadeados, sem aba Upgrade. |
| G2 | Menu de ordenação mostra as quatro opções do Feedly; as duas por engajamento ficam desabilitadas. |
| G3 | Fidelidade medida por pixel-diff com máscaras de texto (1%) mais aprovação manual por tela. |
| G4 | Ícones reaproveitados dos SVGs extraídos do DOM do Feedly (uso local). |
| G5 | Conteúdo truncado é exibido como veio, com "Visitar site". Extração completa no backlog. |
| G6 | Marcar como lido igual ao Feedly, inclusive os padrões reais da aba: ao rolar só no Article view por padrão. |
| G7 | Com "só não lidos", item lido permanece até recarregar o stream. |
| G8 | Cabeçalhos de data (Hoje, Ontem, data) nas listas. |
| G9 | Dados em `data/` no projeto, `FEEDLY_DATA_DIR` para trocar. |
| G10 | Sobe manualmente com `pnpm start`, porta 3000, abre o navegador. launchd no backlog. |
| G11 | Intervalo de fetch só global (15 min), em Preferences. |
| G12 | Retenção: lidos após 30 dias, teto 1000 por feed, não lidos e salvos nunca. |
| G13 | Testes visuais com servidor de feeds falso e relógio fixo. |
| G14 | Onboarding ao estilo Feedly no banco vazio; OPML real do usuário em `data/`, fixture reduzida no git. |
| G15 | Só Chrome/Chromium. |
| G16 | Itens premium e links institucionais permanecem na sidebar ("em breve" e link para o README). |
| G17 | Perfil configurável: foto, nome e sobrenome; padrão "Meu Feedly"; avatar com inicial. |
| G18 | Today: 10 não lidos mais recentes por pasta. |
| G19 | Gate visual com 16 telas. |
| G20 | UI mantém o nome "Feedly" num token de i18n. |
| G21 | better-sqlite3 + Drizzle estável; feedsmith 2.x; Node 26. |

## 15. Fora desta spec, já decidido para as próximas

- Fatia 2 adiciona tabelas `boards`, `board_entries`, `tags`, `annotations` e a tabela virtual FTS5 sobre `entries`.
- Fatia 3 adiciona jobs de dedupe entre feeds e um provedor de LLM configurável.
- Hospedagem exigiria apenas autenticação e um `user_id` nas tabelas; a arquitetura não muda.
