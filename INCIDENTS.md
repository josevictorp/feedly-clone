# INCIDENTS.md — Bugs, armadilhas e lições

Registre aqui tudo que custou tempo e que custaria tempo de novo para outra pessoa ou sessão. Não é lista de bugs abertos (isso vai para BACKLOG.md); é memória do que deu errado e como se resolve.

Formato de cada entrada:

```
## YYYY-MM-DD — Título curto

**Sintoma:** o que se viu.
**Causa:** o que estava acontecendo de fato.
**Solução:** o que resolveu.
**Como evitar:** regra, check ou teste que impede a repetição.
```

---

## 2026-09-16 — grill-me sozinha não funciona

**Sintoma:** a skill `grill-me` instalada não faz nada por si só.
**Causa:** o SKILL.md dela apenas delega para a skill `grilling`, que precisa estar instalada separadamente.
**Solução:** instalada `grilling` do mesmo repositório (mattpocock/skills).
**Como evitar:** ao instalar skills do mattpocock/skills, verificar se o SKILL.md delega para outra skill e instalar as duas.

## 2026-09-16 — Não dá para dirigir o Chrome logado do usuário a partir desta sessão

**Sintoma:** usuário logado no Feedly no Chrome, mas a sessão não tem ferramentas de browser; ler o perfil do Chrome falha com "Operation not permitted".
**Causa:** a integração Claude in Chrome não está registrada no Chrome (não há native host em `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`), e o diretório do perfil é protegido por TCC (sem Full Disk Access para o terminal). Chrome 136+ também bloqueia `--remote-debugging-port` no perfil padrão.
**Solução:** abrir um segundo Chrome com `--user-data-dir=~/.local/share/feedly-clone/chrome-profile --remote-debugging-port=9333` e controlar via playwright-core `connectOverCDP`. O usuário faz login no Feedly uma vez nesse perfil.
**Como evitar:** reutilizar sempre esse perfil; não tentar copiar cookies do perfil principal.

## 2026-09-16 — Porta 3000 ocupada por outro projeto da máquina

**Sintoma:** `pnpm dev` derruba o servidor com `EADDRINUSE` na porta 3000, mas o Vite sobe normalmente.
**Causa:** outro projeto do usuário (`~/Projetos/meus/vps/workflow/pulse`, Next.js dev) já escuta em 3000. O Feedly Clone usa 3000 por decisão da grelha (G10).
**Solução:** parar o outro processo, ou subir com `PORT=3001 pnpm start`. O servidor agora detecta `EADDRINUSE` e encerra com uma mensagem dizendo o que fazer, em vez de despejar um stack trace.
**Como evitar:** antes de reportar "o servidor não sobe", rodar `lsof -nP -iTCP:3000 -sTCP:LISTEN`. Nunca matar processo de outro projeto do usuário sem perguntar.

## 2026-09-16 — TypeScript 7 não serve para este projeto

**Sintoma:** `typescript@latest` resolve para 7.0.2, mas o lint quebra.
**Causa:** `typescript-eslint@8.70` declara peer `typescript: ">=4.8.4 <6.1.0"`. O TS 7 (port em Go) ainda não é suportado.
**Solução:** fixado `typescript: ~5.9.3` na raiz do workspace.
**Como evitar:** ao atualizar TypeScript, conferir antes o peer range do `typescript-eslint`.

## 2026-09-16 — Node 26 não traz mais o corepack

**Sintoma:** `corepack enable` falha com "command not found", apesar do `packageManager` no package.json.
**Causa:** o corepack foi removido das distribuições do Node; o `pnpm` do PATH vinha do Homebrew, na versão 9.
**Solução:** `npm i -g pnpm@12.4.2`. O `packageManager` do package.json continua declarando a versão esperada.
**Como evitar:** o README lista pnpm 12 como requisito explícito; conferir com `pnpm -v` antes de instalar.

## 2026-09-16 — Prettier reformatou specs aprovadas e skills de terceiros

**Sintoma:** `pnpm format` alterou `docs/superpowers/specs/`, `docs/research/` e `.claude/skills/`, reflowando tabelas Markdown.
**Causa:** o `.prettierignore` inicial só excluía subpastas de `docs/research/`. Além disso, o alinhamento de tabela do Prettier conta bytes, não colunas, então tabelas com acentos ficam tortas.
**Solução:** `git checkout` do que foi tocado e `.prettierignore` passou a excluir `docs/`, `.claude/` e `*.md`.
**Como evitar:** Prettier cobre código e configuração; documentação deste projeto é escrita à mão (CLAUDE.md proíbe reescrever spec aprovada).

## 2026-09-16 — pnpm 12 bloqueia scripts de instalação, e liberar o do better-sqlite3 quebra

**Sintoma:** `pnpm add better-sqlite3` falha com `ERR_PNPM_IGNORED_BUILDS`. Ao liberar o build em `allowBuilds`, falha de novo com `node-gyp rebuild exited with status 127`.
**Causa:** o pnpm 12 não roda scripts de instalação sem aprovação (chave `allowBuilds` no `pnpm-workspace.yaml`, não `onlyBuiltDependencies`). E o better-sqlite3 13 já traz binários N-API prontos em `prebuilds/`; como ele tem `binding.gyp`, aprovar o build dispara um `node-gyp rebuild` desnecessário, que falha porque não há node-gyp no PATH.
**Solução:** `allowBuilds: { better-sqlite3: false, esbuild: true }`. O binário `darwin-arm64.node` do pacote é usado direto (SQLite 3.53.4 no Node 26).
**Como evitar:** antes de liberar um build nativo, conferir se o pacote tem `prebuilds/`. Se tiver, o certo é **negar** o build.

## 2026-09-16 — feedsmith recusa OPML degenerado nos dois sentidos

**Sintoma:** `parseOpml('<opml><body></body></opml>')` lança "Invalid OPML format"; `generateOpml` com `outlines: []` lança "Invalid input OPML".
**Causa:** o feedsmith exige que o documento tenha ou head com conteúdo ou pelo menos um outline.
**Solução:** `parseOpmlDocument` embrulha o erro em `InvalidOpmlError` com mensagem em português (a API devolve 400); `exportOpml` gera à mão o documento mínimo quando não há nenhum feed.
**Como evitar:** ao usar o feedsmith para OPML, tratar os dois extremos; o caminho feliz esconde ambos.

## 2026-09-16 — Data legítima de feed virava "futuro" no teste

**Sintoma:** o teste do feed RDF esperava a data real do item e recebia o `fetchedAt`.
**Causa:** a normalização achata datas mais de 1 h à frente do fetch (defesa contra feed que se fixa no topo da lista). O relógio do teste estava antes da data das fixtures congeladas.
**Solução:** `FETCHED_AT` dos testes fixado em 2026-09-17T12:00Z, depois de toda data das fixtures.
**Como evitar:** ao congelar fixtures novas, conferir se a data mais recente delas é anterior ao relógio dos testes.
