# Pesquisa sobre o Feedly

Material de referência para a cópia fiel. Capturado em 2026-09-16 a partir da conta do usuário (plano gratuito), viewport 1440x900, Chrome 153.

## Arquivos

- `feedly-research.md` — tiers e limites, tokens de cor (light/dark/night) extraídos do CSS de produção, fontes, dimensões, atalhos, modelo de dados da API, clones open source.
- `screenshots/` — capturas de tela da interface real (lista abaixo).
- `dom/` — HTML renderizado de telas-chave (nomes de classe, estrutura, aria-labels) e `css-vars-light.json`.

## Como recapturar

Chrome separado com perfil em `~/.local/share/feedly-clone/chrome-profile`:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$HOME/.local/share/feedly-clone/chrome-profile" \
  --remote-debugging-port=9333 --no-first-run --no-default-browser-check https://feedly.com/i/my
```

Conectar com playwright-core via `chromium.connectOverCDP('http://127.0.0.1:9333')`. Seletores úteis: `.BaseLeftnav`, `.LeftnavItem`, `.LeftnavItem__actions`, `.entry`, `.EntryTitleLink`, `[aria-label="Pin sidebar"]`, `[aria-label="Toggle Ask AI panel"]`, `[aria-label="Mark as read"]`. Atalhos: `g p` preferências, `g t` Today, `g a` All, `n`/`o` seleciona e abre artigo, `[` fixa/esconde sidebar, `?` atalhos.

## Índice das capturas

| Arquivo | O que mostra |
|---|---|
| 01-today-me*.png | Página Today, aba Me (magazine agrupado por pasta) |
| 02-today-explore.png | Today, aba Explore |
| 03-all-feeds.png | Coleção All em Title-Only |
| 04-category-marketing.png | Pasta (category) |
| 05-feed-hubspot.png | Feed individual |
| 06-read-later.png, 07-recently-read.png | Boards de sistema (saved / read) |
| 08-follow-sources.png | Discover: abas Websites, Reddit, Newsletters, Google News; busca; tópicos |
| 09-create-ai-feed.png | Tela de AI Feed (premium) |
| 11-goto.png | Paleta "Go to..." (Cmd+K) |
| 12-account-menu.png | Menu da conta (Preferences, Explore Plans, Logout...) |
| 13-header-more-menu.png | Menu "..." do header: Change view, Filter by, Sort by |
| 21-change-view-submenu.png | Submenu de visão: Magazine, Cards, Article view, Title-Only |
| 23-filter-submenu.png, 24-sort-submenu.png | Submenus de filtro e ordenação |
| 14-row-hover.png | Hover em linha Title-Only (ações à direita) |
| 15-article-open.png, 22-article-open-*.png | Leitor inline (painel deslizante) em cada modo |
| 33-reader-more-menu.png, 34-reader-scrolled-end.png | Menu "..." do leitor; fim do artigo |
| 16-shortcuts-overlay*.png | Modal de atalhos de teclado (3 páginas) |
| 17-sort-dropdown.png | Dropdown "Latest" |
| 18-sidebar-collapsed.png, 25-sidebar-*.png | Sidebar escondida e peek por hover |
| 26-sidebar-feed-menu.png | Menu "..." de feed: Mark as Read, Rename, Add to Favorites, Reorganize, See Similar, Unfollow |
| 27-sidebar-folder-hover.png, 27-sidebar-folder-menu.png | Hover em pasta e menu "+" (Create AI Feed, Follow Source) |
| 28-organize-feeds.png | Página Organize (g o) |
| 29-index.png | Página Index (g i) |
| 30-preferences*.png | Modal Preferences: General, Feedly AI, Appearance, Saving & Sharing, Mark as Read, Logins, Privacy, Your Profile |
| 31-discover-results.png, 32-follow-dialog.png | Resultado de busca de fonte e diálogo Follow |
| 35-sidebar-bottom.png | Rodapé da sidebar: Boards, Integrations & API, Blog, Learn & get support |
| 36-create-board.png | Painel Create New Board |
| 37-ask-ai-panel.png | Painel lateral Ask AI (premium) |
| 38-mark-as-read-menu.png | Menu do botão Mark as read |
| 39-feed-header-more-menu.png | Menu "..." no header de um feed |
| 40-theme-dark-*.png | Tema escuro: preferences, All, artigo, Today, discover |
| 41-density-compact.png, 41-density-comfortable.png | Densidades do Title-Only |
| view-titleonly*.png, view-magazine*.png, view-cards*.png, view-articleview*.png | Os quatro modos, com item selecionado e scroll |
