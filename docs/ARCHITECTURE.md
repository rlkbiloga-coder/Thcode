# Arquitetura

```
index.html   → shell: splash, editor, painéis, páginas, diálogos, SVG sprite
style.css    → design system (variáveis --bg/--bar/--accent...), 11+3 temas
script.js    → app completo em um IIFE (~4800 linhas, ES6+, sem frameworks)
manifest.json + sw.js → PWA instalável, cache-first offline
tests/smoke.mjs       → 40+ checagens jsdom (boot, edição, terminal, plugins)
```

## Módulos (dentro de `script.js`)

| Módulo | Papel |
|---|---|
| `S` / `Store` | Configurações + persistência `localStorage` (`thcode.app.v2`, migra da v1) |
| `FS` + `fGet/fSet/fDel` | Sistema de arquivos virtual `{c, u}` + `FS.dirs` |
| `Ed` / `T` / `AC` | Editor textarea+overlay, abas/undo, autocomplete |
| `Bash` / `Term` | Bash (vars, pipes, `>`, `&&`, globs, `$(...)`) sobre o terminal |
| `Panel` / `Page` | Painel lateral (12 seções) e pilha de páginas fullscreen |
| `Plugins` / `PluginDetail` / `PluginSettings` | Catálogo (43), detalhes, schemas, overlay de instalação |
| `CAPS` / `computeCaps()` | Efeitos reais calculados dos plugins instalados |
| `Browser` | Navegador de preview (Devices, Disable Cache, Open in Browser) |
| `Conn` | Conectores reais: `api.github.com` + OpenRouter (chave do usuário) |
| `GH` / `AI` | Painéis GitHub (API real + cache) e IA (offline + API real) |
| `Auth` | Contas locais com hash + sessão (sem servidor) |
| `CustomPlugins` / `ThcodeAPI` / `Hooks` | Plugins do usuário: arquivo/URL/modelo |
| `Tools` | Paleta: paleta de cores, TODOs, lint, JSON, git, APK, stats, npm… |
| `realBoot` / `Metrics` | Boot em etapas reais + métricas de desempenho |

## Dados locais

| Chave | Conteúdo |
|---|---|
| `thcode.app.v2` | Tudo do app (settings, FS, abas, plugins, chats, terminal…) |
| `thcode.custom.v1` | Plugins personalizados (código-fonte) |
| `thcode.users.v1` / `thcode.session.v1` | Contas locais (hash) + sessão |
| `thcode.gh.*` | Cache de buscas GitHub |
