#!/usr/bin/env node
/* Thcode build — concatena os módulos-fonte de js/core/ em script.js.
 *
 * Por quê concatenação e não ES modules/bundler?
 * O site é hospedado como estático (GitHub Pages) sem etapa de build no deploy,
 * e a suíte de testes (tests/smoke.mjs, tests/ui-regression.mjs) carrega o
 * script.js gerado via jsdom `eval`, o que não é compatível com import/export
 * nativo. Concatenar mantém o runtime idêntico (zero risco de regressão) e
 * ainda separa o código em ~22 arquivos por domínio (editor, painéis, IA,
 * terminal, plugins…), então dividir/manter fica bem mais fácil.
 *
 * Uso:
 *   node scripts/build.mjs         → gera script.js a partir de js/core/*
 *   node scripts/build.mjs --check → gera em memória e falha se divergir do script.js atual (CI)
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = join(root, 'js', 'core');
const manifest = JSON.parse(readFileSync(join(coreDir, '_manifest.json'), 'utf8'));

const header = readFileSync(join(coreDir, '_header.js'), 'utf8');
const footer = readFileSync(join(coreDir, '_footer.js'), 'utf8');
const body = manifest.map(f => readFileSync(join(coreDir, f), 'utf8')).join('');

const output = header + body + footer;
const outPath = join(root, 'script.js');

if (process.argv.includes('--check')) {
  const current = readFileSync(outPath, 'utf8');
  if (current !== output) {
    console.error('BUILD CHECK FALHOU: script.js está desatualizado em relação a js/core/*.');
    console.error('Rode: node scripts/build.mjs');
    process.exit(1);
  }
  console.log('BUILD CHECK OK: script.js == concatenação de js/core/*');
  process.exit(0);
}

writeFileSync(outPath, output, 'utf8');
console.log(`script.js gerado a partir de ${manifest.length} módulos em js/core/ (${output.length} bytes).`);
