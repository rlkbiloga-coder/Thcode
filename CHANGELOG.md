# Changelog

## v2.4.4 — 2026-09-30 (#8)

- Modularização: script.js (290KB, monolítico) dividido em 22 módulos-fonte em frontend/js/core/, organizados por domínio (editor, painéis, IA, terminal, plugins, boot…)
- script.js agora é gerado por `npm run build` (scripts/build.mjs) a partir de js/core/* — saída byte-idêntica ao monolito anterior, zero risco de regressão de runtime
- `npm test` roda `build --check` antes de tudo: falha se o script.js gerado divergir da fonte modular (evita script.js desatualizado)
- js/core/README.md documenta a arquitetura e por que concatenação foi escolhida em vez de ES modules/bundler (site estático + testes via eval no jsdom) — fecha #8

## v2.4.3 — 2026-09-30 (#3, #5, #7)

- IA: comando "Explique e corrija o arquivo" — envia o arquivo aberto como contexto ao agente e adiciona botão "Aplicar correção" nas respostas com código — fecha #5
- Aparelho: File System Access API real — abrir pasta real do aparelho (desktop Chrome/Edge), editar e gravar de volta; no Android, aviso honesto + salvar via download — fecha #3
- Acessibilidade: 14 temas agora cumprem contraste WCAG AA (corrigidos muted/gutter/accent fora do mínimo) + teste automatizado de contraste no CI (tests/wcag.mjs) — fecha #7
- Base: exportado icon() para módulos PRO (bug latente nos painéis Vault/Net/Git)

## v2.4.2 — 2026-09-30 (#1, #2)

- PWA: aviso de nova versão com botão "Recarregar" (updatefound + SKIP_WAITING, verificação a cada 6h) — fecha #1
- Web Share Target: compartilhar arquivos/texto do Android abre direto no editor (POST multipart interceptado pelo SW, stash em cache e importação ao VFS) — fecha #2
- Versões de asset/cache bump para 2.4.2


## v2.0.0 — 2026-09-28 (Thcode)

- Nova identidade open-source (MIT): Thcode, logotipo `<T/>`, PWA instalável
- 43 plugins: detalhes (Visão Geral/Contribuidores/Changelog), ⚙ por plugin, overlay de instalação
- Efeitos reais: temas, arco-íris, breadcrumb, packs de ícones, Emmet, snippets…
- Terminal bash: variáveis, pipes, `>`/`>>`, `&&`/`||`, globs, `$(...)`, curl real
- Preview browser: URL localhost:8158, Devices, Disable Cache, Open in Browser
- Conectores reais: GitHub API + OpenRouter (chave do usuário)
- Contas locais, Serviços, Métricas, Diagnóstico, Descobrir, Termos/Privacidade
- API de plugins personalizados (arquivo/URL/modelo) + comandos na paleta

## v1.13.5 — base Acode

- Editor, terminal Alpine, 27 plugins, IA offline, GitHub simulado.

## 2.1.0 — Thcode PRO (2026-09-29)
- GitHub real: clone, status, commit, push e pull via API REST (token no Vault)
- Vault: tokens criptografados com AES-256-GCM + PBKDF2 (WebCrypto)
- Internet real: curl/wget com fetch + proxy CORS de fallback, busca DuckDuckGo, Wikipédia
- pkg: package manager real (npm registry + jsDelivr) com instalação no VFS
- Runner: execução real de JavaScript com captura de console + preview real de HTML via srcdoc
- Processos reais (spawn) ligados a tarefas reais (clone, push, build)
- Android Bridge: Web Share, importar/baixar arquivos, bateria, rede, fullscreen, install PWA
- IA real: Groq, OpenRouter (free) e Ollama local (http://localhost:12434)
- Comandos novos no terminal: git, pkg, curl, wget, ddg, vault, bridge, neofetch, runreal
- Ícones PNG (192/512) gerados, manifest v2.1, SW cache v2.1
- Error boundary global (window.onerror + unhandledrejection)
