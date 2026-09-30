#!/usr/bin/env node
/* Servidor de desenvolvimento: esbuild watch + serve estático do frontend/.
 * Uso: npm run dev  → http://localhost:5173
 * - js/react/* recompila sozinho para js/react-app.js (recarregue a página)
 * - o resto (script.js, style.css…) é servido direto do disco
 * Para HMR real do núcleo, edite js/core/* e rode `npm run build` noutro terminal. */
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const ctx = await esbuild.context({
  entryPoints: [join(root, 'js', 'react', 'entry.jsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  jsx: 'automatic',
  charset: 'utf8',
  minify: true,  /* mantém a saída idêntica ao build de produção (build-react --check) */
  outfile: join(root, 'js', 'react-app.js'),
});

await ctx.watch();
const { port } = await ctx.serve({ servedir: root, port: 5173 });
console.log(`Dev server: http://localhost:${port}/  (js/react/* assistido — recarregue a página após editar)`);
