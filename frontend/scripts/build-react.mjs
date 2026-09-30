#!/usr/bin/env node
/* Build da camada React — esbuild bundle js/react/entry.jsx → js/react-app.js
 * Saída: iife único e autocontido (React incluído), minificado.
 *
 * Uso:
 *   node scripts/build-react.mjs         → gera js/react-app.js
 *   node scripts/build-react.mjs --check → falha se o bundle commitado divergir da fonte (CI)
 */
import * as esbuild from 'esbuild';
import { readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(root, 'js', 'react-app.js');

const opts = {
  entryPoints: [join(root, 'js', 'react', 'entry.jsx')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  jsx: 'automatic',
  charset: 'utf8',
  legalComments: 'none',
  minify: true,
  banner: { js: '/* Thcode React layer — gerado por scripts/build-react.mjs (NÃO EDITE) */' },
  outfile,
};

if (process.argv.includes('--check')) {
  const result = await esbuild.build({ ...opts, write: false });
  const fresh = result.outputFiles[0].text;
  const current = readFileSync(outfile, 'utf8');
  if (current !== fresh) {
    console.error('BUILD-CHECK FALHOU: js/react-app.js está desatualizado em relação a js/react/*.');
    console.error('Rode: node scripts/build-react.mjs');
    process.exit(1);
  }
  console.log('BUILD-CHECK OK: js/react-app.js == bundle de js/react/*');
  process.exit(0);
}

await esbuild.build(opts);
console.log(`js/react-app.js gerado (${statSync(outfile).size} bytes minificados).`);
