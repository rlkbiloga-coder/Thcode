/* WCAG AA: contraste mínimo nos 14 temas (parsa style.css e valida pares-chave).
 * Uso: node tests/wcag.mjs (a partir de frontend/)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(root, 'style.css'), 'utf8');
const blocks = [...css.matchAll(/body\[data-theme="(\w+)"\]\{([^}]+)\}/g)];
if (!blocks.length) { console.error('WCAG FAIL: nenhum tema encontrado no CSS'); process.exit(1); }

const h2rgb = h => {
  h = h.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [l1, l2] = [lum(h2rgb(a)), lum(h2rgb(b))].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

/* [variável-foreground, variável-background, mínimo exigido] */
const CHECKS = [
  ['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text2', 'bg', 4.5],
  ['muted', 'bg', 4.5], ['muted2', 'bg', 3.0],
  ['accent-ink', 'accent', 4.5],
  ['editor-fg', 'editor-bg', 4.5], ['gutter-fg', 'editor-bg', 3.0]
];

let fail = 0;
for (const [, name, body] of blocks.map(m => [null, m[1], m[2]])) {
  const vars = Object.fromEntries([...body.matchAll(/--([\w-]+):([^;]+);/g)].map(x => [x[1], x[2].trim()]));
  const bad = [];
  for (const [fg, bg, min] of CHECKS) {
    if (!vars[fg] || !vars[bg] || vars[fg].startsWith('rgba') || vars[bg].startsWith('rgba')) continue;
    const r = ratio(vars[fg], vars[bg]);
    if (r < min) bad.push(`${fg}/${bg} ${r.toFixed(2)} < ${min}`);
  }
  if (bad.length) { fail++; console.error(`FAIL ${name}: ${bad.join('; ')}`); }
  else console.log(`PASS  ${name} WCAG AA`);
}
console.log(fail ? `\nWCAG FAIL: ${fail} tema(s) fora do contraste AA` : '\nWCAG OK: todos os temas acima do contraste AA');
process.exit(fail ? 1 : 0);
