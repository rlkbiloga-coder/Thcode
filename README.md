# Thcode — Mobile IDE

Editor de código mobile **open-source (MIT)**, feito com **HTML5 + CSS3 + JavaScript puro** — sem frameworks.

![Thcode](assets/logo.svg)

## ✨ Destaques

- 📝 Editor com abas, undo/redo, autocomplete, minimapa e 14 temas
- 🐧 Terminal **bash real**: variáveis, pipes, `>`/`>>`, `&&`, globs, `$(...)`, `curl`
- 🧩 **43 plugins** com páginas de detalhes, ⚙ configurações e instalação animada
- 🌐 Preview browser: `localhost:8158`, Devices, Disable Cache, Open in Browser
- 🤖 IA offline + **API real (OpenRouter)** com sua chave, GitHub API real
- 👤 Contas locais, Serviços, Métricas, Diagnóstico, Descobrir, Termos/Privacidade
- 🔌 Crie seus próprios plugins (arquivo / URL / modelo) — [API](docs/PLUGIN_API.md)
- 📲 PWA instalável, funciona offline

## 🚀 Rodar

```bash
npm start        # serve em http://localhost:8158
# ou abra index.html direto no navegador
```

## ✅ Testar

```bash
npm test         # node --check + 50 checagens jsdom
```

## 📁 Estrutura

```
index.html  style.css  script.js   → app (funciona sozinho, sem build)
manifest.json  sw.js  assets/      → PWA
tests/smoke.mjs                    → suíte de testes
docs/                              → PLUGIN_API, ARCHITECTURE, PRIVACY, TERMS…
.github/                           → CI, templates, CODEOWNERS
```

## 📄 Legal e Proteção

- [Termos de Uso](docs/TERMS.md) · [Política de Privacidade](docs/PRIVACY.md) (LGPD, 100% local)
- [Código de Conduta](CODE_OF_CONDUCT.md) · [Segurança](SECURITY.md)
- Denúncia de vulnerabilidade: aba *Security* do repositório (relatório privado)

> Baseado nos fluxos do [Acode](https://github.com/Acode-Foundation/Acode) (GPL-3.0).
> O código do Thcode é original e licenciado em **MIT** — veja [LICENSE](LICENSE).

## 🔒 Privado?

Este repositório pode ser **privado**: todo o código roda no cliente, sem backend.
Para contribuir, veja [CONTRIBUTING](CONTRIBUTING.md). Para proteger a `main`,
siga [docs/BRANCH_PROTECTION](docs/BRANCH_PROTECTION.md).

## Thcode PRO (v2.1.0)
- *Git/GitHub real* — clone, commit e push via API REST
- *Vault* — tokens com AES-256-GCM no dispositivo
- *Terminal real* — curl, wget, pkg (npm+jsDelivr), runreal (JS real)
- *Internet* — fetch com proxy CORS, busca web
- *IA real* — Groq, OpenRouter, Ollama local
- *Android Bridge* — share, arquivos, bateria, install PWA
