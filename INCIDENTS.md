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
