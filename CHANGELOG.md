# Changelog

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
