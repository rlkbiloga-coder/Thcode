# Camada React (Painel)

O Thcode é core vanilla (js/core/* → script.js via concatenação), com uma
**ilha React** para as telas de UI que se beneficiam de componentes com estado.

- `entry.jsx` — bundle único (`js/react-app.js`, iife + React embutido,
  ~140KB minificado), carregado com `defer` no index.html e precacheado no
  service worker. Expõe `window.ThcodeReact.open()`.
- `home.jsx` — **Painel**: Home do app com ações rápidas, arquivos do
  workspace e estado (versão, boot, plugins, tema). Todo acesso ao app vai
  por `window.ThcodeTest` — o React nunca toca o estado interno do core
  diretamente.

## Builds

- `npm run build:react` — esbuild bundle → `js/react-app.js` (minificado).
- `npm test` roda `build-react --check`: o bundle commitado precisa ser
  byte-idêntico ao bundle da fonte (mesma versão do esbuild).
- `npm run dev` — servidor em http://localhost:5173 com watch de
  `js/react/*` (saída idêntica ao prod, então o --check continua válido).
  Para o core vanilla: edite `js/core/*` e rode `npm run build` em outro
  terminal.

## Testes

`tests/react.mjs` carrega o app real + o bundle no jsdom, abre o Painel e
valida renderização e chamadas ao core.
