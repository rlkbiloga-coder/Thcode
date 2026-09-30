/* Teste da camada React (Painel) — carrega o app real + bundle react-app.js
 * no jsdom, abre o Painel e valida a renderização. Uso: node tests/react.mjs */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const script = readFileSync(join(root, 'script.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const react = readFileSync(join(root, 'js', 'react-app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');

let doc = html.replace(/<script src="script\.js[^"]*"><\/script>/, () => `<script>${script}</script>`);
doc = doc.replace(/<script src="js\/react-app\.js[^"]*"[^>]*><\/script>/, () => `<script>${react}</script>`);

const jsErrors = [];
const dom = new JSDOM(doc, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.Element.prototype.scrollIntoView = function () {};
    window.addEventListener('error', e => jsErrors.push(String(e.message || e.error)));
  }
});
const { window } = dom;
const { document } = window;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms = 10000, label = '') {
  const t0 = Date.now();
  for (;;) {
    try { if (fn()) return true; } catch (_) {}
    if (Date.now() - t0 > ms) throw new Error('timeout: ' + label);
    await sleep(120);
  }
}

let pass = 0, fail = 0;
const test = async (name, fn) => {
  try { await fn(); pass++; console.log('PASS  ' + name); }
  catch (e) { fail++; console.log('FAIL  ' + name + ' → ' + (e.message || e)); }
};
const assert = (c, m) => { if (!c) throw new Error(m || 'assert'); };

setTimeout(() => { console.log('TRAVADO em tests/react.mjs'); process.exit(2); }, 120000).unref?.();

await test('camada React carregada e exposta', async () => {
  await waitFor(() => !document.querySelector('#splash') && !document.querySelector('#app').classList.contains('hidden'), 12000, 'boot');
  assert(window.ThcodeReact && window.ThcodeTest, 'ThcodeReact/ThcodeTest ausentes');
});

await test('painel React abre e renderiza', async () => {
  window.ThcodeReact.open();
  await waitFor(() => document.querySelector('#pageBody .set-row'), 8000, 'painel montar');
  assert(document.querySelector('#pageTitle').textContent === 'Painel', 'título da página errado');
  const body = document.querySelector('#pageBody').textContent;
  assert(body.includes('Ações rápidas'), 'sem ações rápidas');
  assert(body.includes('Novo arquivo'), 'sem botão novo arquivo');
  assert(body.includes('React 18'), 'sem versão do React');
  assert(body.includes('Estado do app'), 'sem seção de estado');
});

await test('ação do painel React chama o core', async () => {
  const btn = [...document.querySelectorAll('#pageBody .set-row')].find(b => b.textContent.includes('Novo arquivo'));
  assert(btn, 'botão novo arquivo ausente');
  btn.click();
  await sleep(300);
  const T = window.ThcodeTest;
  assert(T && T.S, 'core vivo');
});

console.log(`\nReact layer: ${pass} pass, ${fail} fail`);
if (jsErrors.length) console.log('JS errors capturados: ' + jsErrors.slice(0, 3).join(' | '));
process.exit(fail ? 1 : 0);
