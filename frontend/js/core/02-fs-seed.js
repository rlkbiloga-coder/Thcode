/* ============================== VIRTUAL FS (semente) ============================== */
const SEED = {
  '/MeuJarvis/index.html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MeuJarvis • Assistente</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app">
    <header class="hero">
      <span class="badge">online</span>
      <h1>Olá, eu sou o <em>MeuJarvis</em></h1>
      <p>Seu assistente pessoal feito no Acode.</p>
      <button id="btn">Falar com Jarvis</button>
    </header>
    <section class="log" id="log"></section>
  </main>
  <script src="script.js"></script>
</body>
</html>
`,
  '/MeuJarvis/style.css': `/* MeuJarvis — tema neon */
:root {
  --bg: #0b0e13;
  --accent: #a100ff;
  --text: #eef1f6;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
}

.hero { text-align: center; padding: 48px 20px; }

.hero h1 em { color: var(--accent); font-style: normal; }

button {
  background: var(--accent);
  color: #fff;
  border: 0;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 700;
}

.log { max-width: 520px; margin: 0 auto; padding: 16px; }
`,
  '/MeuJarvis/script.js': `// MeuJarvis — lógica principal
const log = document.getElementById('log');
const btn = document.getElementById('btn');

const respostas = [
  'Sistemas operacionais, senhor.',
  'Analisando ambiente... tudo certo!',
  'Pronto para ajudar no seu código.'
];

function falar(texto) {
  const p = document.createElement('p');
  const hora = new Date().toLocaleTimeString('pt-BR');
  p.textContent = \`[\${hora}] Jarvis: \${texto}\`;
  log.appendChild(p);
}

btn.addEventListener('click', () => {
  const i = Math.floor(Math.random() * respostas.length);
  falar(respostas[i]);
});

falar('Inicializado com sucesso.');
`,
  '/MeuJarvis/app.lua': `-- MeuJarvis em Lua
local jarvis = { nome = "Jarvis", versao = "1.0" }

function jarvis:falar(texto)
  print("[" .. self.nome .. "] " .. texto)
end

local comandos = { "status", "ajuda", "hora" }
for i, cmd in ipairs(comandos) do
  jarvis:falar("comando #" .. i .. ": " .. cmd)
end

jarvis:falar("Pronto para uso!")
`,
  '/MeuJarvis/README.md': `# MeuJarvis

Assistente pessoal criado e editado no **Acode Mobile IDE**.

## Estrutura

- \`index.html\` — interface
- \`style.css\` — estilos neon
- \`script.js\` — lógica
- \`app.lua\` — versão Lua

## Preview

Abra \`index.html\` e toque em **Preview**.
`,
  '/MeuJarvis/data/config.json': `{
  "name": "MeuJarvis",
  "version": "1.0.0",
  "theme": "neon",
  "features": ["voice", "preview", "terminal"],
  "debug": false
}
`,
  '/MeuJarvis/plugins/sample.js': `// Plugin de exemplo do MeuJarvis
acode.registerPlugin('meu-jarvis', {
  onLoad() {
    console.log('[MeuJarvis] plugin carregado');
  }
});
`,
  '/MeuJarvis/components/.keep': '',
  '/MeuJarvis/assets/.keep': ''
};
let FS = { files: {}, dirs: ['/MeuJarvis', '/MeuJarvis/assets', '/MeuJarvis/components', '/MeuJarvis/plugins', '/MeuJarvis/data'] };
function seedFS() {
  FS.files = {};
  for (const [p, c] of Object.entries(SEED)) FS.files[p] = { c, u: Date.now() };
}
const normPath = p => {
  if (!p) return '/';
  let parts = [];
  for (const seg of String(p).split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop(); else parts.push(seg);
  }
  return '/' + parts.join('/');
};
const fGet = p => FS.files[normPath(p)] || null;
const fExists = p => !!fGet(p);
const dExists = p => { p = normPath(p); return p === '/' || FS.dirs.includes(p) || Object.keys(FS.files).some(f => f.startsWith(p + '/')); };
function fSet(p, content) { p = normPath(p); FS.files[p] = { c: String(content ?? ''), u: Date.now() }; ensureDir(p.split('/').slice(0, -1).join('/') || '/'); Store.save(); }
function fDel(p) {
  p = normPath(p);
  if (FS.files[p]) { delete FS.files[p]; Store.save(); return true; }
  const prefix = p + '/';
  let found = false;
  for (const k of Object.keys(FS.files)) if (k.startsWith(prefix)) { delete FS.files[k]; found = true; }
  FS.dirs = FS.dirs.filter(d => d !== p && !d.startsWith(prefix));
  Store.save(); return found;
}
function ensureDir(p) { p = normPath(p); if (p === '/') return; const parts = p.split('/').filter(Boolean); let cur = ''; for (const s of parts) { cur += '/' + s; if (!FS.dirs.includes(cur)) FS.dirs.push(cur); } }
function listDir(p) {
  p = normPath(p);
  const dirs = new Set(), files = [];
  const prefix = p === '/' ? '/' : p + '/';
  for (const d of FS.dirs) { if (d.startsWith(prefix) && d !== p) { const rest = d.slice(prefix.length); if (rest && !rest.includes('/')) dirs.add(rest); } }
  for (const f of Object.keys(FS.files)) {
    if (f.startsWith(prefix)) {
      const rest = f.slice(prefix.length);
      if (!rest) continue;
      if (!rest.includes('/')) files.push(rest);
      else dirs.add(rest.split('/')[0]);
    }
  }
  return { dirs: [...dirs].sort((a, b) => a.localeCompare(b)), files: files.sort((a, b) => a.localeCompare(b)) };
}
const baseName = p => normPath(p).split('/').pop();
const dirName = p => { const n = normPath(p); const i = n.lastIndexOf('/'); return i <= 0 ? '/' : n.slice(0, i); };
const joinPath = (a, b) => normPath(a + '/' + b);

