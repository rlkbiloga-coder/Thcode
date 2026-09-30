# Arquitetura do frontend (script.js modularizado)

`script.js` (o arquivo servido em produção) **é gerado**, não é mais editado
diretamente. O código-fonte real vive em `js/core/`, dividido em ~22 módulos
por domínio, seguindo a arquitetura descrita no topo do arquivo histórico:

```
Util · Store · Settings · FS · Tabs · Editor · Panels · Plugins · Terminal
Console · Process · Preview · AI · Palette · Pages · Gestures · Boot
```

## Por que concatenação, e não `import`/`export` nativo ou um bundler?

1. O site é hospedado como arquivos estáticos (GitHub Pages) sem etapa de
   build no deploy — `index.html` carrega `<script src="script.js">` direto.
2. A suíte de testes (`tests/smoke.mjs`, `tests/ui-regression.mjs`) carrega
   `script.js` via jsdom (`eval` do texto inteiro), o que não entende
   `import`/`export` nativo nem module graphs.
3. Concatenar mantém o `script.js` final **byte-idêntico** ao arquivo
   monolítico anterior — zero risco de regressão de runtime — só muda onde
   o código-fonte é editado.

## Como editar

1. Edite o módulo relevante em `js/core/NN-nome.js` (nunca `script.js`
   diretamente — ele é sobrescrito no build).
2. Rode `npm run build` (gera `script.js` a partir de `js/core/*`).
3. Rode `npm test` (o próprio `test` já roda `build --check` antes de tudo,
   então um `script.js` desatualizado falha o CI).

## Módulos (`js/core/`)

| Arquivo | Conteúdo |
|---|---|
| `_header.js` / `_footer.js` | Abertura/fechamento da IIFE (`(() => { 'use strict';` … `})();`) |
| `01-core-util.js` | Util, Store, Settings padrão, Themes |
| `02-fs-seed.js` | Virtual FS (dados iniciais) |
| `03-state-console-langs.js` | State, Console Log, Notificações (dados), Linguagens |
| `04-highlighter.js` | Realce de sintaxe |
| `05-editor-core.js` | Editor core, Tabs, operações de arquivo, bindings |
| `06-editor-extras.js` | Autocomplete, preview de cor, Find/Replace, Quicktools |
| `07-panel-files-search.js` | Painel de roteamento, Explorer, Busca |
| `08-panel-plugins-favs.js` | Plugins, Notificações (painel), Favoritos |
| `09-panel-github-terminal.js` | GitHub (painel), Terminal, Console |
| `10-panel-process-preview-ai.js` | Processos, Preview, IA (Rutex Agent) |
| `11-ui-palette-pages.js` | Paleta de comandos, Pages |
| `12-ui-settings-pages.js` | Páginas de configurações |
| `13-ui-drawer-menu.js` | Drawer, menu de arquivo, Conta, Gestos, Statusbar |
| `14-boot.js` | Função `boot()` |
| `15-data-plugin-catalog.js` | Catálogo de plugins (dados) |
| `16-runtime-bash.js` | Bash real (variáveis, pipes, glob) |
| `17-runtime-custom-plugins.js` | API de plugins personalizados + hooks |
| `18-runtime-boot-pwa.js` | Boot real, PWA, métricas, aviso de update, Share Target |
| `19-ui-preview-browser.js` | Navegador de preview |
| `20-runtime-connectors.js` | Conectores reais (GitHub + OpenRouter) |
| `21-runtime-accounts.js` | Contas locais |
| `22-ui-tools-final.js` | Tools, extensão da paleta, `window.ThcodeTest`, boot listener |

`js/thcode-pro.js`, `js/thcode-server.js`, `js/thcode-promo.js` e
`js/thcode-legal.js` continuam como estavam — eles já eram módulos separados
que estendem `window.ThcodeTest` depois do boot.
