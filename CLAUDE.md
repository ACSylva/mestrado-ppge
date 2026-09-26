# CLAUDE.md — site-dissertacao (Landing Page da Dissertação de Ana Cristina)

Este arquivo dá contexto ao Claude Code (e a quem mais abrir este projeto) sobre o que é esta pasta, o que já existe e o que **não pode ser mexido**.

## O que é este projeto

Landing page (site) para apresentar a dissertação de mestrado de Ana Cristina. O conteúdo da dissertação (texto e dados) serve de base para o site, mas o site é um projeto à parte, com seu próprio código-fonte.

## Status atual (26/09/2026)

O projeto "site-dissertacao" foi desenvolvido em um ambiente cloud (sessão remota do Claude Code) e ainda está sendo trazido para esta pasta local (`D:\Mestrado\MatAna\LandingPage`) via um `.zip` (`site-dissertacao.zip`) baixado da thread do projeto. Estrutura esperada depois de extraído:

- `content_export/` — conteúdo extraído da dissertação para uso no site
- `frontend/` — código do site (Node/npm — rodar `npm install` e `npm run dev` dentro desta pasta)
- `docs/` — documentação do projeto
- `README.md` — visão geral do projeto

O histórico do projeto tem vários commits em um repositório git **local, sem remoto** (não há GitHub configurado nem deve ser criado sem pedido explícito).

## Arquivos que NÃO podem ser sobrescritos ou movidos

- `DISSERTAÇÃO_ANA.docx` — documento original da dissertação, na raiz desta pasta.
- `Dados/` — pasta com as planilhas de dados da pesquisa (`.ods`, `.xlsx`, `.docx`, `.html`) usadas na dissertação. Essas planilhas são material-fonte para uma **Fase 2 futura** (ainda não iniciada) e não fazem parte do código do site. Não editar, mover, renomear nem incluir automaticamente no git do site.

Qualquer extração do `.zip` do projeto ou operação de setup deve preservar esses dois itens exatamente como estão.

## Regras de trabalho

- **Sem remoto no GitHub**: manter o git local sem configurar `origin` nem criar repositório remoto, a menos que o usuário peça explicitamente.
- **Não mexer em `Dados/`**: é material da Fase 2, fora do escopo do site atual.
- **Idioma**: comunicação com o usuário em português.
- **Ambiente**: Windows 11, PowerShell como shell principal. Node 24 / npm 12 já instalados nesta máquina.
- Abrir esta pasta no VS Code com `code d:\mestrado\matana\landingpage` ou via **Arquivo > Abrir Pasta**.

## Próximos passos (quando o `.zip` for extraído aqui)

1. Extrair `site-dissertacao.zip` nesta pasta, sem sobrescrever `DISSERTAÇÃO_ANA.docx` nem `Dados/`.
2. Conferir a estrutura (`content_export/`, `frontend/`, `docs/`, `README.md`).
3. `git init` + `git add -A` + commit local, se o usuário quiser manter o histórico aqui também (sem remoto).
4. Rodar `npm install` e `npm run dev` dentro de `frontend/` para confirmar que o site sobe.
