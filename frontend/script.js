/* ==========================================================================
   ACODE MOBILE IDE — script.js (JS puro ES6+, sem frameworks)
   Arquitetura em módulos internos:
   Util · Store · Settings · FS · Tabs · Editor · Panels · Plugins · Terminal
   Console · Process · Preview · AI · Palette · Pages · Gestures · Boot
   Dados de interface baseados no repositório público Acode-Foundation/Acode
   (src/lib/settings.js, src/theme/preInstalled.js, src/pages/*)
   ========================================================================== */
(() => {
'use strict';
const BOOT_T0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

/* ============================== UTIL ============================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const uid = () => 'id' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
const pad2 = n => String(n).padStart(2, '0');
const fmtTime = (d = new Date()) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const icon = (n, st = '') => `<svg ${st ? `style="${st}"` : ''} aria-hidden="true"><use href="#i-${n}"/></svg>`;
const APP_VER = 'v2.0.0 (2000)';
const ACODE_BASE = 'v1.13.5 (1011)';
const THCODE_REPO = 'https://github.com/rlkbiloga-coder/Thcode';

function vibrate(ms = 10) {
  try { if (S.vibrateOnTap && navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}

/* ---- toast ---- */
function toast(msg, ic = 'check') {
  const root = $('#toastRoot');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  root.appendChild(t);
  while (root.children.length > 3) root.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2200);
  vibrate(8);
}

/* ---- ripple global ---- */
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('.row,.set-row,.tab,.drawer-item,.popup-item,.pal-item,.qt-key,.big-btn,.pill-btn,.icon-btn,.rail-btn,.plugin-row,.tree-row,.mini-btn,.chip,.theme-card,.ctx-chip');
  if (!el) return;
  const r = el.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 1.1;
  const ink = document.createElement('span');
  ink.className = 'ink';
  ink.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  el.classList.add('ripple');
  el.appendChild(ink);
  setTimeout(() => ink.remove(), 550);
}, { passive: true });

/* ---- dialogs (promise) ---- */
function dialog({ title = '', body = '', buttons = [], wide = false, onMount = null }) {
  const root = $('#dialogRoot');
  root.classList.remove('hidden');
  root.innerHTML = `<div class="dialog" role="dialog" aria-modal="true">
    ${title ? `<div class="dialog-head">${esc(title)}</div>` : ''}
    <div class="dialog-body">${body}</div>
    ${buttons.length ? `<div class="dialog-foot">${buttons.map((b, i) => `<button data-i="${i}" class="${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''}">${esc(b.label)}</button>`).join('')}</div>` : ''}
  </div>`;
  return new Promise(resolve => {
    const close = val => { root.classList.add('hidden'); root.innerHTML = ''; resolve(val); };
    root.onclick = e => { if (e.target === root) close(null); };
    $$('#dialogRoot .dialog-foot button').forEach(btn => {
      btn.onclick = () => { const b = buttons[+btn.dataset.i]; if (b.keep) { b.action && b.action(close); } else close(b.value !== undefined ? b.value : (b.action ? b.action() : true)); };
    });
    if (onMount) onMount(close, root.querySelector('.dialog'));
  });
}
const dAlert = (title, msg) => dialog({ title, body: `<p style="margin:6px 0">${msg}</p>`, buttons: [{ label: 'OK', primary: true, value: true }] });
const dConfirm = (title, msg, okLabel = 'Confirmar') => dialog({ title, body: `<p style="margin:6px 0">${msg}</p>`, buttons: [{ label: 'Cancelar', value: false }, { label: okLabel, primary: true, value: true }] });
function dPrompt(title, value = '', placeholder = '') {
  return dialog({
    title, body: `<input type="text" id="dlgInput" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off">`,
    buttons: [{ label: 'Cancelar', value: null }, { label: 'OK', primary: true, action: () => $('#dlgInput').value }],
    onMount: () => { const i = $('#dlgInput'); i.focus(); i.select(); }
  });
}
function dList(title, items) {
  return dialog({
    title, body: `<div class="dialog-list">${items.map((it, i) => `<div class="pal-item" data-i="${i}">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>${it.hint ? `<span class="kbd">${esc(it.hint)}</span>` : ''}</div>`).join('')}</div>`,
    buttons: [], onMount: (close) => { $$('#dialogRoot .pal-item').forEach(el => el.onclick = () => close(items[+el.dataset.i].value ?? +el.dataset.i)); }
  });
}

/* ============================== STORE ============================== */
const LS_KEY = 'thcode.app.v2';
const OLD_LS_KEY = 'acode.mobile.v1'; // migração automática da v1
const Store = {
  load() {
    try {
      let raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        raw = localStorage.getItem(OLD_LS_KEY);
        if (raw) { try { localStorage.setItem(LS_KEY, raw); } catch (_) {} }
      }
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  },
  save: debounce(() => {
    try {
      const data = { v: 1, settings: S, fs: FS, tabs: T, recent: Recent.list, favs: Favs.list, plugins: Plugins.installed, notifs: Notifs.list.slice(0, 30), agentMsgs: AI.agentMsgs.slice(-60), aiChats: AI.chats.slice(-10), termHist: Term.hist.slice(-80), procs: Procs.list, gh: GH.user, cwd: Term.cwd, panel: Panel.current, panelOpen: Panel.isOpen(), pro: State.pro, adfree: State.adfree, appIcon: State.appIcon };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch (_) {}
  }, 400)
};

/* ============================== SETTINGS (padrões oficiais) ============================== */
const DEFAULT_SETTINGS = {
  animation: 'system', appTheme: 'neon', editorTheme: 'one_dark', autosave: 0,
  serverPort: 3000, previewPort: 8158, host: 'localhost', previewMode: 'inapp', disableCache: false, useCurrentFileForPreview: false,
  fontSize: '13.5px', editorFont: 'Roboto Mono', uiZoom: 100, textWrap: false, tabSize: 2, softTab: true,
  linenumbers: true, relativeLineNumbers: false, autoIndent: true, autoCloseBrackets: true, autoCloseTags: true, bracketMatching: true,
  highlightActiveLine: true, liveAutoCompletion: true, localWordCompletion: true, colorPreview: true, showSpaces: false, minimap: true,
  formatOnSave: false, formatter: {}, vibrateOnTap: true, confirmOnExit: true, showSideButtons: true, quickTools: 2,
  lang: 'pt-BR', appIcon: 'default', reduceMotion: false, editorZoom: 100, lineHeight: 1.62, cursorBlink: true,
  openFileListPos: 'header', fullscreen: false, floatingButton: true, rememberFiles: true, checkForAppUpdates: false, developerMode: false, termShell: 'sh',
  termFontSize: 12.5, termTheme: 'dark', termHistory: 200, lsp: {}, appFont: 'system',
  pluginSettings: {}, iconPack: 'default', uiDensity: 'comfortable', connKey: '', connReal: false, connModel: 'OpenRouter', devPreset: 'off'
};
let S = { ...DEFAULT_SETTINGS };

/* ============================== THEMES ============================== */
const THEMES = [
  { id: 'neon', name: 'Purple Neon', bg: '#0b0e13', bar: '#151a21', acc: '#a100ff' },
  { id: 'dark', name: 'Dark', bg: '#1b1e20', bar: '#23272a', acc: '#4285f4' },
  { id: 'oled', name: 'OLED Black', bg: '#000000', bar: '#080808', acc: '#007aff' },
  { id: 'ocean', name: 'Ocean', bg: '#13131a', bar: '#20202c', acc: '#3399ff' },
  { id: 'bump', name: 'Bump', bg: '#181c24', bar: '#242834', acc: '#f07167' },
  { id: 'bling', name: 'Bling', bg: '#100c1c', bar: '#191428', acc: '#50c89b' },
  { id: 'moon', name: 'Moon', bg: '#10141a', bar: '#1a202a', acc: '#00bcc2' },
  { id: 'atticus', name: 'Atticus', bg: '#1a1816', bar: '#262421', acc: '#82aa5a' },
  { id: 'tomyris', name: 'Tomyris', bg: '#160c14', bar: '#20121c', acc: '#e84b91' },
  { id: 'dracula', name: 'Dracula', bg: '#1a1b26', bar: '#282a36', acc: '#bd93f9' },
  { id: 'light', name: 'Light', bg: '#eef0f3', bar: '#ffffff', acc: '#7c3aed' }
];
const EDITOR_THEMES = [
  { id: 'one_dark', name: 'One Dark' }, { id: 'tokyo_night', name: 'Tokyo Night' },
  { id: 'monokai', name: 'Monokai' }, { id: 'dracula', name: 'Dracula' },
  { id: 'solarized', name: 'Solarized Dark' }, { id: 'github', name: 'GitHub' }
];
const APP_ICONS = [
  { id: 'default', bg: 'linear-gradient(135deg,#a100ff,#c026d3)', fg: '#fff' },
  { id: 'blue', bg: 'linear-gradient(135deg,#007aff,#00c6ff)', fg: '#fff' },
  { id: 'green', bg: 'linear-gradient(135deg,#11998e,#38ef7d)', fg: '#fff' },
  { id: 'orange', bg: 'linear-gradient(135deg,#f12711,#f5af19)', fg: '#fff' },
  { id: 'pink', bg: 'linear-gradient(135deg,#e84b91,#7c3aed)', fg: '#fff' },
  { id: 'dark', bg: 'linear-gradient(135deg,#23272a,#0b0e13)', fg: '#fff' },
  { id: 'light', bg: 'linear-gradient(135deg,#ffffff,#c9d2e0)', fg: '#333' },
  { id: 'mono', bg: '#101418', fg: '#7ee787' }
];

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

/* ============================== STATE ============================== */
const State = { pro: false, adfree: false, appIcon: 'default', booted: false, exitMode: false };
let T = { open: [], active: null, dirty: {} };
const Recent = { list: [], push(p) { p = normPath(p); this.list = [p, ...this.list.filter(x => x !== p)].slice(0, 15); Store.save(); } };
const Favs = { list: [], has(p) { return this.list.includes(normPath(p)); }, toggle(p) { p = normPath(p); this.list = this.has(p) ? this.list.filter(x => x !== p) : [...this.list, p]; Store.save(); } };

/* ============================== CONSOLE LOG ============================== */
const CLog = {
  list: [],
  add(level, msg) {
    this.list.push({ t: fmtTime(), level, msg: String(msg) });
    if (this.list.length > 300) this.list.shift();
    if (Page.current === 'console') renderConsoleList();
  }
};
const clog = (l, m) => CLog.add(l, m);

/* ============================== NOTIFICATIONS ============================== */
const Notifs = {
  list: [], unread: 0,
  push(title, body, ic = 'bell') {
    this.list.unshift({ id: uid(), title, body, ic, time: 'Agora mesmo', ts: Date.now() });
    this.unread++;
    this.updateBadge();
    Store.save();
  },
  updateBadge() { const b = $('#notifBadge'); b.textContent = this.unread; b.classList.toggle('hidden', this.unread === 0); },
  read() { this.unread = 0; this.updateBadge(); }
};

/* ============================== SETTINGS APPLY ============================== */
function applySettings() {
  const b = document.body;
  b.dataset.theme = S.appTheme || 'neon';
  b.dataset.editor = S.editorTheme || 'one_dark';
  b.classList.toggle('reduce-motion', !!S.reduceMotion || S.animation === 'off');
  const fs = parseFloat(S.fontSize) || 13.5;
  const zoom = (S.editorZoom || 100) / 100;
  b.style.setProperty('--code-size', (fs * zoom) + 'px');
  b.style.setProperty('--code-lh', S.lineHeight || 1.62);
  const fonts = { 'Roboto Mono': '"Roboto Mono",ui-monospace,Menlo,Consolas,monospace', 'Fira Code': '"Fira Code",ui-monospace,Menlo,monospace', 'JetBrains Mono': '"JetBrains Mono",ui-monospace,Menlo,monospace', 'monospace': 'ui-monospace,Menlo,Consolas,monospace', 'system': 'system-ui,sans-serif' };
  b.style.setProperty('--font-code', fonts[S.editorFont] || fonts['Roboto Mono']);
  b.style.setProperty('--gutter-w', S.linenumbers ? '46px' : '0px');
  b.style.setProperty('--code-pad', S.linenumbers ? '60px' : '14px');
  $('#gutter').classList.toggle('hide', !S.linenumbers);
  $('#minimap').classList.toggle('hidden', !S.minimap);
  $('#editorInput').classList.toggle('wrap', !!S.textWrap);
  $('#highlight').classList.toggle('wrap', !!S.textWrap);
  $('#editorInput').style.tabSize = S.tabSize;
  $('#highlight').style.tabSize = S.tabSize;
  updateZoomLabel();
  const qt = $('#quicktools');
  qt.style.display = S.quickTools === 0 ? 'none' : '';
  $('#qtRow2').style.display = S.quickTools === 2 ? '' : 'none';
  $('#rail').style.display = S.showSideButtons === false ? 'none' : '';
  const meta = document.querySelector('meta[name="theme-color"]');
  const th = THEMES.find(t => t.id === b.dataset.theme);
  if (meta && th) meta.content = th.bg;
  document.body.classList.toggle('compact', S.uiDensity === 'compact');
}
function updateZoomLabel() { $('#zoomStatus').textContent = (S.editorZoom || 100) + '%'; }

/* ============================== LANGUAGES ============================== */
const LANGS = {
  html: { name: 'HTML', color: '#ff7a59', cls: 'ft-html', type: 'html', kw: [] },
  xml: { name: 'XML', color: '#61afef', cls: 'ft-html', type: 'html', kw: [] },
  css: { name: 'CSS', color: '#61afef', cls: 'ft-css', type: 'css', kw: ['media', 'import', 'keyframes', 'supports', 'font-face', 'important'] },
  js: { name: 'JavaScript', color: '#e5c07b', cls: 'ft-js', type: 'code', line: '//', block: ['/*', '*/'], kw: 'const let var function return if else for while do switch case break continue new typeof instanceof in of try catch finally throw class extends super import export from default async await yield this null true false undefined NaN Infinity void delete get set static'.split(' ') },
  ts: { name: 'TypeScript', color: '#61afef', cls: 'ft-js', type: 'code', line: '//', block: ['/*', '*/'], kw: 'const let var function return if else for while do switch case break continue new typeof instanceof in of try catch finally throw class extends super import export from default async await yield this null true false undefined interface type enum implements private public protected readonly abstract as satisfies'.split(' ') },
  json: { name: 'JSON', color: '#c678dd', cls: 'ft-json', type: 'code', line: null, block: null, kw: ['true', 'false', 'null'] },
  py: { name: 'Python', color: '#4b8bbe', cls: 'ft-py', type: 'code', line: '#', block: null, kw: 'def class return if elif else for while in not and or is None True False import from as with try except finally raise lambda pass yield global nonlocal assert del async await print self'.split(' ') },
  php: { name: 'PHP', color: '#777bb3', cls: 'ft-php', type: 'code', line: '//', line2: '#', block: ['/*', '*/'], kw: 'echo function return if else elseif endif for foreach endforeach while endwhile do switch case break continue new class extends public private protected static var const global isset empty include require include_once require_once true false null and or xor this self parent use namespace print die exit'.split(' ') },
  java: { name: 'Java', color: '#f89820', cls: 'ft-java', type: 'code', line: '//', block: ['/*', '*/'], kw: 'package import public private protected class interface enum extends implements static final void int long double float boolean char byte short new return if else for while do switch case break continue try catch finally throw throws this super null true false instanceof synchronized abstract'.split(' ') },
  c: { name: 'C', color: '#659ad2', cls: 'ft-c', type: 'code', line: '//', block: ['/*', '*/'], preproc: true, kw: 'include int char float double void long short unsigned signed const static extern struct union enum typedef sizeof return if else for while do switch case break continue goto NULL true false'.split(' ') },
  cpp: { name: 'C++', color: '#f34b7d', cls: 'ft-c', type: 'code', line: '//', block: ['/*', '*/'], preproc: true, kw: 'include int char float double void long short unsigned signed const static extern struct union enum typedef sizeof return if else for while do switch case break continue class namespace template typename using new delete public private protected virtual override friend this nullptr true false bool auto try catch throw'.split(' ') },
  sh: { name: 'Shell', color: '#4ade80', cls: 'ft-sh', type: 'code', line: '#', block: null, kw: 'if then else elif fi for while in do done case esac function return exit echo cd ls export local readonly true false test shift set source alias'.split(' ') },
  lua: { name: 'Lua', color: '#8b8bd0', cls: 'ft-lua', type: 'code', line: '--', block: ['--[[', ']]'], kw: 'local function end if then else elseif for while do return break in and or not nil true false repeat until print require self'.split(' ') },
  md: { name: 'Markdown', color: '#9aa1ad', cls: 'ft-md', type: 'md', kw: [] },
  txt: { name: 'Text', color: '#9aa1ad', cls: 'ft-txt', type: 'plain', kw: [] }
};
const EXT2LANG = { html: 'html', htm: 'html', xhtml: 'html', xml: 'xml', css: 'css', scss: 'css', less: 'css', js: 'js', mjs: 'js', cjs: 'js', jsx: 'js', ts: 'ts', tsx: 'ts', json: 'json', py: 'py', php: 'php', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp', sh: 'sh', bash: 'sh', lua: 'lua', md: 'md', markdown: 'md', txt: 'txt', log: 'txt' };
function detectLang(path) {
  const ext = (baseName(path).split('.').pop() || '').toLowerCase();
  if (baseName(path).toLowerCase() === 'dockerfile') return 'sh';
  return EXT2LANG[ext] || 'txt';
}

/* ============================== HIGHLIGHTER ============================== */
function highlight(code, langId) {
  if (code.length > 120000) return esc(code);
  const L = LANGS[langId] || LANGS.txt;
  if (L.type === 'plain') return esc(code);
  if (L.type === 'html') return highlightHTML(code);
  if (L.type === 'css') return highlightCSS(code);
  if (L.type === 'md') return highlightMD(code);
  return (typeof CAPS !== 'undefined' && CAPS.rainbow) ? rainbowify(highlightCode(code, L)) : highlightCode(code, L);
}
function highlightCode(code, L) {
  const toks = [];
  let i = 0; const n = code.length; let buf = '';
  const flush = () => { if (buf) { toks.push({ t: 0, v: buf }); buf = ''; } };
  const starts = (s, p) => s && code.startsWith(s, p);
  while (i < n) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      flush();
      let j = i + 1;
      if (ch === '`' || code[i - 1] !== '\\') {
        while (j < n && code[j] !== ch) { if (code[j] === '\\') j++; j++; if (ch !== '`' && code[j] === '\n') break; }
        if (j < n && code[j] === ch) j++;
        toks.push({ t: 1, v: code.slice(i, j) }); i = j; continue;
      }
      buf += ch; i++; continue;
    }
    if (L.preproc && (i === 0 || code[i - 1] === '\n') && ch === '#') {
      flush(); let j = code.indexOf('\n', i); if (j < 0) j = n;
      toks.push({ t: 4, v: code.slice(i, j) }); i = j; continue;
    }
    if (L.block && starts(L.block[0], i)) {
      flush(); const end = code.indexOf(L.block[1], i + L.block[0].length);
      const j = end < 0 ? n : end + L.block[1].length;
      toks.push({ t: 2, v: code.slice(i, j) }); i = j; continue;
    }
    if ((L.line && starts(L.line, i)) || (L.line2 && starts(L.line2, i))) {
      flush(); let j = code.indexOf('\n', i); if (j < 0) j = n;
      toks.push({ t: 2, v: code.slice(i, j) }); i = j; continue;
    }
    if ((L === LANGS.php || L === LANGS.sh) && ch === '$' && /[\w{]/.test(code[i + 1] || '')) {
      flush(); let j = i + 1;
      if (code[j] === '{') { j = code.indexOf('}', j); j = j < 0 ? n : j + 1; }
      else while (j < n && /[\w]/.test(code[j])) j++;
      toks.push({ t: 5, v: code.slice(i, j) }); i = j; continue;
    }
    buf += ch; i++;
  }
  flush();
  const kwRe = L.kw && L.kw.length ? new RegExp(`\\b(${L.kw.join('|')})\\b|\\b(\\d[\\w.]*|0x[\\da-fA-F]+)\\b|\\b([A-Za-z_]\\w*)(?=\\s*\\()`, 'g') : null;
  return toks.map(tk => {
    if (tk.t === 1) return `<span class="tok-s">${esc(tk.v)}</span>`;
    if (tk.t === 2) return `<span class="tok-c">${esc(tk.v)}</span>`;
    if (tk.t === 4) return `<span class="tok-o">${esc(tk.v)}</span>`;
    if (tk.t === 5) return `<span class="tok-v">${esc(tk.v)}</span>`;
    let e = esc(tk.v);
    if (kwRe) e = e.replace(kwRe, (m, kw, num, fn) => kw ? `<span class="tok-k">${m}</span>` : num ? `<span class="tok-n">${m}</span>` : `<span class="tok-f">${m}</span>`);
    return e;
  }).join('');
}
function highlightHTML(code) {
  let out = '', i = 0; const n = code.length;
  const escTag = tag => {
    let e = esc(tag);
    e = e.replace(/(&lt;\/?)([\w-]+)/, '$1<span class="tok-v">$2</span>');
    e = e.replace(/([\w-]+)(=)("[^"\n]*"|'[^'\n]*'|&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="tok-a">$1</span>$2<span class="tok-s">$3</span>');
    e = e.replace(/(\/?&gt;)/g, '<span class="tok-p">$1</span>').replace(/(&lt;\/?)/g, '<span class="tok-p">$1</span>');
    return `<span class="tok-o">${e}</span>`;
  };
  while (i < n) {
    if (code.startsWith('<!--', i)) { const j = code.indexOf('-->', i + 4); const k = j < 0 ? n : j + 3; out += `<span class="tok-c">${esc(code.slice(i, k))}</span>`; i = k; continue; }
    if (code[i] === '<' && /[a-zA-Z!/?]/.test(code[i + 1] || '')) {
      let j = i + 1, q = null;
      while (j < n) { const c = code[j]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') { j++; break; } j++; }
      out += escTag(code.slice(i, j)); i = j; continue;
    }
    let j = i;
    while (j < n && !(code[j] === '<' && /[a-zA-Z!/?]/.test(code[j + 1] || '')) && !code.startsWith('<!--', j)) j++;
    out += esc(code.slice(i, j)).replace(/&amp;[\w#]+;/g, '<span class="tok-n">$&</span>');
    i = j;
  }
  return out;
}
function highlightCSS(code) {
  const toks = [];
  let i = 0; const n = code.length; let buf = '';
  const flush = () => { if (buf) { toks.push(buf); buf = ''; } };
  while (i < n) {
    if (code.startsWith('/*', i)) { flush(); const j = code.indexOf('*/', i + 2); const k = j < 0 ? n : j + 2; toks.push(`<span class="tok-c">${esc(code.slice(i, k))}</span>`); i = k; continue; }
    const ch = code[i];
    if (ch === '"' || ch === "'") { flush(); let j = i + 1; while (j < n && code[j] !== ch && code[j] !== '\n') { if (code[j] === '\\') j++; j++; } if (code[j] === ch) j++; toks.push(`<span class="tok-s">${esc(code.slice(i, j))}</span>`); i = j; continue; }
    buf += ch; i++;
  }
  flush();
  return toks.map(t => {
    if (t[0] === '<') return t;
    return esc(t)
      .replace(/(@[\w-]+)/g, '<span class="tok-k">$1</span>')
      .replace(/(#[0-9a-fA-F]{3,8}\b)/g, '<span class="tok-n">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|ms|s|deg)?)\b/g, '<span class="tok-n">$1</span>')
      .replace(/([\w-]+)(\s*:)/g, '<span class="tok-f">$1</span>$2')
      .replace(/([.#]?[\w-]+)(\s*{)/g, '<span class="tok-t">$1</span>$2')
      .replace(/(:{1,2}[\w-]+)/g, '<span class="tok-o">$1</span>');
  }).join('');
}
function highlightMD(code) {
  return esc(code).split('\n').map(line => {
    if (/^#{1,6}\s/.test(line)) return `<span class="tok-t"><b>${line}</b></span>`;
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) return `<span class="tok-o">${line}</span>`;
    if (/^&gt;/.test(line)) return `<span class="tok-c">${line}</span>`;
    if (/^(`{3,}|~{3,})/.test(line)) return `<span class="tok-p">${line}</span>`;
    return line.replace(/(`[^`]+`)/g, '<span class="tok-s">$1</span>').replace(/(\*\*[^*]+\*\*)/g, '<span class="tok-b">$1</span>').replace(/(\[[^\]]*\]\([^)]*\))/g, '<span class="tok-f">$1</span>');
  }).join('\n');
}

/* ============================== EDITOR CORE ============================== */
const Ed = {
  input: null, undo: {}, redo: {},
  init() { this.input = $('#editorInput'); this.bind(); },
  path() { return T.active; },
  value() { return this.input.value; },
  setValue(v) { this.input.value = v; },
  isDirty(p) { p = p || T.active; if (!p) return false; return T.dirty[p] !== undefined; },
  savedContent(p) { const f = fGet(p); return f ? f.c : ''; },
  currentContent(p) { p = p || T.active; if (!p) return ''; return T.dirty[p] !== undefined ? T.dirty[p] : this.savedContent(p); },
  snapshot(p) { p = p || T.active; if (!p) return; const v = p === T.active ? this.value() : this.currentContent(p); if (v !== this.savedContent(p)) T.dirty[p] = v; else delete T.dirty[p]; },
  stacks(p) { p = p || T.active; if (!this.undo[p]) { this.undo[p] = []; this.redo[p] = []; } return p; },
  pushUndo(p, v) {
    p = this.stacks(p); const u = this.undo[p];
    if (u.length && u[u.length - 1].v === v) return;
    u.push({ v, s: p === T.active ? this.input.selectionStart : 0 });
    if (u.length > 80) u.shift();
    this.redo[p] = [];
  },
  doUndo() {
    const p = T.active; if (!p) return; this.stacks(p);
    const u = this.undo[p]; if (!u.length) { toast('Nada para desfazer', 'undo'); return; }
    this.redo[p].push({ v: this.value(), s: this.input.selectionStart });
    const st = u.pop();
    this.setValue(st.v); this.input.selectionStart = this.input.selectionEnd = clamp(st.s, 0, st.v.length);
    this.onEdit(false); vibrate(8);
  },
  doRedo() {
    const p = T.active; if (!p) return; this.stacks(p);
    const r = this.redo[p]; if (!r.length) { toast('Nada para refazer', 'redo'); return; }
    this.undo[p].push({ v: this.value(), s: this.input.selectionStart });
    const st = r.pop();
    this.setValue(st.v); this.input.selectionStart = this.input.selectionEnd = clamp(st.s, 0, st.v.length);
    this.onEdit(false); vibrate(8);
  },
  onEdit(push = true) {
    const p = T.active; if (!p) return;
    if (push) this.trackChange(p);
    this.snapshot(p);
    renderEditor(); Store.save();
  },
  _beforeKey: undefined, _lastPush: 0,
  trackChange(p) {
    const now = Date.now();
    if (!this._lastPush || now - this._lastPush > 900) {
      const base = this._beforeKey !== undefined ? this._beforeKey : this.value();
      this.pushUndo(p, base);
    }
    this._lastPush = now;
  },
  indentUnit() { return S.softTab ? ' '.repeat(S.tabSize || 2) : '\t'; },
  lineHeight() { const lh = parseFloat(getComputedStyle(this.input).lineHeight); return isNaN(lh) ? 22 : lh; },
  charWidth() {
    if (this._cw && this._cwFs === S.fontSize + S.editorZoom) return this._cw.w;
    try {
      const c = this._canvas || (this._canvas = document.createElement('canvas'));
      const ctx = c.getContext('2d');
      ctx.font = `${parseFloat(S.fontSize) * (S.editorZoom / 100)}px ${getComputedStyle(this.input).fontFamily}`;
      const w = ctx.measureText('MMMMMMMMMM').width / 10;
      this._cw = { w, fs: S.fontSize + S.editorZoom }; return w;
    } catch (_) { return 8; }
  },
  cursorPos() {
    const v = this.value(), s = this.input.selectionStart || 0;
    const before = v.slice(0, s).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1, idx: s, sel: (this.input.selectionEnd || 0) - s };
  }
};
Ed._beforeKey = undefined; Ed._lastPush = 0;

/* ---- render ---- */
function gutterWidth() { return S.linenumbers ? 46 : 0; }
function renderEditor() {
  const p = T.active, input = Ed.input;
  const has = !!p;
  input.disabled = !has;
  input.placeholder = has ? '' : 'Nenhum arquivo aberto — toque em + para criar';
  const code = has ? Ed.currentContent(p) : '';
  if (input.value !== code && document.activeElement !== input) input.value = code;
  const lang = has ? detectLang(p) : 'txt';
  let html = has ? highlight(code, lang) : '';
  if (lang === 'json') html = html.replace(/<span class="tok-s">((?:&quot;|&#39;).*?(?:&quot;|&#39;))<\/span>(?=\s*:)/g, '<span class="tok-a">$1</span>');
  html = Find.applyMarks(html);
  $('#highlightCode').innerHTML = html + (code.endsWith('\n') || code === '' ? '\n' : '');
  renderGutter(code);
  sizeTextarea();
  updateCursorUI();
  updateCrumb();
  renderMinimap(code);
  AC.hide();
}
function renderGutter(code) {
  const g = $('#gutter');
  if (!S.linenumbers) { g.innerHTML = ''; return; }
  const n = code === '' ? 1 : code.split('\n').length;
  const cur = T.active ? Ed.cursorPos().line : 1;
  const cap = Math.min(n, 3000);
  let h = '';
  for (let i = 1; i <= cap; i++) h += `<span class="gl${i === cur ? ' cur' : ''}">${S.relativeLineNumbers ? Math.abs(i - cur) || '➤' : i}</span>`;
  if (n > cap) h += `<span class="gl">…</span>`;
  g.innerHTML = h;
}
function sizeTextarea() {
  const pre = $('#highlight'), input = Ed.input, sc = $('#editorScroll');
  const w = Math.max(pre.scrollWidth, sc.clientWidth);
  const h = Math.max(pre.scrollHeight, sc.clientHeight);
  input.style.width = w + 'px'; input.style.height = h + 'px';
  $('#gutter').style.height = h + 'px';
}
function updateCursorUI() {
  const p = T.active;
  const c = Ed.cursorPos();
  $('#cursorStatus').textContent = `Ln ${c.line}, Col ${c.col}`;
  const v = Ed.value();
  const lines = v === '' ? 0 : v.split('\n').length;
  $('#countStatus').textContent = c.sel > 0 ? `${c.sel} sel` : `${lines} ln • ${v.length} ch`;
  $('#langStatus').textContent = p ? LANGS[detectLang(p)].name : '—';
  $('#indentStatus').textContent = `${S.softTab ? 'Spaces' : 'Tab'}: ${S.tabSize}`;
  const cl = $('#currentLine');
  if (p && S.highlightActiveLine && !S.textWrap) {
    const lh = Ed.lineHeight();
    cl.style.display = '';
    cl.style.top = (10 + (c.line - 1) * lh) + 'px';
    cl.style.height = lh + 'px';
  } else cl.style.display = 'none';
  updateBracketMatch(c);
}
function updateBracketMatch(c) {
  const v = Ed.value(), pairs = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
  const ch = v[c.idx - 1] || v[c.idx];
  const el = $('#countStatus');
  if (!S.bracketMatching || !ch || !pairs[ch]) return;
  const open = '([{'.includes(ch) ? ch : pairs[ch];
  const close = pairs[open];
  const dir = '([{'.includes(ch) ? 1 : -1;
  let depth = 0;
  let i = c.idx - 1;
  while (i >= 0 && i < v.length) {
    if (v[i] === open) depth += dir;
    else if (v[i] === close) depth -= dir;
    if (depth === 0) { const ln = v.slice(0, i).split('\n').length; el.textContent += `  ⇄ ${ln}`; return; }
    i += dir;
  }
}
function updateCrumb() {
  const p = T.active;
  const crumb = $('#crumb');
  if (p && typeof CAPS !== 'undefined' && CAPS.crumb) {
    const parts = normPath(p).split('/').filter(Boolean);
    crumb.innerHTML = parts.map((seg, i) => `<span class="cb" data-i="${i}" style="cursor:pointer">${esc(seg)}</span>`).join('<span style="opacity:.5"> / </span>');
    crumb.querySelectorAll('.cb').forEach(sp => sp.onclick = () => {
      const dir = '/' + parts.slice(0, +sp.dataset.i + 1).join('/');
      if (dExists(dir)) { Explorer.root = dir; Panel.open('files'); toast('Pasta: ' + dir, 'files'); }
    });
  } else crumb.textContent = p ? normPath(p) : 'Nenhum arquivo';
  const st = $('#saveState');
  const dirty = Ed.isDirty();
  st.textContent = dirty ? '● editado' : '● salvo';
  st.className = 'save-state ' + (dirty ? 'dirty' : 'clean');
}
function renderMinimap(code) {
  if (!S.minimap) return;
  $('#minimapCode').textContent = code.split('\n').slice(0, 1500).join('\n');
  syncMinimapView();
}
function syncMinimapView() {
  const sc = $('#editorScroll'), v = $('#minimapView');
  const h = sc.clientHeight / Math.max(sc.scrollHeight, 1);
  v.style.height = clamp(h * 100, 4, 100) + '%';
  v.style.top = (sc.scrollTop / Math.max(sc.scrollHeight, 1) * 100) + '%';
}
function syncEditorScroll() {
  const sc = $('#editorScroll');
  $('#gutter').style.transform = `translateX(${sc.scrollLeft}px)`;
  $('#currentLine').style.width = Math.max(sc.scrollWidth, sc.clientWidth) + 'px';
  syncMinimapView();
}

/* ============================== TABS ============================== */
function renderTabs() {
  const wrap = $('#tabs');
  wrap.innerHTML = '';
  if (!T.open.length) { wrap.innerHTML = '<span style="color:var(--muted2);font-size:12px;padding:0 10px">Nenhum arquivo</span>'; return; }
  T.open.forEach(p => {
    const L = LANGS[detectLang(p)];
    const t = document.createElement('div');
    t.className = 'tab' + (p === T.active ? ' active' : '');
    t.setAttribute('role', 'tab');
    t.innerHTML = `<span class="dot" style="background:${L.color}"></span><span class="tname">${esc(baseName(p))}</span>${Ed.isDirty(p) ? '<span class="dirty">●</span>' : ''}<span class="tx" title="Fechar">✕</span>`;
    let lpFired = false, lpT;
    t.onclick = e => { if (lpFired) { lpFired = false; return; } if (e.target.classList.contains('tx')) closeTab(p); else setActiveFile(p); };
    t.addEventListener('touchstart', () => { lpT = setTimeout(() => { lpFired = true; vibrate(20); tabMenu(p); }, 550); }, { passive: true });
    t.addEventListener('touchend', () => clearTimeout(lpT));
    t.oncontextmenu = e => { e.preventDefault(); tabMenu(p); };
    wrap.appendChild(t);
  });
  const act = wrap.querySelector('.tab.active');
  if (act && act.scrollIntoView) try { act.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
}
function openFile(p, line = 0) {
  p = normPath(p);
  if (!fExists(p)) { toast('Arquivo não encontrado', 'info'); return; }
  if (!T.open.includes(p)) T.open.push(p);
  setActiveFile(p);
  Recent.push(p);
  if (Panel.isOpen() && window.innerWidth < 700) Panel.close();
  if (line > 0) setTimeout(() => gotoLine(line), 60);
}
function setActiveFile(p) {
  p = normPath(p);
  if (T.active && T.active !== p) Ed.snapshot(T.active);
  T.active = p;
  if (!T.open.includes(p) && fExists(p)) T.open.push(p);
  Ed.setValue(Ed.currentContent(p));
  Find.reset();
  renderTabs(); renderEditor();
  if (Panel.current === 'files') Panel.render();
  Store.save();
}
async function closeTab(p, force = false) {
  p = normPath(p);
  if (!force && T.active === p) Ed.snapshot(p);
  if (!force && T.dirty[p] !== undefined) {
    const r = await dConfirm('Fechar arquivo', `"${esc(baseName(p))}" tem alterações não salvas.<br>Salvar antes de fechar?`, 'Salvar');
    if (r === null) return;
    if (r) saveFile(p);
    else delete T.dirty[p];
  } else delete T.dirty[p];
  T.open = T.open.filter(x => x !== p);
  if (T.active === p) {
    T.active = T.open.length ? T.open[T.open.length - 1] : null;
    if (T.active) Ed.setValue(Ed.currentContent(T.active)); else Ed.setValue('');
  }
  renderTabs(); renderEditor(); Store.save();
}
async function tabMenu(p) {
  const r = await dList(baseName(p), [
    { label: 'Fechar', icon: 'close', value: 'close' },
    { label: 'Fechar outras', icon: 'close', value: 'others' },
    { label: 'Renomear', icon: 'edit', value: 'rename' },
    { label: 'Duplicar', icon: 'copy', value: 'dup' },
    { label: 'Salvar como...', icon: 'save', value: 'saveas' },
    { label: 'Copiar caminho', icon: 'copy', value: 'path' }
  ]);
  if (r === 'close') closeTab(p);
  else if (r === 'others') { for (const t of [...T.open]) if (t !== p) { if (T.dirty[t] !== undefined) saveFileSilent(t); await closeTab(t, true); } setActiveFile(p); }
  else if (r === 'rename') renameFile(p);
  else if (r === 'dup') duplicateFile(p);
  else if (r === 'saveas') saveAs(p);
  else if (r === 'path') { copyText(p); toast('Caminho copiado', 'copy'); }
}
function copyText(t) {
  try {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove(); return true;
  } catch (_) { return false; }
}

/* ============================== FILE OPS ============================== */
let untitledN = 1;
function newFile(dir = null, silent = false) {
  dir = dir || (T.active ? dirName(T.active) : '/MeuJarvis');
  ensureDir(dir);
  let name, p;
  do { name = `Sem-titulo-${untitledN++}.txt`; p = joinPath(dir, name); } while (fExists(p));
  fSet(p, '');
  if (!silent) { openFile(p); toast('Arquivo criado', 'plus'); }
  clog('INFO', 'File created: ' + p);
  if (Panel.current === 'files') Panel.render();
  return p;
}
function newFolder(dir = null) {
  dPrompt('Nova pasta', '', 'Nome da pasta').then(name => {
    if (!name || !name.trim()) return;
    dir = dir || (T.active ? dirName(T.active) : '/MeuJarvis');
    ensureDir(joinPath(dir, name.trim()));
    Store.save(); Panel.render(); toast('Pasta criada', 'files');
  });
}
function saveFile(p = null) {
  p = normPath(p || T.active);
  if (!p) { toast('Nada para salvar', 'info'); return false; }
  const content = p === T.active ? Ed.value() : Ed.currentContent(p);
  if (S.formatOnSave) { const f = formatCode(content, detectLang(p)); if (f !== content && p === T.active) Ed.setValue(f); }
  fSet(p, p === T.active ? Ed.value() : content);
  delete T.dirty[p];
  if (normPath(p) === '/__settings__.json') applySettingsJson(Ed.value());
  renderTabs(); updateCrumb(); updateCursorUI();
  toast('Arquivo salvo', 'save');
  clog('INFO', 'File saved: ' + p);
  if (typeof Hooks !== 'undefined') Hooks.fire('fs:save', p);
  Recent.push(p);
  if (Panel.current === 'files') Panel.render();
  return true;
}
async function saveAs(p = null) {
  p = normPath(p || T.active);
  if (!p) return;
  const name = await dPrompt('Salvar como', baseName(p), 'Nome do arquivo');
  if (!name || !name.trim()) return;
  const np = joinPath(dirName(p), name.trim());
  fSet(np, p === T.active ? Ed.value() : Ed.currentContent(p));
  openFile(np); toast('Arquivo salvo', 'save');
}
async function renameFile(p) {
  p = normPath(p);
  const name = await dPrompt('Renomear', baseName(p), 'Novo nome');
  if (!name || !name.trim() || name.trim() === baseName(p)) return;
  const np = joinPath(dirName(p), name.trim());
  if (fExists(np)) { toast('Já existe um arquivo com esse nome', 'info'); return; }
  const content = p === T.active ? Ed.value() : Ed.currentContent(p);
  fSet(np, content); fDel(p);
  if (T.dirty[p] !== undefined) { T.dirty[np] = T.dirty[p]; delete T.dirty[p]; }
  T.open = T.open.map(x => x === p ? np : x);
  if (T.active === p) T.active = np;
  if (Favs.has(p)) { Favs.toggle(p); Favs.toggle(np); }
  renderTabs(); renderEditor(); Panel.render(); toast('Renomeado', 'edit'); Store.save();
}
function duplicateFile(p) {
  p = normPath(p);
  const d = dirName(p), b = baseName(p);
  const dot = b.lastIndexOf('.');
  const nb = dot > 0 ? b.slice(0, dot) + ' (cópia)' + b.slice(dot) : b + ' (cópia)';
  const np = joinPath(d, nb);
  fSet(np, p === T.active ? Ed.value() : Ed.currentContent(p));
  openFile(np); toast('Arquivo duplicado', 'copy');
}
async function deleteFile(p) {
  p = normPath(p);
  const ok = await dConfirm('Excluir', `Excluir <b>"${esc(baseName(p))}"</b>?<br>Esta ação não pode ser desfeita.`, 'Excluir');
  if (!ok) return;
  await closeTab(p, true);
  fDel(p);
  toast('Arquivo excluído', 'trash'); clog('WARN', 'File deleted: ' + p);
  Panel.render();
}
function gotoLine(n) {
  const v = Ed.value().split('\n');
  n = clamp(n, 1, v.length);
  let idx = 0;
  for (let i = 0; i < n - 1; i++) idx += v[i].length + 1;
  Ed.input.selectionStart = Ed.input.selectionEnd = idx;
  const lh = Ed.lineHeight();
  $('#editorScroll').scrollTop = Math.max(0, 10 + (n - 1) * lh - $('#editorScroll').clientHeight / 2);
  renderEditor();
}

/* ============================== EDITOR BINDINGS ============================== */
Ed.bind = function () {
  const input = this.input, sc = $('#editorScroll');
  input.addEventListener('beforeinput', () => { Ed._beforeKey = input.value; });
  input.addEventListener('input', () => {
    this.onEdit(true);
    AC.maybeShow(); ColorChip.maybeShow(); Find.onEdit();
  });
  input.addEventListener('keydown', e => this.onKey(e));
  input.addEventListener('keyup', e => { if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; updateCursorUI(); renderGutter(this.value()); AC.hide(); });
  input.addEventListener('click', () => { updateCursorUI(); renderGutter(this.value()); });
  input.addEventListener('select', () => updateCursorUI());
  sc.addEventListener('scroll', () => requestAnimationFrame(syncEditorScroll), { passive: true });
  window.addEventListener('resize', debounce(() => { sizeTextarea(); syncEditorScroll(); }, 150));
  // minimap drag
  const mm = $('#minimap');
  const mmGo = e => {
    const r = mm.getBoundingClientRect();
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    sc.scrollTop = clamp(y / r.height, 0, 1) * sc.scrollHeight;
  };
  mm.addEventListener('touchstart', mmGo, { passive: true });
  mm.addEventListener('touchmove', mmGo, { passive: true });
};
Ed.onKey = function (e) {
  const input = this.input;
  if (AC.visible) {
    if (e.key === 'ArrowDown') { e.preventDefault(); AC.move(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); AC.move(-1); return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); AC.accept(); return; }
    if (e.key === 'Escape') { AC.hide(); return; }
  }
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); saveFile(); return; }
    if (k === 'f') { e.preventDefault(); Find.open(false); return; }
    if (k === 'h') { e.preventDefault(); Find.open(true); return; }
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); this.doUndo(); return; }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); this.doRedo(); return; }
    if (k === 'a') return; // nativo
    return;
  }
  if (e.key === 'Tab') { e.preventDefault(); if (typeof Emmet !== 'undefined' && Emmet.tryExpand()) return; this.insertText(this.indentUnit()); this.onEdit(true); return; }
  if (e.key === 'Enter') { this.smartEnter(e); return; }
  if (e.key === 'Backspace') { this.smartBackspace(e); return; }
  if (S.autoCloseBrackets && '([{'.includes(e.key)) {
    e.preventDefault();
    const pair = { '(': ')', '[': ']', '{': '}' }[e.key];
    const s = input.selectionStart, en = input.selectionEnd, v = input.value;
    this.pushUndo(T.active, v);
    input.value = v.slice(0, s) + e.key + pair + v.slice(en);
    input.selectionStart = input.selectionEnd = s + 1;
    this.onEdit(false); return;
  }
  if (S.autoCloseBrackets && ')]}'.includes(e.key) && input.value[input.selectionStart] === e.key) {
    e.preventDefault();
    input.selectionStart = input.selectionEnd = input.selectionStart + 1;
    updateCursorUI(); return;
  }
  if (S.autoCloseBrackets && (e.key === '"' || e.key === "'" || e.key === '`')) {
    const v = input.value, s = input.selectionStart;
    if (v[s] === e.key) { e.preventDefault(); input.selectionStart = input.selectionEnd = s + 1; updateCursorUI(); return; }
    if (/[\w)]/.test(v[s] || '')) return;
    e.preventDefault(); this.pushUndo(T.active, v);
    input.value = v.slice(0, s) + e.key + e.key + v.slice(input.selectionEnd);
    input.selectionStart = input.selectionEnd = s + 1;
    this.onEdit(false); return;
  }
  if (e.key === '>' && S.autoCloseTags && T.active && detectLang(T.active) === 'html') this.autoCloseTag(e);
};
Ed.insertText = function (text) {
  const input = this.input, v = input.value, s = input.selectionStart, en = input.selectionEnd;
  this.pushUndo(T.active, v);
  input.value = v.slice(0, s) + text + v.slice(en);
  input.selectionStart = input.selectionEnd = s + text.length;
};
Ed.smartEnter = function (e) {
  if (!S.autoIndent) return;
  e.preventDefault();
  const input = this.input, v = input.value, s = input.selectionStart;
  this.pushUndo(T.active, v);
  const lineStart = v.lastIndexOf('\n', s - 1) + 1;
  const curLine = v.slice(lineStart, s);
  const indent = (curLine.match(/^[ \t]*/) || [''])[0];
  const lang = T.active ? detectLang(T.active) : 'txt';
  const trimmed = curLine.trim();
  let extra = '';
  if (/[{(:]\s*$/.test(trimmed)) extra = this.indentUnit();
  else if ((lang === 'py' || lang === 'lua' || lang === 'sh') && /:\s*$/.test(trimmed)) extra = this.indentUnit();
  const next = v[s] || '';
  if (extra && (next === '}' || next === ']' || next === ')')) {
    input.value = v.slice(0, s) + '\n' + indent + extra + '\n' + indent + v.slice(s);
    input.selectionStart = input.selectionEnd = s + 1 + indent.length + extra.length;
  } else {
    input.value = v.slice(0, s) + '\n' + indent + extra + v.slice(input.selectionEnd);
    input.selectionStart = input.selectionEnd = s + 1 + indent.length + extra.length;
  }
  this.onEdit(false);
};
Ed.smartBackspace = function (e) {
  const input = this.input, v = input.value, s = input.selectionStart, en = input.selectionEnd;
  if (s !== en) return;
  const prev = v[s - 1], next = v[s];
  const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
  if (S.autoCloseBrackets && prev && pairs[prev] === next) {
    e.preventDefault(); this.pushUndo(T.active, v);
    input.value = v.slice(0, s - 1) + v.slice(s + 1);
    input.selectionStart = input.selectionEnd = s - 1;
    this.onEdit(false);
  }
};
Ed.autoCloseTag = function (e) {
  const input = this.input, v = input.value, s = input.selectionStart;
  const before = v.slice(0, s);
  const m = before.match(/<([\w-]+)(?:\s[^<>]*)?$/);
  if (!m || v[s] === '<' && v.slice(s, s + 2) === '</') return;
  e.preventDefault(); this.pushUndo(T.active, v);
  const tag = m[1];
  const voids = ['br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'track', 'param'];
  const close = voids.includes(tag.toLowerCase()) ? '' : `</${tag}>`;
  input.value = v.slice(0, s) + '>' + close + v.slice(input.selectionEnd);
  input.selectionStart = input.selectionEnd = s + 1;
  this.onEdit(false);
};

/* ============================== AUTOCOMPLETE ============================== */
const AC = {
  visible: false, items: [], sel: 0, prefix: '', start: 0,
  maybeShow() {
    if (!S.liveAutoCompletion || !T.active) return;
    const input = Ed.input, s = input.selectionStart, v = input.value;
    const m = v.slice(0, s).match(/[\w$]+$/);
    if (!m || m[0].length < 1) { this.hide(); return; }
    const prefix = m[0];
    if (prefix.length > 24) { this.hide(); return; }
    const lang = LANGS[detectLang(T.active)];
    const set = new Set();
    (lang.kw || []).forEach(k => { if (k.startsWith(prefix) && k !== prefix) set.add(k); });
    if (S.localWordCompletion) {
      const words = v.match(/[\w$]{3,32}/g) || [];
      for (const w of words) { if (w.startsWith(prefix) && w !== prefix) { set.add(w); if (set.size > 40) break; } }
    }
    if (typeof Snippets !== 'undefined') Snippets.add(prefix, set);
    if (typeof PathIntel !== 'undefined') PathIntel.add(prefix, set);
    this.items = [...set].slice(0, 8);
    if (!this.items.length) { this.hide(); return; }
    this.prefix = prefix; this.start = s - prefix.length; this.sel = 0;
    this.show();
  },
  show() {
    const box = $('#autocomplete');
    box.innerHTML = this.items.map((w, i) => `<div class="ac-item${i === this.sel ? ' sel' : ''}" data-i="${i}"><span class="k">${esc(w[0].toUpperCase())}</span><span>${esc(w)}</span></div>`).join('');
    $$('#autocomplete .ac-item').forEach(el => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); this.sel = +el.dataset.i; this.accept(); });
    });
    // posição aproximada do cursor
    const c = Ed.cursorPos(), sc = $('#editorScroll');
    const lh = Ed.lineHeight(), cw = Ed.charWidth();
    const x = clamp(gutterWidth() + 14 + (c.col - 1) * cw - sc.scrollLeft, 8, sc.clientWidth - 180);
    const y = clamp(10 + c.line * lh - sc.scrollTop + 4, 8, sc.clientHeight - 160);
    const wrapR = $('#editorWrap').getBoundingClientRect(), scR = sc.getBoundingClientRect();
    box.style.left = (scR.left - wrapR.left + x) + 'px';
    box.style.top = (scR.top - wrapR.top + y) + 'px';
    box.classList.remove('hidden');
    this.visible = true;
  },
  hide() { $('#autocomplete').classList.add('hidden'); this.visible = false; },
  move(d) { this.sel = (this.sel + d + this.items.length) % this.items.length; this.show(); },
  accept() {
    if (!this.visible || !this.items.length) return;
    const w = this.items[this.sel], input = Ed.input, v = input.value;
    Ed.pushUndo(T.active, v);
    const en = input.selectionEnd;
    input.value = v.slice(0, this.start) + w + v.slice(en);
    input.selectionStart = input.selectionEnd = this.start + w.length;
    this.hide(); Ed.onEdit(false); input.focus();
  }
};

/* ============================== COLOR PREVIEW ============================== */
const ColorChip = {
  maybeShow: debounce(() => {
    const el = $('#colorPreview');
    if (!S.colorPreview || !T.active) { el.classList.add('hidden'); return; }
    const c = Ed.cursorPos(), v = Ed.value();
    const line = v.split('\n')[c.line - 1] || '';
    const m = line.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/);
    if (!m) { el.classList.add('hidden'); return; }
    el.innerHTML = `<i style="background:${esc(m[0])}"></i><span>${esc(m[0])}</span>`;
    const sc = $('#editorScroll'), lh = Ed.lineHeight();
    const wrapR = $('#editorWrap').getBoundingClientRect(), scR = sc.getBoundingClientRect();
    el.style.left = clamp(scR.left - wrapR.left + sc.clientWidth - 170, 8, sc.clientWidth - 160) + 'px';
    el.style.top = clamp(scR.top - wrapR.top + 10 + (c.line - 1) * lh - sc.scrollTop, 8, sc.clientHeight - 60) + 'px';
    el.classList.remove('hidden');
  }, 350)
};

/* ============================== FIND / REPLACE ============================== */
const Find = {
  q: '', matches: [], idx: -1, open_: false,
  open(replace = false) {
    if (!T.active) { toast('Abra um arquivo primeiro', 'info'); return; }
    $('#findbar').classList.remove('hidden');
    $('#replaceRow').classList.toggle('hidden', !replace);
    this.open_ = true;
    const sel = Ed.input.value.slice(Ed.input.selectionStart, Ed.input.selectionEnd);
    if (sel && sel.length < 60 && !sel.includes('\n')) $('#findInput').value = sel;
    this.q = $('#findInput').value;
    this.compute();
    setTimeout(() => { $('#findInput').focus(); $('#findInput').select(); }, 60);
  },
  close() { $('#findbar').classList.add('hidden'); this.reset(); },
  reset() { this.q = ''; this.matches = []; this.idx = -1; this.open_ = false; if (T.active) renderEditor(); },
  onEdit() { if (this.open_) { this.q = $('#findInput').value; this.compute(true); } },
  compute(keep = false) {
    const v = Ed.value(), q = this.q;
    this.matches = [];
    if (q) {
      const vl = v.toLowerCase(), ql = q.toLowerCase();
      let i = -1;
      while ((i = vl.indexOf(ql, i + 1)) >= 0) { this.matches.push(i); if (this.matches.length > 2000) break; }
    }
    this.idx = this.matches.length ? (keep ? clamp(this.idx, 0, this.matches.length - 1) : 0) : -1;
    $('#findCount').textContent = this.matches.length ? `${this.idx + 1}/${this.matches.length}` : '0/0';
    renderEditor();
    if (this.idx >= 0 && !keep) this.goto(this.idx);
  },
  applyMarks(html) {
    if (!this.q || !this.matches.length) return html;
    if (/span|class|tok-|<|>/.test(this.q)) return html;
    const eq = esc(this.q);
    const parts = html.split(eq);
    if (parts.length < 2) return html;
    let n = 0;
    return parts.map((pt, i) => {
      if (i === parts.length - 1) return pt;
      const cls = n === this.idx ? 'tok-mark cur' : 'tok-mark';
      n++;
      return pt + `<span class="${cls}">${eq}</span>`;
    }).join('');
  },
  goto(i) {
    if (!this.matches.length) return;
    this.idx = (i + this.matches.length) % this.matches.length;
    const pos = this.matches[this.idx], len = this.q.length;
    Ed.input.selectionStart = pos; Ed.input.selectionEnd = pos + len;
    const line = Ed.value().slice(0, pos).split('\n').length;
    const lh = Ed.lineHeight(), sc = $('#editorScroll');
    sc.scrollTop = Math.max(0, 10 + (line - 1) * lh - sc.clientHeight / 2);
    $('#findCount').textContent = `${this.idx + 1}/${this.matches.length}`;
    renderEditor();
  },
  next(d) { if (!this.matches.length) return; this.goto(this.idx + d); },
  replaceOne() {
    if (this.idx < 0) return;
    const rep = $('#replaceInput').value, v = Ed.value(), pos = this.matches[this.idx];
    Ed.pushUndo(T.active, v);
    Ed.setValue(v.slice(0, pos) + rep + v.slice(pos + this.q.length));
    Ed.onEdit(false); this.compute(true); this.next(1);
    toast('Ocorrência substituída', 'edit');
  },
  replaceAll() {
    if (!this.matches.length) return;
    const rep = $('#replaceInput').value;
    Ed.pushUndo(T.active, Ed.value());
    Ed.setValue(Ed.value().split(this.q).join(rep));
    const n = this.matches.length;
    Ed.onEdit(false); this.compute(true);
    toast(`${n} ocorrência(s) substituída(s)`, 'edit');
  },
  init() {
    $('#findInput').addEventListener('input', () => { this.q = $('#findInput').value; this.compute(); });
    $('#findNext').onclick = () => this.next(1);
    $('#findPrev').onclick = () => this.next(-1);
    $('#findClose').onclick = () => this.close();
    $('#findReplaceToggle').onclick = () => $('#replaceRow').classList.toggle('hidden');
    $('#replaceOne').onclick = () => this.replaceOne();
    $('#replaceAll').onclick = () => this.replaceAll();
    $('#findInput').addEventListener('keydown', e => { if (e.key === 'Enter') this.next(e.shiftKey ? -1 : 1); if (e.key === 'Escape') this.close(); });
  }
};

/* ============================== QUICKTOOLS ============================== */
const QT = {
  shift: false, ctrl: false, alt: false,
  build() {
    const r1 = [
      { id: 'shift', t: 'SHFT', mod: 'shift' }, { k: 'Tab', t: '⇥' }, { act: 'find', ic: 'search' },
      { act: 'undo', ic: 'undo' }, { act: 'redo', ic: 'redo' }, { k: 'ArrowUp', t: '▲' },
      { act: 'save', ic: 'save' }, { act: 'esc', t: 'ESC' }
    ];
    const r2 = [
      { id: 'ctrl', t: 'CTRL', mod: 'ctrl' }, { id: 'alt', t: 'ALT', mod: 'alt' },
      { k: 'ArrowLeft', t: '◀' }, { k: 'ArrowDown', t: '▼' }, { k: 'ArrowRight', t: '▶' },
      { act: 'cut', ic: 'cut' }, { act: 'copy', ic: 'copy' }, { act: 'paste', ic: 'paste' }
    ];
    const mk = (defs, row) => {
      row.innerHTML = '';
      defs.forEach(d => {
        const b = document.createElement('button');
        b.className = 'qt-key' + (d.mod ? ' mod' : '');
        b.innerHTML = d.ic ? icon(d.ic) : esc(d.t);
        if (d.mod) b.dataset.mod = d.mod;
        b.onclick = () => this.press(d, b);
        row.appendChild(b);
      });
    };
    mk(r1, $('#qtRow1')); mk(r2, $('#qtRow2'));
  },
  press(d, btn) {
    vibrate(8);
    if (d.mod) {
      this[d.mod] = !this[d.mod];
      btn.classList.toggle('on', this[d.mod]);
      return;
    }
    const input = Ed.input;
    if (d.k) {
      if (!T.active) return;
      input.focus({ preventScroll: true });
      const v = input.value;
      let s = input.selectionStart, e = input.selectionEnd;
      const anchor = this.shift ? (this._anchor ?? s) : null;
      if (this.shift && this._anchor === undefined) this._anchor = s;
      const lines = v.split('\n');
      const lineOf = idx => v.slice(0, idx).split('\n').length - 1;
      const move = (pos, dir) => {
        if (d.k === 'ArrowLeft') return Math.max(0, pos - 1);
        if (d.k === 'ArrowRight') return Math.min(v.length, pos + 1);
        const li = lineOf(pos);
        const col = pos - (v.lastIndexOf('\n', pos - 1) + 1);
        if (d.k === 'ArrowUp' && li > 0) { const ps = v.lastIndexOf('\n', v.lastIndexOf('\n', pos - 1) - 1) + 1; return ps + Math.min(col, lines[li - 1].length); }
        if (d.k === 'ArrowDown' && li < lines.length - 1) { const ns = pos + (lines[li].length - col) + 1; return Math.min(ns + col, ns + lines[li + 1].length); }
        return pos;
      };
      if (d.k === 'Tab') { Ed.insertText(Ed.indentUnit()); Ed.onEdit(true); this.clearMods(); return; }
      if (this.ctrl && (d.k === 'ArrowLeft' || d.k === 'ArrowRight')) {
        const re = d.k === 'ArrowRight' ? /[\w$]+|\W/g : null;
        let pos = e;
        if (d.k === 'ArrowRight') { re.lastIndex = pos; const m = re.exec(v); pos = m ? re.lastIndex : v.length; }
        else { const left = v.slice(0, pos).match(/[\w$]+|[^\w$\s]+|\s+$/); pos = left ? pos - left[0].length : 0; }
        if (this.shift) { input.selectionStart = Math.min(this._anchor, pos); input.selectionEnd = Math.max(this._anchor, pos); }
        else input.selectionStart = input.selectionEnd = pos;
      } else if (d.k === 'ArrowLeft' || d.k === 'ArrowRight') {
        const pos = move(this.shift ? e : (s !== e && !this.shift ? (d.k === 'ArrowLeft' ? s : e) : s), d.k);
        if (this.shift) { input.selectionStart = Math.min(this._anchor, pos); input.selectionEnd = Math.max(this._anchor, pos); }
        else input.selectionStart = input.selectionEnd = pos;
      } else {
        const pos = move(e, d.k);
        if (this.shift) { input.selectionStart = Math.min(this._anchor, pos); input.selectionEnd = Math.max(this._anchor, pos); }
        else input.selectionStart = input.selectionEnd = pos;
        const ln = v.slice(0, pos).split('\n').length, lh = Ed.lineHeight(), sc = $('#editorScroll');
        const top = 10 + (ln - 1) * lh;
        if (top < sc.scrollTop + 40) sc.scrollTop = top - 60;
        else if (top > sc.scrollTop + sc.clientHeight - 60) sc.scrollTop = top - sc.clientHeight + 80;
      }
      updateCursorUI(); renderGutter(Ed.value());
      if (!this.shift) this._anchor = undefined;
      return;
    }
    if (d.act === 'find') Find.open(false);
    else if (d.act === 'undo') Ed.doUndo();
    else if (d.act === 'redo') Ed.doRedo();
    else if (d.act === 'save') saveFile();
    else if (d.act === 'esc') escCascade();
    else if (d.act === 'cut' || d.act === 'copy') {
      if (!T.active) return;
      input.focus({ preventScroll: true });
      try {
        if (input.selectionStart === input.selectionEnd) {
          const ln = Ed.value().slice(0, input.selectionStart).split('\n').length - 1;
          const lines = Ed.value().split('\n');
          let st = 0; for (let i = 0; i < ln; i++) st += lines[i].length + 1;
          input.selectionStart = st; input.selectionEnd = st + lines[ln].length;
        }
        document.execCommand(d.act);
        if (d.act === 'cut') Ed.onEdit(true);
        toast(d.act === 'cut' ? 'Recortado' : 'Copiado', d.act);
      } catch (_) { toast('Não suportado neste navegador', 'info'); }
    }
    else if (d.act === 'paste') {
      if (!T.active) return;
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(t => { Ed.insertText(t); Ed.onEdit(true); input.focus({ preventScroll: true }); }).catch(() => toast('Use colar do teclado do sistema', 'info'));
      } else toast('Use colar do teclado do sistema', 'info');
    }
    this.clearMods();
  },
  clearMods() {
    this.shift = this.ctrl = this.alt = false; this._anchor = undefined;
    $$('#quicktools .qt-key.mod').forEach(b => b.classList.remove('on'));
  }
};
function escCascade() {
  if (!$('#dialogRoot').classList.contains('hidden')) { $('#dialogRoot').click(); return; }
  if (!$('#paletteWrap').classList.contains('hidden')) { Palette.close(); return; }
  if (!$('#findbar').classList.contains('hidden')) { Find.close(); return; }
  if (AC.visible) { AC.hide(); return; }
  if (!$('#fileMenu').classList.contains('hidden')) { $('#fileMenu').classList.add('hidden'); return; }
  if (!$('#pageRoot').classList.contains('hidden')) { Page.back(); return; }
  if (Drawer.isOpen()) { Drawer.close(); return; }
  if (Panel.isOpen()) { Panel.close(); return; }
  QT.clearMods();
}

/* ============================== PANEL ROUTER ============================== */
const Panel = {
  current: 'files',
  isOpen() { return $('#panel').classList.contains('open'); },
  open(id) {
    if (id) this.current = id;
    $('#panel').classList.add('open');
    $$('#rail .rail-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === this.current));
    this.render(); Store.save();
  },
  close() { $('#panel').classList.remove('open'); $$('#rail .rail-btn').forEach(b => b.classList.remove('active')); Store.save(); },
  toggle(id) { if (this.isOpen() && this.current === id) this.close(); else this.open(id); },
  setHead(title, sub, actions = []) {
    $('#panelTitle').textContent = title;
    $('#panelSubtitle').textContent = sub || '';
    const box = $('#panelActions');
    box.innerHTML = '';
    actions.forEach(a => {
      const b = document.createElement('button');
      b.className = 'icon-mini'; b.title = a.t || ''; b.innerHTML = icon(a.ic);
      b.onclick = e => { e.stopPropagation(); a.fn(); };
      box.appendChild(b);
    });
  },
  render() {
    const id = this.current;
    if (id === 'files') renderFiles();
    else if (id === 'search') renderSearch();
    else if (id === 'plugins') renderPlugins($('#panelBody'), false);
    else if (id === 'notifications') renderNotifs();
    else if (id === 'favorites') renderFavs();
    else if (id === 'github') GH.render();
    else if (id === 'agent') AI.renderAgent($('#panelBody'));
    else if (id === 'ai') AI.renderAssistant($('#panelBody'));
    else if (id === 'terminal') Term.render($('#panelBody'), false);
  },
  init() {
    $$('#rail .rail-btn').forEach(b => b.onclick = () => { vibrate(6); this.toggle(b.dataset.panel); });
    // fecha painel ao tocar no editor (mobile)
    $('#editorArea').addEventListener('pointerdown', () => { if (this.isOpen() && window.innerWidth < 700) this.close(); });
  }
};

/* ============================== FILES EXPLORER ============================== */
const Explorer = { expanded: new Set(['/MeuJarvis']), root: '/MeuJarvis' };
function renderFiles() {
  Panel.setHead('Arquivos', Explorer.root, [
    { ic: 'file', t: 'Novo arquivo', fn: () => fileNewIn(Explorer.root) },
    { ic: 'files', t: 'Nova pasta', fn: () => newFolder(Explorer.root) },
    { ic: 'refresh', t: 'Atualizar', fn: () => { Panel.render(); toast('Arquivos atualizados', 'refresh'); } }
  ]);
  const body = $('#panelBody');
  body.innerHTML = `<div class="search-box">${icon('search')}<input id="fileFilter" placeholder="Filtrar arquivos..." autocomplete="off"></div><div id="tree"></div>
    <div class="sect">Abertos recentemente</div><div id="recentList"></div>`;
  const renderTree = filter => {
    const tree = $('#tree');
    tree.innerHTML = '';
    tree.appendChild(dirNode(Explorer.root, 0, filter));
    if (filter && !tree.textContent.trim()) tree.innerHTML = '<div class="empty">Nenhum arquivo encontrado</div>';
  };
  renderTree('');
  $('#fileFilter').addEventListener('input', e => renderTree(e.target.value.trim().toLowerCase()));
  const rl = $('#recentList');
  rl.innerHTML = Recent.list.length ? '' : '<div class="empty">Nenhum arquivo recente</div>';
  Recent.list.slice(0, 6).forEach(p => {
    if (!fExists(p)) return;
    const L = LANGS[detectLang(p)];
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = `${ficon(L)}<div class="grow"><div class="t" style="font-family:var(--font-code);font-size:12px">${esc(baseName(p))}</div><div class="s">${esc(dirName(p))}</div></div>`;
    r.onclick = () => openFile(p);
    rl.appendChild(r);
  });
}
function dirNode(dirPath, depth, filter) {
  const wrap = document.createElement('div');
  wrap.className = 'tree-item';
  const { dirs, files } = listDir(dirPath);
  if (depth > 0 || dirPath !== Explorer.root) {
    const row = document.createElement('div');
    const open = Explorer.expanded.has(dirPath);
    row.className = 'tree-row' + (open ? ' open' : '');
    row.innerHTML = `<svg class="caret" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5l7 7-7 7"/></svg>${icon('folder', 'color:#e5c07b')}<span class="nm">${esc(baseName(dirPath))}</span>`;
    row.onclick = () => { open ? Explorer.expanded.delete(dirPath) : Explorer.expanded.add(dirPath); Panel.render(); };
    row.oncontextmenu = e => { e.preventDefault(); dirMenu(dirPath); };
    wrap.appendChild(row);
    if (!open) return wrap;
  }
  const kids = document.createElement('div');
  kids.className = 'tree-children';
  dirs.forEach(d => {
    const full = joinPath(dirPath, d);
    if (filter && !d.toLowerCase().includes(filter) && !subtreeHas(full, filter)) return;
    kids.appendChild(dirNode(full, depth + 1, filter));
  });
  files.forEach(f => {
    if (f === '.keep') return;
    if (filter && !f.toLowerCase().includes(filter)) return;
    const full = joinPath(dirPath, f);
    const L = LANGS[detectLang(full)];
    const row = document.createElement('div');
    row.className = 'tree-row' + (full === T.active ? ' active' : '');
    row.innerHTML = `${ficon(L)}<span class="nm">${esc(f)}</span>${Favs.has(full) ? '<span class="fv">★</span>' : ''}${Ed.isDirty(full) ? '<span class="dirty" style="color:var(--yellow)">●</span>' : ''}`;
    let lpFired = false, lp;
    row.onclick = () => { if (lpFired) { lpFired = false; return; } openFile(full); };
    row.addEventListener('touchstart', () => { lp = setTimeout(() => { lpFired = true; vibrate(20); fileMenu(full); }, 550); }, { passive: true });
    row.addEventListener('touchend', () => clearTimeout(lp));
    row.oncontextmenu = e => { e.preventDefault(); fileMenu(full); };
    kids.appendChild(row);
  });
  if (!dirs.length && !files.filter(f => f !== '.keep').length && !filter) {
    const em = document.createElement('div');
    em.className = 'empty'; em.style.padding = '8px'; em.textContent = 'Pasta vazia';
    kids.appendChild(em);
  }
  wrap.appendChild(kids);
  return wrap;
}
function subtreeHas(dir, q) {
  const { dirs, files } = listDir(dir);
  if (files.some(f => f.toLowerCase().includes(q))) return true;
  return dirs.some(d => d.toLowerCase().includes(q) || subtreeHas(joinPath(dir, d), q));
}
async function fileMenu(p) {
  const r = await dList(baseName(p), [
    { label: 'Abrir', icon: 'file', value: 'open' },
    { label: Favs.has(p) ? 'Remover dos favoritos' : 'Adicionar aos favoritos', icon: 'star', value: 'fav' },
    { label: 'Renomear', icon: 'edit', value: 'rename' },
    { label: 'Duplicar', icon: 'copy', value: 'dup' },
    { label: 'Copiar caminho', icon: 'copy', value: 'path' },
    { label: 'Excluir', icon: 'trash', value: 'del' }
  ]);
  if (r === 'open') openFile(p);
  else if (r === 'fav') { Favs.toggle(p); Panel.render(); toast(Favs.has(p) ? 'Adicionado aos favoritos' : 'Removido dos favoritos', 'star'); }
  else if (r === 'rename') renameFile(p);
  else if (r === 'dup') duplicateFile(p);
  else if (r === 'path') { copyText(p); toast('Caminho copiado', 'copy'); }
  else if (r === 'del') deleteFile(p);
}
async function dirMenu(dir) {
  const r = await dList(baseName(dir) + '/', [
    { label: 'Novo arquivo aqui', icon: 'plus', value: 'nf' },
    { label: 'Nova pasta aqui', icon: 'files', value: 'nd' },
    { label: 'Renomear pasta', icon: 'edit', value: 'rn' },
    { label: 'Excluir pasta', icon: 'trash', value: 'del' }
  ]);
  if (r === 'nf') fileNewIn(dir);
  else if (r === 'nd') newFolder(dir);
  else if (r === 'rn') {
    const name = await dPrompt('Renomear pasta', baseName(dir));
    if (!name || !name.trim()) return;
    const np = joinPath(dirName(dir), name.trim());
    if (dExists(np)) { toast('Já existe', 'info'); return; }
    const old = normPath(dir) + '/', nw = normPath(np) + '/';
    for (const k of Object.keys(FS.files)) if (k.startsWith(old)) { FS.files[nw + k.slice(old.length)] = FS.files[k]; delete FS.files[k]; }
    FS.dirs = FS.dirs.map(d => d === normPath(dir) ? normPath(np) : d.startsWith(old) ? nw + d.slice(old.length) : d);
    T.open = T.open.map(t => t.startsWith(old) ? nw + t.slice(old.length) : t);
    if (T.active && T.active.startsWith(old)) T.active = nw + T.active.slice(old.length);
    renderTabs(); renderEditor(); Panel.render(); Store.save(); toast('Pasta renomeada', 'edit');
  }
  else if (r === 'del') {
    const ok = await dConfirm('Excluir pasta', `Excluir <b>"${esc(dir)}"</b> e todo o conteúdo?`, 'Excluir');
    if (!ok) return;
    [...T.open].forEach(t => { if (t.startsWith(normPath(dir) + '/')) closeTab(t, true); });
    fDel(dir); Panel.render(); toast('Pasta excluída', 'trash');
  }
}
function fileNewIn(dir) {
  dPrompt('Novo arquivo', '', 'ex: pagina.html').then(name => {
    if (!name || !name.trim()) return;
    const p = joinPath(dir, name.trim());
    if (fExists(p)) { openFile(p); return; }
    fSet(p, '');
    openFile(p); Panel.render(); toast('Arquivo criado', 'plus');
  });
}
/* importar arquivo/pasta reais */
function importReal(files, targetDir) {
  targetDir = targetDir || Explorer.root;
  ensureDir(targetDir);
  [...files].forEach(f => {
    const rd = new FileReader();
    rd.onload = () => {
      const rel = (f.webkitRelativePath || f.name).replace(/^[^/]*\//, '');
      const p = joinPath(targetDir, rel || f.name);
      fSet(p, String(rd.result || ''));
      Panel.render();
    };
    rd.readAsText(f);
  });
  toast('Importando arquivos...', 'upload');
  clog('INFO', `Import: ${files.length} file(s)`);
}

/* ============================== SEARCH PANEL ============================== */
function renderSearch() {
  Panel.setHead('Pesquisar', 'Em todos os arquivos', []);
  const body = $('#panelBody');
  body.innerHTML = `<div class="search-box">${icon('search')}<input id="gSearch" placeholder="Buscar nos arquivos..." autocomplete="off"></div><div id="gResults"><div class="empty">${icon('search')}<br>Digite para buscar em todos os arquivos do projeto.</div></div>`;
  $('#gSearch').addEventListener('input', debounce(e => {
    const q = e.target.value.trim().toLowerCase();
    const box = $('#gResults');
    if (q.length < 2) { box.innerHTML = '<div class="empty">Digite ao menos 2 caracteres</div>'; return; }
    let total = 0; box.innerHTML = '';
    for (const [p, f] of Object.entries(FS.files)) {
      if (baseName(p) === '.keep') continue;
      const lines = f.c.split('\n');
      const hits = [];
      lines.forEach((ln, i) => { if (ln.toLowerCase().includes(q) && hits.length < 5) hits.push({ i: i + 1, t: ln.trim().slice(0, 90) }); });
      if (!hits.length) continue;
      total += hits.length;
      const sec = document.createElement('div');
      sec.innerHTML = `<div class="sect" style="padding-top:8px">${esc(baseName(p))}</div>`;
      hits.forEach(h => {
        const r = document.createElement('div');
        r.className = 'row';
        r.innerHTML = `<div class="grow"><div class="s">${h.i}: ${esc(h.t)}</div></div>`;
        r.onclick = () => openFile(p, h.i);
        sec.appendChild(r);
      });
      box.appendChild(sec);
      if (total > 60) break;
    }
    if (!total) box.innerHTML = '<div class="empty">Nenhum resultado</div>';
  }, 250));
}

/* ============================== PLUGINS ============================== */
const PLUGIN_DEFS = [
  { id: 'acodex-term', name: 'AcodeX - Terminal', ver: '3.4.0', dl: '', desc: 'Terminal Alpine completo dentro do Acode', bg: 'linear-gradient(135deg,#22c55e,#15803d)', ic: 'terminal' },
  { id: 'github', name: 'Github', ver: '2.0.1', dl: '', desc: 'Clone, pull, push e gerencie repositórios', bg: 'linear-gradient(135deg,#333,#000)', ic: 'github' },
  { id: 'ai-assistant', name: 'AI Assistant Beta', ver: '2.0.0', dl: '', desc: 'Assistente de IA para código', bg: 'linear-gradient(135deg,#a855f7,#6366f1)', ic: 'ai' },
  { id: 'term-pro', name: 'Terminal Pro', ver: '1.1.3', dl: '2.15K', desc: 'Terminal avançado com abas e temas', bg: 'linear-gradient(135deg,#f59e0b,#b45309)', ic: 'terminal' },
  { id: 'resp-tester', name: 'Responsive Tester & Fast previewer', ver: '1.0.5', dl: '1.04K', desc: 'Teste responsivo em vários tamanhos', bg: 'linear-gradient(135deg,#0ea5e9,#1e40af)', ic: 'eye' },
  { id: 'python', name: 'Python', ver: '1.1.4', dl: '393.7K', desc: 'Suporte e realce para Python', bg: 'linear-gradient(135deg,#3776ab,#ffd43b)', ic: 'zap' },
  { id: 'vscode-icons', name: 'Vscode Icon (All in one)', ver: '2.0.3', dl: '1.61K', desc: 'Ícones de arquivo estilo VS Code', bg: 'linear-gradient(135deg,#007acc,#00c6ff)', ic: 'grid' },
  { id: 'aicodex', name: 'AicodeX GPT', ver: '6.0.0', dl: '973', desc: 'GPT integrado ao editor', bg: 'linear-gradient(135deg,#10b8d8,#0e7490)', ic: 'ai' },
  { id: 'abread', name: 'ABRead Crumb', ver: '2.6.3', dl: '274', desc: 'Breadcrumbs de navegação', bg: 'linear-gradient(135deg,#f472b6,#fb923c)', ic: 'files' },
  { id: 'prettier', name: 'Prettier', ver: '2.0.2', dl: '192.7K', desc: 'Formatador de código opinativo', bg: 'linear-gradient(135deg,#56b3b4,#c596c7)', ic: 'wand' },
  { id: 'path-intel', name: 'PathIntellisense', ver: '1.2.0', dl: '50.6K', desc: 'Autocompletar caminhos de arquivo', bg: 'linear-gradient(135deg,#3b82f6,#1e3a8a)', ic: 'files' },
  { id: 'sweet-plasma', name: 'SweetPlasma', ver: '1.1.2', dl: '35.4K', desc: 'Tema plasma com brilho neon', bg: 'linear-gradient(135deg,#a855f7,#ec4899)', ic: 'palette' },
  { id: 'suger', name: 'Suger DevTool', ver: '1.1.0', dl: '119', desc: 'Ferramentas extras de debug', bg: 'linear-gradient(135deg,#84cc16,#365314)', ic: 'zap' },
  { id: 'snippets', name: 'Snippets', ver: '2.0.0', dl: '84.6K', desc: 'Trechos de código reutilizáveis', bg: 'linear-gradient(135deg,#14b8a6,#0f766e)', ic: 'copy' },
  { id: 'git-scm', name: 'Git SCM', ver: '2.9.2', dl: '13.3K', desc: 'Controle de versão Git visual', bg: 'linear-gradient(135deg,#f05032,#7a1f0e)', ic: 'github' },
  { id: 'pinch-zoom', name: 'Pinch 2 Zoom', ver: '2.2.2', dl: '20.4K', desc: 'Zoom por pinça no editor', bg: 'linear-gradient(135deg,#38bdf8,#0369a1)', ic: 'eye' },
  { id: 'color-palette', name: 'Color Palette Generator', ver: '1.0.7', dl: '49.3K', desc: 'Gere paletas a partir do código', bg: 'linear-gradient(135deg,#f43f5e,#facc15,#22c55e)', ic: 'palette' },
  { id: 'path-linker', name: 'Path Linker', ver: '1.0.2', dl: '30.2K', desc: 'Transforma caminhos em links', bg: 'linear-gradient(135deg,#a855f7,#581c87)', ic: 'external' },
  { id: 'git-dust', name: 'Git Dust', ver: '1.0.0', dl: '24.1K', desc: 'Estatísticas do repositório', bg: 'linear-gradient(135deg,#64748b,#1e293b)', ic: 'gauge' },
  { id: 'ayu', name: 'Acode Ayu', ver: '1.1.2', dl: '22.9K', desc: 'Tema Ayu claro/escuro', bg: 'linear-gradient(135deg,#e6b450,#0d0f11)', ic: 'palette' },
  { id: 'android-builder', name: 'Android Builder Pro', ver: '1.1.3', dl: '18.3K', desc: 'Compile APKs direto do app', bg: 'linear-gradient(135deg,#3ddc84,#0a7c42)', ic: 'play' },
  { id: 'gh-manager', name: 'Github Manager', ver: '1.2.4', dl: '7.39K', desc: 'Gerencie issues e PRs', bg: 'linear-gradient(135deg,#1f2937,#6e40c9)', ic: 'github' },
  { id: 'academy', name: 'Acode Academy', ver: '1.2.1', dl: '5.08K', desc: 'Tutoriais interativos de código', bg: 'linear-gradient(135deg,#8b5cf6,#f59e0b)', ic: 'book' },
  { id: 'cpp', name: 'C/C++', ver: '2.0.1', dl: '929', desc: 'Suporte a C e C++', bg: 'linear-gradient(135deg,#659ad2,#004482)', ic: 'zap' },
  { id: 'py-runner', name: 'Python Runner', ver: '1.0.0', dl: '56.2K', desc: 'Execute Python no terminal', bg: 'linear-gradient(135deg,#ffd43b,#3776ab)', ic: 'play' },
  { id: 'material-icons', name: 'Material Icons', ver: '1.2.4', dl: '50.3K', desc: 'Ícones Material para arquivos', bg: 'linear-gradient(135deg,#c026d3,#701a75)', ic: 'grid' },
  { id: 'add-package', name: 'Add Package', ver: '1.0.0', dl: '12.1K', desc: 'Instale pacotes npm/cdn', bg: 'linear-gradient(135deg,#22d3ee,#15803d)', ic: 'plus' }
];
const Plugins = {
  installed: { 'acodex-term': '3.4.0', 'github': '2.0.1', 'ai-assistant': '2.0.0', 'prettier': '2.0.2', 'pinch-zoom': '2.2.2' },
  updates: { 'github': '2.0.2', 'ai-assistant': '2.1.0' },
  filter: '',
  isInstalled(id) { return !!this.installed[id]; },
  install(id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    this.installed[id] = def.ver;
    delete this.updates[id];
    Store.save(); this.refreshUI();
    toast(`"${def.name}" instalado`, 'puzzle');
    clog('INFO', `Plugin installed: ${def.name} v${def.ver}`);
    Notifs.push('Plugin instalado', `${def.name} v${def.ver} foi instalado com sucesso.`, 'puzzle');
  },
  uninstall(id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    delete this.installed[id];
    Store.save(); this.refreshUI();
    toast(`"${def.name}" desinstalado`, 'trash');
    clog('WARN', `Plugin uninstalled: ${def.name}`);
  },
  update(id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    this.installed[id] = this.updates[id];
    delete this.updates[id];
    Store.save(); this.refreshUI();
    toast(`"${def.name}" atualizado`, 'refresh');
    clog('INFO', `Plugin updated: ${def.name}`);
  },
  refreshUI() {
    const n = Object.keys(this.updates).length;
    const b = $('#pluginBadge');
    b.textContent = n; b.classList.toggle('hidden', n === 0);
    if (Panel.current === 'plugins') Panel.render();
    if (Page.current === 'plugins') Page.rerender();
  },
  async menu(id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    const items = [{ label: 'Detalhes', icon: 'info', value: 'info' }];
    if (this.isInstalled(id)) {
      if (this.updates[id]) items.push({ label: `Atualizar para v${this.updates[id]}`, icon: 'refresh', value: 'upd' });
      items.push({ label: 'Desinstalar', icon: 'trash', value: 'del' });
    } else items.push({ label: 'Instalar', icon: 'download', value: 'add' });
    const r = await dList(def.name, items);
    if (r === 'add') this.install(id);
    else if (r === 'del') this.uninstall(id);
    else if (r === 'upd') this.update(id);
    else if (r === 'info') PluginDetail.open(id);
  }
};
function renderPlugins(container, inPage) {
  const mk = () => {
    if (!inPage) Panel.setHead('Plugins', Object.keys(Plugins.installed).length + ' instalados', [
      { ic: 'filter', t: 'Filtrar', fn: () => toast('Filtro: todos os plugins', 'filter') },
      { ic: 'plus', t: 'Instalar de arquivo', fn: () => CustomPlugins.fromFile() }
    ]);
    container.innerHTML = `<div class="search-box">${icon('search')}<input id="plugSearch" placeholder="Search" autocomplete="off" value="${esc(Plugins.filter)}"></div>
      <div class="sect">▸ Explorar</div><div id="plugExplore"></div>
      <div class="sect">▸ Instalado</div><div id="plugInstalled"></div>`;
    const paint = () => {
      const q = Plugins.filter.toLowerCase();
      const ex = container.querySelector('#plugExplore'), ins = container.querySelector('#plugInstalled');
      ex.innerHTML = ''; ins.innerHTML = '';
      PLUGIN_DEFS.filter(d => d.name.toLowerCase().includes(q)).forEach(d => {
        const inst = Plugins.isInstalled(d.id);
        const row = document.createElement('div');
        row.className = 'plugin-row';
        const sub = inst
          ? `v${Plugins.installed[d.id]} • <span class="ok">Instalado</span>${Plugins.updates[d.id] ? ` • <span class="upd">v${Plugins.updates[d.id]} disponível</span>` : ''}`
          : `v${d.ver}${d.dl ? ' • ' + d.dl : ''}`;
        row.innerHTML = `<div class="plugin-ico" style="background:${d.bg}">${icon(d.ic)}</div>
          <div class="plugin-meta"><div class="plugin-name">${esc(d.name)}</div><div class="plugin-sub">${sub}</div></div>
          <div class="plugin-act">${inst
            ? `<button class="icon-mini plug-menu">${icon('more')}</button>`
            : `<button class="icon-mini plug-add" title="Instalar">${icon('download')}</button>`}</div>`;
        row.querySelector('.plug-menu, .plug-add')?.addEventListener('click', e => { e.stopPropagation(); inst ? Plugins.menu(d.id) : Plugins.install(d.id); });
        row.onclick = () => PluginDetail.open(d.id);
        (inst ? ins : ex).appendChild(row);
      });
      if (!ex.children.length) ex.innerHTML = '<div class="empty">Nada para explorar</div>';
      if (!ins.children.length) ins.innerHTML = '<div class="empty">Nenhum plugin instalado</div>';
    };
    container.querySelector('#plugSearch').addEventListener('input', e => { Plugins.filter = e.target.value; paint(); });
    paint();
    if (inPage) {
      const cr = document.createElement('div');
      cr.className = 'btn-row';
      cr.innerHTML = `<button class="big-btn" id="cpFile">\u{1F4C4} Arquivo</button><button class="big-btn" id="cpUrl">\u{1F516} URL</button><button class="big-btn primary" id="cpNew">\uFF0B Novo</button>`;
      container.appendChild(cr);
      cr.querySelector('#cpFile').onclick = () => CustomPlugins.fromFile();
      cr.querySelector('#cpUrl').onclick = () => CustomPlugins.fromURL();
      cr.querySelector('#cpNew').onclick = () => CustomPlugins.newPlugin();
    }
  };
  mk();
}

/* ============================== NOTIFICATIONS ============================== */
function renderNotifs() {
  Panel.setHead('Notificações', Notifs.list.length + ' itens', [
    { ic: 'trash', t: 'Limpar', fn: () => { Notifs.list = []; Notifs.read(); Panel.render(); Store.save(); } }
  ]);
  Notifs.read();
  const body = $('#panelBody');
  body.innerHTML = Notifs.list.length ? '' : `<div class="empty">${icon('bell')}<br>Nenhuma notificação.<br>Atualizações de plugins aparecem aqui.</div>`;
  Notifs.list.forEach(n => {
    const c = document.createElement('div');
    c.className = 'notif-card';
    c.innerHTML = `<div class="notif-head">${icon(n.ic)}<span>${esc(n.title)}</span><span class="notif-time">${esc(n.time)}</span></div><div class="notif-body">${esc(n.body)}</div>`;
    body.appendChild(c);
  });
}

/* ============================== FAVORITES ============================== */
function renderFavs() {
  Panel.setHead('Favoritos', Favs.list.length + ' arquivos', []);
  const body = $('#panelBody');
  body.innerHTML = Favs.list.length ? '' : `<div class="empty">${icon('star')}<br>Nenhum favorito.<br>Segure um arquivo e toque em ★.</div>`;
  Favs.list.forEach(p => {
    if (!fExists(p)) return;
    const L = LANGS[detectLang(p)];
    const r = document.createElement('div');
    r.className = 'row';
    r.innerHTML = `${ficon(L)}<div class="grow"><div class="t" style="font-family:var(--font-code);font-size:12px">${esc(baseName(p))}</div><div class="s">${esc(dirName(p))}</div></div><span style="color:var(--yellow)">★</span>`;
    r.onclick = () => openFile(p);
    body.appendChild(r);
  });
}

/* ============================== GITHUB (REAL via api.github.com) ============================== */
const GH = {
  user: null, token: null,
  api: async (path, opts = {}) => {
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (GH.token) headers['Authorization'] = 'Bearer ' + GH.token;
    const r = await fetch('https://api.github.com' + path, { ...opts, headers });
    if (r.status === 401) throw new Error('Token inválido ou expirado');
    if (r.status === 403) throw new Error('Rate limit da API do GitHub — aguarde ou conecte um token');
    if (!r.ok) throw new Error('GitHub API ' + r.status);
    return r.json();
  },
  render() {
    Panel.setHead('GitHub', this.user ? '@' + this.user : 'Não conectado', this.user ? [{ ic: 'exit', t: 'Sair', fn: () => { this.user = null; this.token = null; Store.save(); Panel.render(); } }] : []);
    const body = $('#panelBody');
    if (!this.user) {
      body.innerHTML = `<div class="empty">${icon('github')}<br>Conecte para ver seus repositórios<br><span style="opacity:.6">Token: escopos repo (Vault/local).<br>Sem token: browsing público.</span></div>
        <div class="btn-row"><button class="big-btn primary" id="ghLogin">Conectar GitHub</button></div>
        <div class="btn-row"><button class="big-btn" id="ghPub">Procurar usuário público</button></div>`;
      body.querySelector('#ghLogin').onclick = async () => {
        const u = await dPrompt('Usuário GitHub', '', 'Seu usuário');
        if (!u || !u.trim()) return;
        const tk = await dPrompt('Personal access token (opcional — deixa vazio p/ público)', '', '');
        try {
          const me = tk ? (await this.api('/user', {}), null) : null;
          if (tk) { this.token = tk.trim(); await this.api('/user'); }
          this.user = u.trim();
          Store.save(); Panel.render();
          toast('GitHub conectado (API real)', 'github');
          clog('INFO', 'GitHub login: @' + this.user + (tk ? ' (token)' : ' (público)'));
        } catch (e) { toast('Erro real: ' + e.message.slice(0, 60), 'close'); }
      };
      body.querySelector('#ghPub').onclick = async () => {
        const u = await dPrompt('Ver repositórios públicos de', '', 'usuário');
        if (!u || !u.trim()) return;
        this.user = u.trim(); Store.save(); Panel.render();
      };
      return;
    }
    body.innerHTML = `<div class="sect">Repositórios de @${esc(this.user)} <span style="opacity:.5;font-size:11px">(dados reais da API)</span></div><div id="ghRepos"><div class="empty">Carregando via api.github.com…</div></div>`;
    const box = body.querySelector('#ghRepos');
    this.api((this.token ? '/user' : '/users/' + this.user) + '/repos?per_page=30&sort=updated')
      .then(repos => {
        if (!repos.length) { box.innerHTML = '<div class="empty">Nenhum repositório público.</div>'; return; }
        box.innerHTML = '';
        repos.forEach(r => {
          const row = document.createElement('div');
          row.className = 'row';
          row.innerHTML = `${icon('github')}<div class="grow"><div class="t">${esc(r.name)}</div><div class="s">${esc(r.description || 'sem descrição')} • ★${r.stargazers_count} • ${esc(r.language || '—')}</div></div>`;
          row.onclick = async () => {
            const srv = window.ThcodeServer;
            if (srv && srv.isUp()) {
              const ok = await dConfirm('Clonar de verdade', `git clone --depth 1 ${esc(r.clone_url)} no workspace do backend?`, 'Clonar');
              if (!ok) return;
              try {
                const res = await srv.api('POST', '/api/git/clone', { url: r.clone_url, dir: r.name });
                toast(res.ok ? 'Clonado de verdade (git clone no servidor)' : 'Erro: ' + (res.stderr || '').slice(0, 50), res.ok ? 'check' : 'close');
              } catch (e) { toast('Erro real: ' + e.message.slice(0, 60), 'close'); }
            } else {
              window.open(r.html_url, '_blank', 'noopener');
              toast('Clone real requer backend — abri o repo no GitHub', 'github');
            }
          };
          box.appendChild(row);
        });
      })
      .catch(e => { box.innerHTML = `<div class="empty">Erro real: ${esc(e.message)}</div>`; });
  }
};

/* ============================== TERMINAL (Alpine no Acode) ============================== */
const Term = {
  cwd: '/MeuJarvis', hist: [], histIdx: -1, lines: [],
  welcome() {
    return [
      ['d', 'Thcode terminal local — opera o VFS real do navegador.'],
      ['d', 'pkg add/remove: instalação REAL de pacotes npm via jsDelivr.'],
      ['d', 'Para shell completo (apk/npm/python): Servidor → Conectar backend.'],
      ['d', '']
    ];
  },
  render(container, inPage) {
    if (!inPage) Panel.setHead('Terminal', 'Alpine Linux', [
      { ic: 'copy', t: 'Copiar saída', fn: () => { copyText(this.lines.map(l => l[1]).join('\n')); toast('Saída copiada', 'copy'); } },
      { ic: 'close', t: 'Limpar', fn: () => { this.lines = []; this.render(container, inPage); } }
    ]);
    container.innerHTML = `<div class="term" style="font-size:${S.termFontSize}px">
      <div class="term-out" id="termOut"></div>
      <div class="term-in-row"><span class="term-prompt" id="termPrompt"></span><input class="term-in" id="termIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder=""></div>
    </div>`;
    const out = container.querySelector('#termOut');
    this.paint(out);
    this.updatePrompt(container);
    const inp = container.querySelector('#termIn');
    out.onclick = () => inp.focus();
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const c = inp.value; inp.value = ''; this.exec(c, container); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (this.hist.length) { this.histIdx = this.histIdx < 0 ? this.hist.length - 1 : Math.max(0, this.histIdx - 1); inp.value = this.hist[this.histIdx]; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (this.histIdx >= 0) { this.histIdx++; inp.value = this.hist[this.histIdx] || ''; if (this.histIdx >= this.hist.length) this.histIdx = -1; } }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); this.lines = []; this.paint(out); }
    });
    out.scrollTop = out.scrollHeight;
    if (inPage) setTimeout(() => inp.focus(), 300);
  },
  updatePrompt(container) {
    const p = (container || document).querySelector('#termPrompt');
    if (p) p.textContent = `root@localhost:${this.cwd === '/root' || this.cwd === '/' ? '~' : this.cwd} $`;
  },
  promptStr() { return `root@localhost:${this.cwd} $`; },
  paint(out) {
    out = out || $('#termOut');
    if (!out) return;
    const cls = { g: 'tp-green', b: 'tp-blue', y: 'tp-yellow', r: 'tp-red', c: 'tp-cyan', p: 'tp-purple', dim: 'tp-dim', d: '' };
    out.innerHTML = this.lines.map(([k, t]) => `<span class="${cls[k] || ''}">${esc(t)}</span>`).join('\n') + '<span class="term-cursor"></span>';
    out.scrollTop = out.scrollHeight;
    this.updatePrompt(document);
  },
  print(k, t) { this.lines.push([k, t]); if (this.lines.length > 600) this.lines.shift(); this.paint(); },
  resolve(p) {
    if (!p) return this.cwd;
    if (p.startsWith('/')) return normPath(p);
    if (p === '~') return '/MeuJarvis';
    return normPath(this.cwd + '/' + p);
  },
  exec(raw, container) {
    const cmd = raw.trim();
    this.print('g', `${this.promptStr()} ${raw}`);
    if (!cmd) return;
    this.hist.push(cmd); if (this.hist.length > (S.termHistory || 200)) this.hist.shift();
    this.histIdx = -1; Store.save();
    const [bin, ...args] = cmd.split(/\s+/);
    const arg = args.join(' ');
    const R = {
      help: () => [['c', 'Comandos disponíveis:'], ['d', '  help, ls, pwd, cd, mkdir, touch, cat, echo, rm, clear'], ['d', '  apk search|add|del|update, npm, node, python, git'], ['d', '  whoami, date, open <arq>, run, history, exit']],
      pwd: () => [['d', this.cwd]],
      whoami: () => [['d', 'root']],
      date: () => [['d', new Date().toString()]],
      history: () => this.hist.map((h, i) => ['dim', `  ${i + 1}  ${h}`]),
      ls: () => {
        const target = this.resolve(args[0] || '.');
        if (fExists(target)) return [['d', baseName(target)]];
        if (!dExists(target)) return [['r', `ls: ${args[0]}: No such file or directory`]];
        const { dirs, files } = listDir(target);
        if (!dirs.length && !files.length) return [];
        return [['b', dirs.map(d => d + '/').join('  ') + (dirs.length && files.length ? '  ' : '')], ['d', files.join('  ')]].filter(l => l[1]);
      },
      cd: () => {
        const t = args[0] ? this.resolve(args[0]) : '/MeuJarvis';
        if (fExists(t)) return [['r', `cd: not a directory: ${args[0]}`]];
        if (!dExists(t)) return [['r', `cd: no such file or directory: ${args[0]}`]];
        this.cwd = t; setTimeout(() => this.updatePrompt(document), 0); return [];
      },
      mkdir: () => { if (!args[0]) return [['r', 'mkdir: missing operand']]; ensureDir(this.resolve(args[0])); Store.save(); return [['g', `diretório criado: ${args[0]}`]]; },
      touch: () => { if (!args[0]) return [['r', 'touch: missing operand']]; const p = this.resolve(args[0]); if (!fExists(p)) fSet(p, ''); return [['g', `arquivo: ${args[0]}`]]; },
      cat: () => { if (!args[0]) return [['r', 'cat: missing operand']]; const f = fGet(this.resolve(args[0])); if (!f) return [['r', `cat: ${args[0]}: No such file or directory`]]; return f.c.split('\n').slice(0, 60).map(l => ['d', l]); },
      rm: () => { if (!args[0]) return [['r', 'rm: missing operand']]; const p = this.resolve(args[0].replace(/^-rf?\s*/, '')); if (!fExists(p) && !dExists(p)) return [['r', `rm: ${args[0]}: No such file or directory`]]; fDel(p); return [['y', `removido: ${args[0]}`]]; },
      echo: () => {
        const m = cmd.match(/^echo\s+(.*?)(?:\s*>\s*(\S+))?$/);
        const text = (m ? m[1] : '').replace(/^["']|["']$/g, '');
        if (m && m[2]) { fSet(this.resolve(m[2]), text + '\n'); return [['g', `escrito em ${m[2]}`]]; }
        return [['d', text]];
      },
      clear: () => { this.lines = []; this.paint(); return null; },
      apk: () => {
        const sub = args[0], pkg = args.slice(1).join(' ');
        if (sub === 'search' && pkg) return [['d', `nodejs-20.11.0-r0 — ${pkg} (simulado)`], ['d', `${pkg}-tools-1.0-r0 — utilitários (simulado)`]];
        if (sub === 'add' && pkg) return [['g', `(1/3) Instalando ${pkg}... OK (simulado)`], ['g', 'OK: 3 pacotes instalados']];
        if (sub === 'del' && pkg) return [['y', `(1/1) Removendo ${pkg}... OK (simulado)`]];
        if (sub === 'update') return [['d', 'fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main ... OK (simulado)']];
        if (sub === 'upgrade') return [['g', 'OK: sistema atualizado (simulado)']];
        return [['d', 'Uso: apk search|add|del|update|upgrade <pacote>']];
      },
      npm: () => [['d', 'npm v10.2.4 (simulado) — use "apk add nodejs" no Acode real']],
      node: () => args[0] ? [['d', `node: executando ${args[0]}... (simulado)`], ['g', '✓ sem erros']] : [['d', 'Welcome to Node.js v20 (simulado). Digite "exit" no app real.']],
      python: () => [['d', 'Python 3.11.6 (simulado) — "apk add python3" no Acode real']],
      git: () => {
        const sub = args[0] || 'status';
        if (sub === 'status') return [['d', 'On branch main'], ['g', 'nothing to commit, working tree clean (simulado)']];
        if (sub === 'log') return [['y', 'commit 1a2b3c4 — Initial commit (simulado)']];
        return [['d', `git ${sub} executado (simulado)`]];
      },
      open: () => { if (!args[0]) return [['r', 'Uso: open <arquivo>']]; const p = this.resolve(args[0]); if (!fExists(p)) return [['r', `open: ${args[0]}: not found`]]; openFile(p); return [['g', `aberto: ${args[0]}`]]; },
      run: () => {
        const p = T.active;
        if (!p) return [['r', 'Nenhum arquivo aberto']];
        const lang = detectLang(p);
        if (lang === 'html') { Preview.open(p); return [['g', `preview: ${baseName(p)}`]]; }
        return [['c', `▶ executando ${baseName(p)} (${LANGS[lang].name})...`], ['g', '✓ concluído (simulado)']];
      },
      exit: () => { Panel.close(); return [['dim', 'sessão encerrada (toque no ícone de terminal para voltar)']]; }
    };
    const fn = R[bin];
    if (!fn) { this.print('r', `${bin}: command not found — digite "help"`); return; }
    const res = fn();
    if (res) res.forEach(([k, t]) => this.print(k, t));
  }
};

/* ============================== CONSOLE ============================== */
const ConsolePage = {
  filter: 'ALL',
  open() { Page.open('console', 'Console', el => this.render(el)); },
  render(el) {
    el.innerHTML = `<div class="chip-row" id="cfChips">${['ALL', 'LOG', 'INFO', 'WARN', 'ERROR'].map(f => `<button class="chip${this.filter === f ? ' sel' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
      <div class="console-list" id="clogList" style="max-height:52vh"></div>
      <div class="console-in"><input id="jsEval" placeholder="Executar JavaScript... (ex: 2+2)" autocomplete="off"><button class="mini-btn" id="jsGo">▶</button></div>
      <div class="btn-row"><button class="big-btn" id="clClear">Limpar console</button></div>`;
    el.querySelectorAll('#cfChips .chip').forEach(c => c.onclick = () => { this.filter = c.dataset.f; this.render(el); });
    renderConsoleList();
    const go = () => {
      const code = el.querySelector('#jsEval').value.trim();
      if (!code) return;
      clog('LOG', '> ' + code);
      try { const r = new Function('"use strict";return (' + code + ')')(); clog('INFO', String(r)); }
      catch (err) { clog('ERROR', err.message); }
      el.querySelector('#jsEval').value = '';
      renderConsoleList();
      toast('Expressão avaliada', 'console');
    };
    el.querySelector('#jsGo').onclick = go;
    el.querySelector('#jsEval').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    el.querySelector('#clClear').onclick = () => { CLog.list = []; renderConsoleList(); };
  }
};
function renderConsoleList() {
  const box = $('#clogList');
  if (!box) return;
  const f = ConsolePage.filter;
  const items = CLog.list.filter(l => f === 'ALL' || l.level === f);
  box.innerHTML = items.length ? '' : '<div class="empty">Console vazio</div>';
  items.slice(-120).forEach(l => {
    const d = document.createElement('div');
    d.className = 'clog ' + l.level;
    d.innerHTML = `<span class="lv">${l.level}</span><span class="tm">${esc(l.t)}</span><span class="ms">${esc(l.msg)}</span>`;
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}

/* ============================== RUNNING PROCESSES ============================== */
const Procs = {
  list: [
    { pid: 101, name: 'Web Server', status: 'running', cpu: 4.2, mem: 38, started: '10:30:12' },
    { pid: 102, name: 'Terminal', status: 'running', cpu: 1.1, mem: 21, started: '10:30:12' },
    { pid: 103, name: 'AI Assistant', status: 'running', cpu: 12.8, mem: 96, started: '10:30:14' },
    { pid: 104, name: 'Plugin Manager', status: 'paused', cpu: 0, mem: 12, started: '10:30:14' },
    { pid: 105, name: 'File Watcher', status: 'running', cpu: 0.6, mem: 9, started: '10:30:15' },
    { pid: 106, name: 'Preview Server', status: 'stopped', cpu: 0, mem: 0, started: '—' }
  ],
  open() { Page.open('procs', 'Running processes', el => this.render(el)); },
  render(el) {
    el.innerHTML = '<div class="proc-grid" id="procGrid"></div>';
    const grid = el.querySelector('#procGrid');
    this.list.forEach(p => {
      const c = document.createElement('div');
      c.className = 'proc-card'; c.dataset.pid = p.pid;
      c.innerHTML = `<div class="proc-head"><span class="proc-dot ${p.status}"></span><span class="proc-name">${esc(p.name)}</span><span class="proc-pid">PID ${p.pid}</span></div>
        <div class="proc-stats"><span>CPU <b>${p.cpu.toFixed(1)}%</b></span><span>MEM <b>${p.mem} MB</b></span><span>START <b>${esc(p.started)}</b></span></div>
        <div class="proc-btns">
          <button class="go" data-a="start">Start</button><button class="warn" data-a="pause">Pause</button>
          <button data-a="restart">Restart</button><button class="stop" data-a="stop">Stop</button>
        </div>`;
      c.querySelectorAll('button').forEach(b => b.onclick = () => this.action(p.pid, b.dataset.a));
      grid.appendChild(c);
    });
  },
  action(pid, a) {
    const p = this.list.find(x => x.pid === pid);
    if (!p) return;
    if (a === 'start') { p.status = 'running'; p.started = fmtTime(); p.cpu = +(Math.random() * 8 + 1).toFixed(1); p.mem = Math.round(Math.random() * 60 + 10); toast(`${p.name} iniciado`, 'play'); }
    else if (a === 'pause') { p.status = 'paused'; p.cpu = 0; toast(`${p.name} pausado`, 'pause'); }
    else if (a === 'stop') { p.status = 'stopped'; p.cpu = 0; p.mem = 0; toast(`${p.name} parado`, 'stop'); }
    else if (a === 'restart') { p.status = 'running'; p.started = fmtTime(); p.cpu = +(Math.random() * 8 + 1).toFixed(1); toast(`${p.name} reiniciado`, 'refresh'); }
    clog(p.status === 'running' ? 'INFO' : 'WARN', `Process ${p.name} (${pid}): ${p.status}`);
    Store.save();
    if (Page.current === 'procs') Page.rerender();
  },
  tick() {
    let changed = false;
    this.list.forEach(p => {
      if (p.status === 'running') {
        p.cpu = +clamp(p.cpu + (Math.random() * 4 - 2), 0.2, 45).toFixed(1);
        p.mem = Math.max(4, Math.round(p.mem + (Math.random() * 6 - 3)));
        changed = true;
      }
    });
    if (changed && Page.current === 'procs') {
      this.list.forEach(p => {
        const card = document.querySelector(`.proc-card[data-pid="${p.pid}"] .proc-stats`);
        if (card) card.innerHTML = `<span>CPU <b>${p.cpu.toFixed(1)}%</b></span><span>MEM <b>${p.mem} MB</b></span><span>START <b>${esc(p.started)}</b></span>`;
      });
    }
  }
};

/* ============================== PREVIEW ============================== */
const Preview = {
  open(path = null) {
    const p = path || T.active;
    Page.open('preview', 'Preview', el => this.render(el, p));
  },
  render(el, p) {
    if (!p || detectLang(p) !== 'html') {
      el.innerHTML = `<div class="empty">${icon('preview')}<br>${p ? 'Preview disponível apenas para arquivos HTML.<br>Abra um .html para visualizar.' : 'Nenhum arquivo aberto.'}</div>
        <div class="btn-row"><button class="big-btn primary" id="pvOpen">Abrir index.html</button></div>`;
      el.querySelector('#pvOpen').onclick = () => { if (fExists('/MeuJarvis/index.html')) { openFile('/MeuJarvis/index.html'); this.open('/MeuJarvis/index.html'); } };
      if (p && fExists(p)) {
        const info = document.createElement('div');
        info.className = 'note';
        info.innerHTML = `<b>Execução simulada:</b> ${esc(baseName(p))} (${LANGS[detectLang(p)].name})<br>Use <b>Terminal → run</b> para simular a execução.`;
        el.appendChild(info);
      }
      return;
    }
    const url = S.previewMode === 'browser' ? `http://localhost:${S.previewPort}${p}` : `preview:${p}`;
    el.innerHTML = `<div class="preview-tabs"><button id="pvEdit">Editor</button><button class="sel" id="pvView">Preview</button></div>
      <div class="preview-bar"><div class="preview-url">${esc(url)}</div>
      <button class="icon-mini" id="pvReload" title="Recarregar">${icon('refresh')}</button>
      <button class="icon-mini" id="pvExt" title="Abrir no navegador">${icon('external')}</button></div>
      <div style="flex:1;display:flex;min-height:50vh"><iframe class="preview-frame" id="pvFrame" sandbox="allow-scripts" title="Preview"></iframe></div>`;
    const frame = el.querySelector('#pvFrame');
    const load = () => {
      const content = T.active === p ? Ed.value() : Ed.currentContent(p);
      frame.srcdoc = content;
      toast('Preview atualizado', 'refresh');
    };
    load();
    el.querySelector('#pvReload').onclick = load;
    el.querySelector('#pvExt').onclick = () => {
      const blob = new Blob([T.active === p ? Ed.value() : Ed.currentContent(p)], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    };
    el.querySelector('#pvEdit').onclick = () => { Page.close(); openFile(p); };
  }
};

/* ============================== AI (Rutex Agent + Assistant) ============================== */
const AI_MODELS = ['OpenRouter', 'GPT-4o mini', 'Claude 3.5 Sonnet', 'DeepSeek V3', 'Llama 3.1 70B', 'Gemini 1.5 Flash'];
const AI = {
  agentMsgs: [], chats: [], chatId: null, model: 'OpenRouter', ctx: [], streaming: false, stopFlag: false,
  currentChat() {
    let c = this.chats.find(x => x.id === this.chatId);
    if (!c) { c = { id: uid(), title: 'Nova conversa', msgs: [], ts: Date.now() }; this.chats.unshift(c); this.chatId = c.id; }
    return c;
  },
  /* ---------- RUTEX CODING AGENT ---------- */
  renderAgent(container) {
    Panel.setHead('Rutex Agent', 'Coding Agent • ' + this.model, [
      { ic: 'plus', t: 'Nova conversa', fn: () => { this.agentMsgs = []; this.ctx = []; Store.save(); Panel.render(); } },
      { ic: 'clock', t: 'Histórico', fn: () => toast(`${this.agentMsgs.length} mensagens nesta sessão`, 'clock') },
      { ic: 'settings', t: 'Configurar', fn: () => AI.agentSettings() }
    ]);
    container.innerHTML = `<div class="ai-wrap">
      <div class="ai-head">
        <div class="ai-brand"><span class="live"></span>RUTEX CODING <span style="color:var(--accent2)">AGENT</span><span class="sp"></span></div>
        <div class="ai-ctx" id="agentCtx"></div>
        <div class="ai-model-row"><span class="lab">MODEL</span><select class="ai-model" id="agentModel">${AI_MODELS.map(m => `<option${m === this.model ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
      </div>
      <div class="ai-msgs" id="agentMsgs"></div>
      <div class="ai-composer">
        <div class="ai-input-row"><textarea class="ai-input" id="agentIn" rows="1" placeholder="Instruct AI Agent..."></textarea><button class="ai-send" id="agentSend">${icon('send')}</button></div>
        <div class="ai-tools">
          <button class="icon-mini" id="agentAttach" title="Anexar arquivo">${icon('attach')}</button>
          <button class="icon-mini" id="agentCtxBtn" title="Adicionar contexto (arquivo aberto)">${icon('plus')}</button>
          <button class="icon-mini" id="agentClear" title="Limpar conversa">${icon('trash')}</button>
          <span class="ai-hint"><b>Shift + Enter</b> send • <b>Enter</b> newline</span>
        </div>
      </div>
    </div>`;
    const paintCtx = () => {
      const box = container.querySelector('#agentCtx');
      box.innerHTML = `<span class="ctx-chip" style="color:var(--muted2)">CTX</span>` +
        this.ctx.map((c, i) => `<span class="ctx-chip">${icon('file', 'width:13px;height:13px')}${esc(baseName(c))}<button data-i="${i}">✕</button></span>`).join('') +
        `<span class="ctx-chip ctx-add" id="ctxAdd">+ add file</span>`;
      box.querySelectorAll('.ctx-chip button').forEach(b => b.onclick = () => { this.ctx.splice(+b.dataset.i, 1); paintCtx(); });
      box.querySelector('#ctxAdd').onclick = () => this.pickCtx(paintCtx);
    };
    paintCtx();
    container.querySelector('#agentModel').onchange = e => { this.model = e.target.value; Panel.setHead('Rutex Agent', 'Coding Agent • ' + this.model, []); Panel.render(); };
    this.paintAgentMsgs(container);
    const inp = container.querySelector('#agentIn');
    inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 110) + 'px'; });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); this.sendAgent(container); }
    });
    container.querySelector('#agentSend').onclick = () => this.sendAgent(container);
    container.querySelector('#agentAttach').onclick = () => this.pickCtx(paintCtx);
    container.querySelector('#agentCtxBtn').onclick = () => { if (T.active && !this.ctx.includes(T.active)) { this.ctx.push(T.active); paintCtx(); toast('Contexto adicionado', 'plus'); } else toast('Nenhum arquivo aberto', 'info'); };
    container.querySelector('#agentClear').onclick = () => { this.agentMsgs = []; Store.save(); this.paintAgentMsgs(container); };
  },
  pickCtx(cb) {
    const files = Object.keys(FS.files).filter(f => baseName(f) !== '.keep');
    if (!files.length) { toast('Nenhum arquivo', 'info'); return; }
    dList('Adicionar ao contexto', files.slice(0, 30).map(f => ({ label: baseName(f), hint: dirName(f), value: f }))).then(v => {
      if (v && !this.ctx.includes(v)) { this.ctx.push(v); cb && cb(); toast('Arquivo anexado', 'attach'); }
    });
  },
  paintAgentMsgs(container) {
    const box = (container || document).querySelector('#agentMsgs');
    if (!box) return;
    box.innerHTML = this.agentMsgs.length ? '' : '<div class="ai-welcome"><h3>Rutex Coding Agent</h3><p>Anexe arquivos em CTX e peça explicações, correções ou novo código.</p></div>';
    this.agentMsgs.forEach(m => box.appendChild(this.msgEl(m)));
    box.scrollTop = box.scrollHeight;
  },
  msgEl(m) {
    const d = document.createElement('div');
    d.className = 'msg ' + m.role;
    const who = m.role === 'you' ? `${icon('ai')} YOU` : `${icon('hex')} RUTEX`;
    let body = esc(m.text);
    if (m.role === 'ai') {
      body = body.replace(/```(\w*)\n([\s\S]*?)```/g, (mm, l, code) => `<pre><code>${code.replace(/\n$/, '')}</code></pre>`)
        .replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    }
    d.innerHTML = `<div class="who">${who}</div><div>${body}</div>`;
    return d;
  },
  sendAgent(container) {
    if (this.streaming) { this.stopFlag = true; toast('Resposta interrompida', 'stop'); return; }
    const inp = container.querySelector('#agentIn');
    const text = inp.value.trim();
    if (!text) return;
    this.agentMsgs.push({ role: 'you', text });
    inp.value = ''; inp.style.height = 'auto';
    this.paintAgentMsgs(container);
    this.streamReply(container, text, 'agent');
    Store.save();
  },
  streamReply(container, prompt, mode) {
    const boxSel = mode === 'agent' ? '#agentMsgs' : '#aiMsgs';
    const box = container.querySelector(boxSel);
    if (!box) return;
    this.streaming = true;
    this.stopFlag = false;
    const typing = document.createElement('div');
    typing.className = 'msg ai';
    typing.innerHTML = `<div class="who">${icon('hex')} RUTEX</div><span class="typing-dots"><i></i><i></i><i></i></span>`;
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
    const full = this.generate(prompt);
    const words = full.split(' ');
    let i = 0, body = typing.querySelector('.typing-dots');
    const step = () => {
      if (!document.contains(typing)) { this.streaming = false; return; }
      if (this.stopFlag) { typing.remove(); this.streaming = false; this.stopFlag = false; return; }
      i += 3;
      const partial = words.slice(0, i).join(' ');
      const html = `<div class="stream">${esc(partial).replace(/\n/g, '<br>')}▍</div>`;
      if (body) { const d = document.createElement('div'); d.innerHTML = html; const nd = d.firstChild; body.replaceWith(nd); body = nd; }
      else if (typing.querySelector('.stream')) typing.querySelector('.stream').outerHTML = html;
      box.scrollTop = box.scrollHeight;
      if (i < words.length) setTimeout(step, 40);
      else {
        typing.remove();
        const msg = { role: 'ai', text: full };
        if (mode === 'agent') { this.agentMsgs.push(msg); this.paintAgentMsgs(container); }
        else { this.currentChat().msgs.push(msg); this.paintChat(container); }
        this.streaming = false;
        Store.save();
      }
    };
    setTimeout(step, 900);
  },
  generate(prompt) {
    const p = prompt.toLowerCase();
    const ctxFiles = this.ctx.filter(fExists);
    const sel = Ed.input && T.active ? Ed.input.value.slice(Ed.input.selectionStart, Ed.input.selectionEnd) : '';
    const codeRef = sel && sel.length > 4 && sel.length < 800 ? sel : (ctxFiles.length ? (fGet(ctxFiles[0]).c.split('\n').slice(0, 40).join('\n')) : '');
    const stats = f => { const c = fGet(f).c; return `${c.split('\n').length} linhas, ${c.length} caracteres (${LANGS[detectLang(f)].name})`; };
    if (/(explain|explic|analis|o que|que faz)/.test(p)) {
      if (!codeRef && !ctxFiles.length) return 'Anexe um arquivo em CTX ou selecione um trecho do código e peça novamente — assim posso explicar cada parte em detalhes.';
      let r = `Análise do código${ctxFiles.length ? ` de ${ctxFiles.map(baseName).join(', ')}` : ' selecionado'}:\n\n`;
      if (ctxFiles.length) r += ctxFiles.map(f => `• ${baseName(f)} — ${stats(f)}`).join('\n') + '\n\n';
      const lines = codeRef.split('\n');
      const fns = (codeRef.match(/function\s+\w+|const\s+\w+\s*=\s*\(|def\s+\w+|fn\s+\w+/g) || []).length;
      r += `Encontrei ${lines.length} linhas analisadas e ${fns} função(ões) declarada(s). `;
      r += 'A estrutura segue boas práticas: separação de responsabilidades, nomes descritivos e fluxo legível. ';
      r += 'Pontos de atenção: valide entradas externas, evite valores fixos duplicados e prefira funções pequenas e testáveis. Quer que eu otimize um trecho específico?';
      return r;
    }
    if (/(fix|corrig|erro|bug|debug)/.test(p)) {
      return 'Analisei o contexto em busca de falhas comuns:\n\n```js\n// antes (possível problema)\nbtn.addEventListener("click", () => {\n  falar(respostas[i]); // "i" pode estar fora do escopo\n});\n\n// depois (correção sugerida)\nbtn.addEventListener("click", () => {\n  const i = Math.floor(Math.random() * respostas.length);\n  falar(respostas[i]);\n});\n```\n\nVerifique também: elementos nulos (`getElementById` retornando null), erros de digitação em nomes e chaves não fechadas. Cole o erro do console para um diagnóstico exato.';
    }
    if (/(otimiz|melhor|refactor|refator|performance)/.test(p)) {
      return 'Sugestões de otimização:\n\n1. Evite consultas repetidas ao DOM — guarde referências em `const`.\n2. Use delegação de eventos em listas grandes.\n3. Prefira `DocumentFragment` ao inserir muitos nós.\n4. Debounce em eventos de `input`/`scroll`.\n\nExemplo:\n```js\nconst debounce = (fn, ms) => {\n  let t;\n  return (...a) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...a), ms);\n  };\n};\n```\nQuer que eu aplique alguma dessas mudanças no arquivo atual?';
    }
    if (/(cri|ger|novo|exemplo|snippet|função|funcao)/.test(p)) {
      return 'Aqui está um exemplo pronto para usar:\n\n```js\n// Toast simples estilo Acode\nfunction toast(msg) {\n  const t = document.createElement("div");\n  t.className = "toast";\n  t.textContent = msg;\n  document.body.appendChild(t);\n  setTimeout(() => t.remove(), 2200);\n}\n```\n\nDiga o que precisa — componente HTML, estilo CSS ou função JS — que eu gero o código completo.';
    }
    if (/(oi|olá|ola|hey|hello|bom dia|boa tarde|boa noite)\b/.test(p)) {
      return `Olá! Sou o Rutex, seu coding agent. Posso explicar código, corrigir bugs, otimizar e gerar snippets. ${T.active ? `Vejo que você está editando ${baseName(T.active)} — quer uma análise dele?` : 'Abra um arquivo para começarmos.'}`;
    }
    if (/(obrigado|valeu|thanks)/.test(p)) return 'Por nada! Continue codando — estou aqui quando precisar. Quer revisar mais algum arquivo?';
    return `Entendi: "${prompt.slice(0, 120)}". Com base no projeto /MeuJarvis, aqui vai minha recomendação:\n\n• Mantenha o código organizado por responsabilidade (HTML, CSS e JS separados).\n• Teste cada mudança no Preview antes de continuar.\n• Use o Terminal para inspecionar arquivos (ls, cat).\n\nSeja mais específico — por exemplo: "explique a função falar", "otimize o CSS" ou "crie um modal" — e eu respondo com código pronto.`;
  },
  agentSettings() {
    dList('Agent Settings', [
      { label: 'Modelo: ' + this.model, icon: 'ai', value: 'm' },
      { label: 'Limpar conversa', icon: 'trash', value: 'c' }
    ]).then(r => {
      if (r === 'm') dList('Escolher modelo', AI_MODELS.map(m => ({ label: m, value: m }))).then(v => { if (v) { this.model = v; Panel.render(); toast('Modelo: ' + v, 'ai'); } });
      if (r === 'c') { this.agentMsgs = []; Store.save(); Panel.render(); }
    });
  },
  /* ---------- AI ASSISTANT BETA ---------- */
  aiTab: 'chat',
  renderAssistant(container) {
    Panel.setHead('AI Assistant', 'Beta • ' + this.model, [
      { ic: 'plus', t: 'Nova conversa', fn: () => { this.chatId = null; this.currentChat(); Store.save(); Panel.render(); } }
    ]);
    container.innerHTML = `<div class="ai-wrap">
      <div class="ai-tabs"><button data-t="chat" class="${this.aiTab === 'chat' ? 'sel' : ''}">Chat</button><button data-t="history" class="${this.aiTab === 'history' ? 'sel' : ''}">History</button><button data-t="settings" class="${this.aiTab === 'settings' ? 'sel' : ''}">Settings</button></div>
      <div class="ai-msgs" id="aiMsgs" style="${this.aiTab === 'chat' ? '' : 'display:none'}"></div>
      <div id="aiAlt" style="flex:1;overflow-y:auto;${this.aiTab === 'chat' ? 'display:none' : ''}"></div>
      <div class="ai-composer" id="aiComposer" style="${this.aiTab === 'chat' ? '' : 'display:none'}">
        <div class="ai-input-row"><input class="ai-input" id="aiIn" placeholder="Type your message..." autocomplete="off"><button class="ai-send" id="aiSend">${icon('send')}</button></div>
      </div>
    </div>`;
    container.querySelectorAll('.ai-tabs button').forEach(b => b.onclick = () => { this.aiTab = b.dataset.t; Panel.render(); });
    if (this.aiTab === 'chat') {
      this.paintChat(container);
      const inp = container.querySelector('#aiIn');
      const send = () => {
        if (this.streaming) { this.stopFlag = true; return; }
        const t = inp.value.trim();
        if (!t) return;
        inp.value = '';
        if (!this.currentChat().msgs.length) this.currentChat().title = t.slice(0, 34);
        this.currentChat().msgs.push({ role: 'you', text: t });
        this.paintChat(container);
        this.streamReply(container, t, 'chat');
        Store.save();
      };
      container.querySelector('#aiSend').onclick = send;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    } else if (this.aiTab === 'history') {
      const alt = container.querySelector('#aiAlt');
      alt.innerHTML = this.chats.length ? '' : '<div class="empty">Nenhuma conversa ainda</div>';
      this.chats.forEach(c => {
        const r = document.createElement('div');
        r.className = 'row' + (c.id === this.chatId ? ' selected' : '');
        r.innerHTML = `${icon('clock')}<div class="grow"><div class="t">${esc(c.title)}</div><div class="s">${c.msgs.length} mensagens</div></div>`;
        r.onclick = () => { this.chatId = c.id; this.aiTab = 'chat'; Panel.render(); };
        alt.appendChild(r);
      });
    } else {
      const alt = container.querySelector('#aiAlt');
      alt.innerHTML = `<div class="sect">Modelo</div><div class="opt-list">${AI_MODELS.map(m => `<div class="opt-row${m === this.model ? ' sel' : ''}" data-m="${esc(m)}"><span class="radio"></span>${esc(m)}</div>`).join('')}</div>
        <div class="note"><b>Modo simulado:</b> as respostas são geradas localmente para demonstração, sem backend.</div>`;
      alt.querySelectorAll('.opt-row').forEach(o => o.onclick = () => { this.model = o.dataset.m; Store.save(); Panel.render(); toast('Modelo: ' + this.model, 'ai'); });
    }
  },
  paintChat(container) {
    const box = (container || document).querySelector('#aiMsgs');
    if (!box) return;
    const c = this.currentChat();
    box.innerHTML = c.msgs.length ? '' : '<div class="ai-welcome"><h3>Welcome to AI Assistant</h3><p>Start a conversation by typing your message below.</p></div>';
    c.msgs.forEach(m => box.appendChild(this.msgEl(m)));
    box.scrollTop = box.scrollHeight;
  }
};

/* ============================== COMMAND PALETTE ============================== */
const Palette = {
  sel: 0, items: [],
  commands() {
    return [
      { t: 'New File', ic: 'plus', kbd: '', fn: () => newFile() },
      { t: 'Save', ic: 'save', kbd: 'Ctrl+S', fn: () => saveFile() },
      { t: 'Save As...', ic: 'save', fn: () => saveAs() },
      { t: 'Close File', ic: 'close', fn: () => T.active && closeTab(T.active) },
      { t: 'Open File...', ic: 'file', kbd: 'Ctrl+P', fn: () => quickOpen() },
      { t: 'Import File...', ic: 'upload', fn: () => pickImport(false) },
      { t: 'Import Folder...', ic: 'files', fn: () => pickImport(true) },
      { t: 'Find', ic: 'search', kbd: 'Ctrl+F', fn: () => Find.open(false) },
      { t: 'Replace', ic: 'edit', kbd: 'Ctrl+H', fn: () => Find.open(true) },
      { t: 'Go to Line...', ic: 'console', fn: async () => { const n = await dPrompt('Ir para linha', '', 'Número'); if (n) gotoLine(+n); } },
      { t: 'Terminal', ic: 'terminal', fn: () => Panel.open('terminal') },
      { t: 'Console', ic: 'console', fn: () => ConsolePage.open() },
      { t: 'Running Processes', ic: 'grid', fn: () => Procs.open() },
      { t: 'Plugins', ic: 'puzzle', fn: () => Panel.open('plugins') },
      { t: 'AI Agent', ic: 'hex', fn: () => Panel.open('agent') },
      { t: 'AI Assistant', ic: 'ai', fn: () => Panel.open('ai') },
      { t: 'Settings', ic: 'settings', fn: () => SettingsPage.open() },
      { t: 'Change Theme', ic: 'palette', fn: () => SettingsPage.theme() },
      { t: 'Preview', ic: 'preview', fn: () => Preview.open() },
      { t: 'Run (Terminal)', ic: 'play', fn: () => { Panel.open('terminal'); setTimeout(() => Term.exec('run'), 200); } },
      { t: 'Toggle Minimap', ic: 'eye', fn: () => { S.minimap = !S.minimap; applySettings(); Store.save(); renderEditor(); toast('Minimap ' + (S.minimap ? 'ativado' : 'desativado'), 'eye'); } },
      { t: 'Toggle Word Wrap', ic: 'files', fn: () => { S.textWrap = !S.textWrap; applySettings(); Store.save(); renderEditor(); } },
      { t: 'Format Document', ic: 'wand', fn: () => formatActive() },
      { t: 'Increase Font Size', ic: 'plus', fn: () => zoomEditor(10) },
      { t: 'Decrease Font Size', ic: 'close', fn: () => zoomEditor(-10) },
      { t: 'Backup & Restore', ic: 'backup', fn: () => SettingsPage.backup() },
      { t: 'Help', ic: 'help', fn: () => SettingsPage.help() }
    ];
  },
  open() {
    $('#paletteWrap').classList.remove('hidden');
    $('#paletteInput').value = '';
    this.filter('');
    setTimeout(() => $('#paletteInput').focus(), 50);
    vibrate(6);
  },
  close() { $('#paletteWrap').classList.add('hidden'); },
  filter(q) {
    q = q.toLowerCase();
    this.items = this.commands().filter(c => c.t.toLowerCase().includes(q));
    this.sel = 0;
    this.paint();
  },
  paint() {
    const list = $('#paletteList');
    list.innerHTML = this.items.length ? '' : '<div class="empty">Nenhum comando</div>';
    this.items.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'pal-item' + (i === this.sel ? ' sel' : '');
      d.innerHTML = `${icon(c.ic)}<span>${esc(c.t)}</span>${c.kbd ? `<span class="kbd">${esc(c.kbd)}</span>` : ''}`;
      d.onclick = () => { this.close(); c.fn(); };
      d.onmouseenter = () => { this.sel = i; this.paint(); };
      list.appendChild(d);
    });
  },
  move(d) {
    if (!this.items.length) return;
    this.sel = (this.sel + d + this.items.length) % this.items.length;
    this.paint();
    try { $('#paletteList').children[this.sel]?.scrollIntoView?.({ block: 'nearest' }); } catch (_) {}
  },
  run() { const c = this.items[this.sel]; if (c) { this.close(); setTimeout(() => c.fn(), 30); } },
  init() {
    $('#paletteInput').addEventListener('input', e => this.filter(e.target.value));
    $('#paletteInput').addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.move(-1); }
      else if (e.key === 'Enter') this.run();
      else if (e.key === 'Escape') this.close();
    });
    $('#paletteWrap').addEventListener('click', e => { if (e.target.id === 'paletteWrap') this.close(); });
  }
};
function quickOpen() {
  const files = Object.keys(FS.files).filter(f => baseName(f) !== '.keep');
  dList('Abrir arquivo', files.slice(0, 40).map(f => ({ label: baseName(f), hint: dirName(f), value: f }))).then(v => { if (v) openFile(v); });
}
function pickImport(folder) {
  const fi = $('#hiddenFileInput');
  fi.accept = '';
  fi.webkitdirectory = !!folder;
  fi.multiple = true;
  fi.onchange = e => { if (e.target.files.length) importReal(e.target.files, Explorer.root); fi.value = ''; fi.webkitdirectory = false; };
  fi.click();
}
function zoomEditor(delta) {
  S.editorZoom = clamp((S.editorZoom || 100) + delta, 50, 250);
  applySettings(); Store.save(); renderEditor();
}

/* ============================== PAGES ============================== */
const Page = {
  stack: [], current: null,
  open(id, title, render, searchable = true) {
    this.stack.push({ id, title, render, searchable });
    this.show();
  },
  show() {
    const cur = this.stack[this.stack.length - 1];
    this.current = cur.id;
    $('#pageRoot').classList.remove('hidden');
    $('#pageRoot').classList.remove('closing');
    $('#pageTitle').textContent = cur.title;
    $('#pageSearch').style.display = cur.searchable ? '' : 'none';
    $('#pageSearchBar').classList.add('hidden');
    $('#pageSearchInput').value = '';
    $('#pageBody').innerHTML = '';
    $('#pageBody').scrollTop = 0;
    cur.render($('#pageBody'));
  },
  rerender() { if (this.stack.length) this.show(); },
  back() {
    this.stack.pop();
    if (!this.stack.length) this.close(true);
    else this.show();
  },
  close(all = true) {
    if (all) this.stack = [];
    this.current = null;
    const r = $('#pageRoot');
    r.classList.add('closing');
    setTimeout(() => { r.classList.add('hidden'); r.classList.remove('closing'); }, 180);
  },
  init() {
    $('#pageBack').onclick = () => this.back();
    $('#pageSearch').onclick = () => { $('#pageSearchBar').classList.toggle('hidden'); if (!$('#pageSearchBar').classList.contains('hidden')) $('#pageSearchInput').focus(); };
    $('#pageSearchInput').addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      $$('#pageBody .set-row, #pageBody .opt-row, #pageBody .row, #pageBody .plugin-row, #pageBody .proc-card, #pageBody .cl-ver, #pageBody .range-row, #pageBody .txt-row, #pageBody .seg').forEach(el => {
        el.style.display = !q || el.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }
};
/* ---- settings row builders ---- */
function setRow(ic, t, s, fn) {
  const b = document.createElement('button');
  b.className = 'set-row';
  b.innerHTML = `${icon(ic)}<div class="grow"><div class="t">${esc(t)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>${icon('chevron', '').replace('<svg ', '<svg class="chev" ')}`;
  b.onclick = fn;
  return b;
}
function toggleRow(key, t, s, cb) {
  const b = document.createElement('div');
  b.className = 'set-row'; b.style.cursor = 'pointer';
  b.innerHTML = `<div class="grow"><div class="t">${esc(t)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div><div class="switch${S[key] ? ' on' : ''}"></div>`;
  b.onclick = () => {
    S[key] = !S[key];
    b.querySelector('.switch').classList.toggle('on', !!S[key]);
    vibrate(8); Store.save();
    if (cb) cb(S[key]);
    clog('INFO', `Setting ${key} = ${S[key]}`);
  };
  return b;
}
function segRow(label, key, opts, cb) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="sect">${esc(label)}</div>`;
  const seg = document.createElement('div');
  seg.className = 'seg';
  opts.forEach(([val, lab]) => {
    const btn = document.createElement('button');
    btn.textContent = lab;
    btn.className = S[key] === val ? 'sel' : '';
    btn.onclick = () => { S[key] = val; seg.querySelectorAll('button').forEach(x => x.classList.remove('sel')); btn.classList.add('sel'); vibrate(6); Store.save(); if (cb) cb(val); };
    seg.appendChild(btn);
  });
  wrap.appendChild(seg);
  return wrap;
}
function rangeRow(label, key, min, max, step, fmt, cb) {
  const wrap = document.createElement('div');
  wrap.className = 'range-row';
  const show = () => (fmt || (v => v))(S[key]);
  wrap.innerHTML = `<div class="lab"><span>${esc(label)}</span><span class="val">${esc(show())}</span></div><input type="range" min="${min}" max="${max}" step="${step}" value="${parseFloat(S[key])}">`;
  const inp = wrap.querySelector('input');
  inp.addEventListener('input', () => {
    let v = parseFloat(inp.value);
    S[key] = key === 'fontSize' || key === 'termFontSize' ? v + 'px' : v;
    wrap.querySelector('.val').textContent = (fmt || (x => x))(S[key]);
    if (cb) cb(S[key]);
  });
  inp.addEventListener('change', () => Store.save());
  return wrap;
}
function selectRow(label, key, opts, cb) {
  const wrap = document.createElement('div');
  wrap.className = 'txt-row';
  wrap.innerHTML = `<label>${esc(label)}</label><select>${opts.map(([v, l]) => `<option value="${esc(v)}"${S[key] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  wrap.querySelector('select').onchange = e => { S[key] = e.target.value; Store.save(); if (cb) cb(S[key]); toast('Configuração atualizada', 'settings'); };
  return wrap;
}
function textRow(label, key, type = 'text', cb) {
  const wrap = document.createElement('div');
  wrap.className = 'txt-row';
  wrap.innerHTML = `<label>${esc(label)}</label><input type="${type}" value="${esc(S[key])}">`;
  wrap.querySelector('input').onchange = e => { S[key] = type === 'number' ? +e.target.value : e.target.value; Store.save(); if (cb) cb(S[key]); toast('Configuração atualizada', 'settings'); };
  return wrap;
}
function sect(el, t) { const d = document.createElement('div'); d.className = 'set-sect'; d.textContent = t; el.appendChild(d); }
function note(el, html) { const d = document.createElement('div'); d.className = 'note'; d.innerHTML = html; el.appendChild(d); }

/* ============================== SETTINGS PAGES ============================== */
const SettingsPage = {
  open() { Page.open('settings', 'Configurações', el => this.main(el)); },
  main(el) {
    sect(el, 'Core settings');
    el.appendChild(setRow('settings', 'Configurações do aplicativo', 'Language, app behavior, and quick access tools.', () => this.app()));
    el.appendChild(setRow('font', 'Configurações do editor', 'Fonts, tabs, suggestions, and editor display.', () => this.editor()));
    el.appendChild(setRow('terminal', 'Configurações do Terminal', 'Terminal theme, font, cursor, and session behavior.', () => this.terminal()));
    el.appendChild(setRow('globe', 'Configurações da pré-visualização', 'Preview mode, server ports, and browser behavior.', () => this.preview()));
    sect(el, 'Personalização');
    el.appendChild(setRow('palette', 'Tema', 'App theme, contrast, and custom colors.', () => this.theme()));
    el.appendChild(setRow('logo', 'Ícone do aplicativo', 'Escolha o ícone do aplicativo exibido no seu dispositivo.', () => this.appIcon()));
    sect(el, 'Ferramentas');
    el.appendChild(setRow('wand', 'Formatador', 'Choose a formatter for each supported language.', () => this.formatter()));
    el.appendChild(setRow('puzzle', 'Plugins', 'Manage installed plugins and their available actions.', () => Page.open('plugins', 'Plugins', p => renderPlugins(p, true))));
    el.appendChild(setRow('globe', 'Serviços conectados', 'GitHub, OpenRouter, registry e atualizações.', () => SettingsPage.services()));
    el.appendChild(setRow('zap', 'Language servers', 'Configure language servers and editor intelligence.', () => this.lsp()));
    sect(el, 'Maintenance');
    el.appendChild(setRow('backup', 'Backup & Restaurar', 'Export settings to a backup or restore them later.', () => this.backup()));
    el.appendChild(setRow('edit', 'Editar settings.json', 'Edit the raw settings.json file directly.', () => this.settingsJson()));
    el.appendChild(setRow('history', 'Restaurar a configuração original', 'Reset Thcode to its default configuration.', () => this.reset()));
    sect(el, 'About Thcode');
    el.appendChild(setRow('info', 'Sobre', 'Version 2.0.0', () => this.about()));
    el.appendChild(setRow('heart', 'Patrocinador', 'Support ongoing Acode development.', () => this.sponsor()));
    el.appendChild(setRow('clock', 'Registro de Alterações', 'See recent updates and release notes.', () => this.changelog()));
    el.appendChild(setRow('star', 'Avaliar Thcode', 'Rate Thcode on Google Play.', () => this.rate()));
    sect(el, 'Support Thcode');
    el.appendChild(setRow('play', 'Earn ad-free time', 'Watch ads to unlock temporary ad-free access.', () => this.adfree()));
    el.appendChild(setRow('lock', 'Remover propagandas', 'Unlock permanent ad-free access.', () => this.removeAds()));
    sect(el, 'Descubra mais apps');
    el.appendChild(setRow('ai', 'Better Keep Notes', 'Private & Secure OSS notes app', () => this.promo('Better Keep Notes', 'Bloco de notas privado, seguro e open-source.')));
    el.appendChild(setRow('terminal', 'Shellular', 'Your PC in your Pocket', () => this.promo('Shellular', 'SSH + terminal remoto no seu bolso.')));
    sect(el, 'Thcode');
    el.appendChild(setRow('gauge', 'Métricas', 'Desempenho, armazenamento e uso.', () => SettingsPage.metrics()));
    el.appendChild(setRow('shield', 'Diagnóstico', 'Saúde do app e recomendações.', () => SettingsPage.diagnostics()));
    el.appendChild(setRow('star', 'Descobrir', 'Produtos, apps e sites externos.', () => SettingsPage.discover()));
    sect(el, 'Ajuda');
    el.appendChild(setRow('help', 'Ajuda e atalhos', 'Shortcuts, gestures and tips.', () => this.help()));
    el.appendChild(setRow('book', 'Termos e Privacidade', 'Terms of service and privacy policy.', () => SettingsPage.legal()));
  },
  app(el0) {
    Page.open('app', 'Configurações do aplicativo', el => {
      sect(el, 'Idioma e região');
      el.appendChild(selectRow('Idioma / Language', 'lang', [['pt-BR', 'Português (Brasil)'], ['en', 'English'], ['es', 'Español']], () => toast('Interface em pt-BR — tradução completa ainda não existe (não simulamos)', 'globe')));
      sect(el, 'Comportamento');
      el.appendChild(toggleRow('vibrateOnTap', 'Vibrar ao tocar', 'vibrateOnTap — feedback tátil nas ações'));
      el.appendChild(toggleRow('confirmOnExit', 'Confirmar ao sair', 'confirmOnExit — pergunta antes de fechar com alterações'));
      el.appendChild(toggleRow('showSideButtons', 'Botões laterais', 'showSideButtons — mostra a barra de ícones'));
      el.appendChild(toggleRow('fullscreen', 'Tela cheia', 'Oculta barras do sistema (quando suportado)', v => { try { v ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.(); } catch (_) {} }));
      el.appendChild(toggleRow('floatingButton', 'Botão flutuante', 'Atalho flutuante do QuickTools', v => $('#qtFab').style.display = v === false ? 'none' : ''));
      el.appendChild(toggleRow('rememberFiles', 'Lembrar arquivos', 'rememberFiles — restaura abas ao abrir'));
      el.appendChild(toggleRow('checkForAppUpdates', 'Verificar atualizações', 'checkForAppUpdates na inicialização'));
      el.appendChild(toggleRow('developerMode', 'Modo desenvolvedor', 'Logs extras e selo DEV no Sobre'));
      sect(el, 'Aparência');
      el.appendChild(segRow('Animações', 'animation', [['system', 'Sistema'], ['on', 'Ligadas'], ['off', 'Desligadas'], ['reduced', 'Reduzidas']], v => { S.reduceMotion = (v === 'off' || v === 'reduced'); applySettings(); }));
      el.appendChild(toggleRow('reduceMotion', 'Reduzir animações', 'Desativa animações para economizar bateria', () => applySettings()));
      el.appendChild(rangeRow('Zoom da interface', 'uiZoom', 80, 130, 5, v => v + '%', v => document.body.style.fontSize = (14 * v / 100) + 'px'));
      sect(el, 'QuickTools');
      el.appendChild(segRow('Linhas do QuickTools', 'quickTools', [[0, 'Oculto'], [1, '1 linha'], [2, '2 linhas']], () => applySettings()));
      el.appendChild(segRow('Posição das abas', 'openFileListPos', [['header', 'Topo'], ['bottom', 'Embaixo']], v => moveTabs(v)));
      sect(el, 'Salvamento');
      el.appendChild(segRow('Autosave', 'autosave', [[0, 'Off'], [5, '5s'], [15, '15s'], [30, '30s'], [60, '60s']], () => setupAutosave()));
      note(el, '<b>Dica:</b> todas as alterações são salvas automaticamente no dispositivo (localStorage).');
    });
  },
  editor() {
    Page.open('editor', 'Configurações do editor', el => {
      sect(el, 'Fonte');
      el.appendChild(rangeRow('Tamanho da fonte', 'fontSize', 10, 24, 0.5, v => v, () => { applySettings(); renderEditor(); }));
      el.appendChild(selectRow('Fonte do editor', 'editorFont', [['Roboto Mono', 'Roboto Mono'], ['Fira Code', 'Fira Code'], ['JetBrains Mono', 'JetBrains Mono'], ['monospace', 'Monospace (sistema)']], () => { applySettings(); renderEditor(); }));
      el.appendChild(rangeRow('Altura da linha', 'lineHeight', 1.2, 2.2, 0.05, v => (+v).toFixed(2), () => { applySettings(); renderEditor(); }));
      sect(el, 'Exibição');
      el.appendChild(toggleRow('linenumbers', 'Números de linha', 'linenumbers', () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('relativeLineNumbers', 'Linhas relativas', 'relativeLineNumbers — distância até o cursor', () => renderEditor()));
      el.appendChild(toggleRow('minimap', 'Minimap', 'Miniatura do código na lateral', () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('highlightActiveLine', 'Destacar linha atual', 'highlightActiveLine', () => renderEditor()));
      el.appendChild(toggleRow('textWrap', 'Quebra de linha', 'textWrap — ajusta linhas longas', () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('colorPreview', 'Prévia de cores', 'colorPreview — mostra chip em #hex/rgb', () => renderEditor()));
      sect(el, 'Indentação');
      el.appendChild(segRow('Tamanho do Tab', 'tabSize', [[2, '2'], [4, '4'], [8, '8']], () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('softTab', 'Tab com espaços', 'softTab — insere espaços em vez de \\t'));
      el.appendChild(toggleRow('autoIndent', 'Indentação automática', 'autoIndent ao pressionar Enter'));
      sect(el, 'Inteligência');
      el.appendChild(toggleRow('liveAutoCompletion', 'Autocompletar', 'liveAutoCompletion — sugestões ao digitar'));
      el.appendChild(toggleRow('localWordCompletion', 'Completar palavras locais', 'localWordCompletion — usa palavras do arquivo'));
      el.appendChild(toggleRow('autoCloseBrackets', 'Fechar colchetes', 'autoCloseBrackets — () [] {} "" automaticamente'));
      el.appendChild(toggleRow('autoCloseTags', 'Fechar tags HTML', 'autoCloseTags — completa </tag>'));
      el.appendChild(toggleRow('bracketMatching', 'Casamento de colchetes', 'bracketMatching — mostra o par na barra de status'));
      sect(el, 'Formatação');
      el.appendChild(toggleRow('formatOnSave', 'Formatar ao salvar', 'formatOnSave com o formatador da linguagem'));
      const row = document.createElement('div'); row.className = 'btn-row';
      row.innerHTML = '<button class="big-btn primary">Formatar arquivo atual</button>';
      row.querySelector('button').onclick = () => { Page.close(); formatActive(); };
      el.appendChild(row);
    });
  },
  terminal() {
    Page.open('termset', 'Configurações do Terminal', el => {
      sect(el, 'Aparência');
      el.appendChild(rangeRow('Tamanho da fonte', 'termFontSize', 10, 20, 0.5, v => v, () => { if (Panel.current === 'terminal') Panel.render(); }));
      el.appendChild(selectRow('Tema do terminal', 'termTheme', [['dark', 'Dark'], ['green', 'Green phosphor'], ['amber', 'Amber'], ['light', 'Light'], ...(Plugins.isInstalled('terminal-pro') ? [['pro-green', 'Pro Green ✦'], ['pro-amber', 'Pro Amber ✦'], ['pro-purple', 'Pro Purple ✦']] : [])], v => applyTermTheme()));
      el.appendChild(toggleRow('cursorBlink', 'Cursor piscante', 'Anima o cursor do terminal', () => applyTermTheme()));
      sect(el, 'Sessão');
      el.appendChild(rangeRow('Tamanho do histórico', 'termHistory', 50, 1000, 50, v => v + ' cmds'));
      el.appendChild(selectRow('Shell', 'termShell', [['sh', 'sh (Alpine)'], ['bash', 'bash']]));
      note(el, 'O terminal opera sobre os mesmos arquivos do editor: <b>ls, cd, cat, touch, mkdir, echo &gt; arq</b> são reais.');
    });
  },
  preview() {
    Page.open('prevset', 'Configurações da pré-visualização', el => {
      sect(el, 'Modo');
      el.appendChild(segRow('Preview Mode', 'previewMode', [['inapp', 'In-App'], ['browser', 'Browser']]));
      el.appendChild(toggleRow('useCurrentFileForPreview', 'Usar arquivo atual', 'useCurrentFileForPreview para o Preview'));
      el.appendChild(toggleRow('disableCache', 'Desativar cache', 'disableCache — sempre recarrega'));
      sect(el, 'Servidor');
      el.appendChild(textRow('Host', 'host'));
      el.appendChild(textRow('Server port', 'serverPort', 'number'));
      el.appendChild(textRow('Preview port', 'previewPort', 'number'));
      note(el, `Preview real: os HTML são renderizados no próprio navegador (srcdoc com sandbox).`);
    });
  },
  theme() {
    Page.open('theme', 'Tema', el => {
      sect(el, 'Tema do aplicativo');
      const grid = document.createElement('div');
      grid.className = 'theme-grid';
      THEMES.forEach(t => {
        const c = document.createElement('div');
        c.className = 'theme-card' + (S.appTheme === t.id ? ' sel' : '');
        c.innerHTML = `<div class="theme-prev" style="background:${t.bg}"><div class="tp-bar" style="background:${t.bar}"></div><div class="tp-l1" style="background:${t.acc}"></div><div class="tp-l2" style="background:${t.bar}"></div><div class="tp-dot" style="background:${t.acc}"></div></div><div class="theme-name">${esc(t.name)}</div>`;
        c.onclick = () => { S.appTheme = t.id; applySettings(); Store.save(); toast('Tema alterado: ' + t.name, 'palette'); clog('INFO', 'Theme: ' + t.id); Page.rerender(); };
        grid.appendChild(c);
      });
      el.appendChild(grid);
      sect(el, 'Tema do editor');
      const list = document.createElement('div');
      list.className = 'opt-list';
      EDITOR_THEMES.forEach(t => {
        const o = document.createElement('div');
        o.className = 'opt-row' + (S.editorTheme === t.id ? ' sel' : '');
        o.innerHTML = `<span class="radio"></span>${esc(t.name)}`;
        o.onclick = () => { S.editorTheme = t.id; applySettings(); Store.save(); renderEditor(); toast('Tema do editor: ' + t.name, 'palette'); Page.rerender(); };
        list.appendChild(o);
      });
      el.appendChild(list);
    });
  },
  appIcon() {
    Page.open('appicon', 'Ícone do aplicativo', el => {
      sect(el, 'Escolha o ícone');
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      APP_ICONS.forEach(a => {
        const d = document.createElement('div');
        d.className = 'appicon' + (State.appIcon === a.id ? ' sel' : '');
        d.style.background = a.bg;
        d.innerHTML = icon('logo', `color:${a.fg}`);
        d.onclick = () => { State.appIcon = a.id; applyAppIcon(); Store.save(); toast('Ícone atualizado', 'check'); Page.rerender(); };
        grid.appendChild(d);
      });
      el.appendChild(grid);
      note(el, 'Ícone aplicado ao menu/splash do app e ao PWA instalado (real).');
    });
  },
  formatter() {
    Page.open('formatter', 'Formatador', el => {
      sect(el, 'Por linguagem');
      const langs = [['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript'], ['json', 'JSON'], ['py', 'Python'], ['php', 'PHP']];
      if (!S.formatter) S.formatter = {};
      langs.forEach(([id, name]) => {
        const wrap = document.createElement('div');
        wrap.className = 'txt-row';
        const cur = S.formatter[id] || 'prettier';
        wrap.innerHTML = `<label>${name}</label><select data-l="${id}">${['prettier', 'beautify', 'none'].map(f => `<option${f === cur ? ' selected' : ''}>${f}</option>`).join('')}</select>`;
        wrap.querySelector('select').onchange = e => { S.formatter[id] = e.target.value; Store.save(); toast(`${name}: ${e.target.value}`, 'wand'); };
        el.appendChild(wrap);
      });
      el.appendChild(toggleRow('formatOnSave', 'Formatar ao salvar', 'formatOnSave'));
      const row = document.createElement('div'); row.className = 'btn-row';
      row.innerHTML = '<button class="big-btn primary">Formatar arquivo atual</button>';
      row.querySelector('button').onclick = () => { Page.close(); formatActive(); };
      el.appendChild(row);
    });
  },
  lsp() {
    Page.open('lsp', 'Language servers', el => {
      sect(el, 'Servidores');
      const servers = [['ts', 'TypeScript'], ['py', 'Python (pyright)'], ['php', 'PHP (intelephense)'], ['java', 'Java'], ['cpp', 'C/C++ (clangd)'], ['html', 'HTML'], ['css', 'CSS'], ['json', 'JSON']];
      if (!S.lsp) S.lsp = {};
      servers.forEach(([id, name]) => {
        const on = S.lsp[id] !== false;
        const b = document.createElement('div');
        b.className = 'set-row'; b.style.cursor = 'pointer';
        b.innerHTML = `${icon('zap')}<div class="grow"><div class="t">${name}</div><div class="s">${on ? '● ativo (dicionário local real)' : '○ inativo'}</div></div><div class="switch${on ? ' on' : ''}"></div>`;
        b.onclick = () => {
          S.lsp[id] = !on; Store.save();
          toast(`${name} ${!on ? 'conectado' : 'desconectado'}`, 'zap');
          clog('INFO', `LSP ${id}: ${!on ? 'connected' : 'disconnected'}`);
          Page.rerender();
        };
        el.appendChild(b);
      });
      note(el, 'Autocomplete/diagnóstico atual: dicionário local real do editor. LSP completo requer backend — não simulado.');
    });
  },
  backup() {
    Page.open('backup', 'Backup & Restaurar', el => {
      sect(el, 'Backup');
      let size = 0;
      try { size = (localStorage.getItem(LS_KEY) || '').length; } catch (_) {}
      note(el, `<b>Armazenamento local:</b> ${fmtSize(size)}<br>Inclui arquivos, abas, plugins, tema, configurações e históricos.`);
      const r1 = document.createElement('div'); r1.className = 'btn-row';
      r1.innerHTML = '<button class="big-btn primary">Exportar backup (.json)</button>';
      r1.querySelector('button').onclick = () => {
        Store.save();
        setTimeout(() => {
          const blob = new Blob([localStorage.getItem(LS_KEY) || '{}'], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `thcode-backup-${Date.now()}.json`;
          a.click();
          toast('Backup exportado', 'backup');
          clog('INFO', 'Backup exported');
        }, 450);
      };
      el.appendChild(r1);
      const r2 = document.createElement('div'); r2.className = 'btn-row';
      r2.innerHTML = '<button class="big-btn">Restaurar de arquivo</button>';
      r2.querySelector('button').onclick = () => {
        const fi = $('#hiddenFileInput');
        fi.accept = '.json'; fi.webkitdirectory = false;
        fi.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = () => {
            try {
              const data = JSON.parse(rd.result);
              if (!data.settings || !data.fs) throw 0;
              localStorage.setItem(LS_KEY, JSON.stringify(data));
              toast('Backup restaurado — recarregando', 'backup');
              setTimeout(() => location.reload(), 900);
            } catch (_) { toast('Arquivo de backup inválido', 'info'); }
          };
          rd.readAsText(f); fi.value = '';
        };
        fi.click();
      };
      el.appendChild(r2);
    });
  },
  settingsJson() {
    if (!fExists('__settings__.json')) fSet('__settings__.json', JSON.stringify(S, null, 2));
    else fSet('__settings__.json', JSON.stringify(S, null, 2));
    Page.close();
    openFile('__settings__.json');
    toast('Edite e salve para aplicar', 'edit');
  },
  async reset() {
    const ok = await dConfirm('Restaurar configuração original', 'Apagar <b>todos</b> os dados locais (arquivos, plugins, tema, configurações) e voltar ao padrão?', 'Restaurar');
    if (!ok) return;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    toast('Configuração restaurada', 'history');
    setTimeout(() => location.reload(), 800);
  },
  about() {
    Page.open('about', 'Sobre', el => {
      el.innerHTML = `<div class="about-hero"><div class="drawer-logo" id="aboutLogo">${icon('logo', 'color:#fff')}</div>
        <h2>Acode ${S.developerMode ? '<span style="font-size:10px;background:var(--accent);color:#fff;border-radius:5px;padding:2px 7px;vertical-align:3px">DEV</span>' : ''}</h2>
        <p>powerful text/code editor for android</p></div>`;
      const rows = [
        ['info', 'Versão', APP_VER],
        ['terminal', 'Plataforma', (navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform || 'web') + ' (real)'],
        ['globe', 'Núcleos CPU', (navigator.hardwareConcurrency || '?') + ' (real)'],
        ['files', 'Idioma', S.lang || 'pt-BR'],
        ['files', 'Base Acode', ACODE_BASE],
        ['puzzle', 'Plugins instalados', Object.keys(Plugins.installed).length + ''],
        ['heart', 'Licença', 'MIT — Thcode • base Acode']
      ];
      rows.forEach(([ic, t, s]) => {
        const d = document.createElement('div');
        d.className = 'set-row';
        d.innerHTML = `${icon(ic)}<div class="grow"><div class="t">${t}</div><div class="s">${esc(s)}</div></div>`;
        el.appendChild(d);
      });
      const r = document.createElement('div'); r.className = 'btn-row';
      r.innerHTML = '<button class="big-btn">Website</button><button class="big-btn">GitHub</button>';
      r.children[0].onclick = () => window.open('https://acode.foxdebug.com', '_blank');
      r.children[1].onclick = () => window.open(THCODE_REPO, '_blank');
      el.appendChild(r);
      applyAppIcon();
    });
  },
  sponsor() {
    Page.open('sponsor', 'Patrocinador', el => {
      note(el, '<b>Support ongoing Thcode development.</b><br>O Thcode é gratuito e open-source (MIT). Considere apoiar os desenvolvedores.');
      const r = document.createElement('div'); r.className = 'btn-row';
      r.innerHTML = '<button class="big-btn primary">Patrocinar ❤</button>';
      r.querySelector('button').onclick = () => { toast('Obrigado pelo apoio! ❤', 'heart'); clog('INFO', 'Sponsor clicked'); };
      el.appendChild(r);
    });
  },
  changelog() {
    Page.open('changelog', 'Registro de Alterações', el => {
      const vers = [
        { v: '2.0.0', tag: 'ATUAL', d: '2026-09-28', items: ['Thcode: nova identidade open-source (MIT)', 'Páginas de detalhes e configurações por plugin', 'Navegador de preview com Devices e Disable Cache', 'Terminal bash com pipes, variáveis e redirecionamento', 'Conectores reais: GitHub e OpenRouter', 'Contas locais, métricas, diagnóstico e serviços'] },
        { v: '1.13.5', d: '2026-09-20', items: ['Novo terminal Alpine com suporte a apk', 'AI Assistant Beta integrado', 'Melhorias de desempenho na inicialização', 'Correções de estabilidade no editor'] },
        { v: '1.13.4', d: '2026-08-30', items: ['Novos temas: Bling, Moon e Tomyris', 'QuickTools personalizável', 'Correção no preview in-app'] },
        { v: '1.13.0', d: '2026-07-12', items: ['Language servers (LSP)', 'Gerenciador de fontes', 'Backup & Restore'] },
        { v: '1.12.2', d: '2026-05-02', items: ['Correções de bugs', 'Traduções atualizadas (pt-BR)'] }
      ];
      vers.forEach(x => {
        const d = document.createElement('div');
        d.className = 'cl-ver';
        d.innerHTML = `<h4>v${x.v}${x.tag ? `<span class="tag">${x.tag}</span>` : ''}</h4><div class="date">${x.d}</div><ul>${x.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
        el.appendChild(d);
      });
    });
  },
  rate() {
    dialog({
      title: 'Avaliar Thcode', body: '<p style="margin:6px 0 10px">Rate Acode on Google Play.</p><div id="stars" style="font-size:34px;text-align:center;letter-spacing:6px;cursor:pointer">★★★★★</div>',
      buttons: [{ label: 'Depois', value: false }, { label: 'Avaliar', primary: true, value: true }],
      onMount: () => {
        const st = $('#stars');
        let n = 5;
        const paint = () => st.innerHTML = '★★★★★'.split('').map((s, i) => `<span style="color:${i < n ? 'var(--yellow)' : 'var(--surface4)'}">★</span>`).join('');
        paint();
        st.onclick = e => { const i = [...st.children].indexOf(e.target.closest('span')); if (i >= 0) { n = i + 1; paint(); vibrate(8); } };
      }
    }).then(r => { if (r) { toast('Avaliação salva no seu dispositivo (sem envio — Play Store requer publicação)', 'star'); clog('INFO', 'App rated locally'); } });
  },
  adfree() {
    Page.open('adfree', 'Sem anúncios', el => {
      note(el, '<b>Anúncio com recompensa real requer AdMob/AdSense</b> (unidade de anúncio própria).<br>Indisponível até configurar uma conta de anúncios — nada é simulado aqui.<br><br>A alternativa real é o Thcode PRO (pagamento Stripe).');
      const box = document.createElement('div');
      box.innerHTML = '<div class="btn-row"><button class="big-btn primary" id="proBtn2">Ver Thcode PRO</button></div>';
      el.appendChild(box);
      box.querySelector('#proBtn2').onclick = () => State.removeAds ? State.removeAds() : drawerItem();
    });
  },
  removeAds() {
    const srv = window.ThcodeServer;
    if (!(srv && srv.isUp())) {
      dialog({ title: 'Pagamento indisponível', body: '<p style="margin:6px 0">O checkout real usa <b>Stripe</b> pelo backend (STRIPE_SECRET_KEY).<br><br>Conecte um backend com Stripe configurado em <b>Servidor → Conectar</b>.</p>', buttons: [{ label: 'OK', value: true }] });
      return;
    }
    dialog({
      title: 'Thcode PRO — R$ 19,90',
      body: '<p style="margin:6px 0">Pagamento único via <b>Stripe Checkout</b> (real).<br><span style="color:var(--muted);font-size:12px">Se o Stripe não estiver configurado no backend, você verá o erro real.</span></p>',
      buttons: [{ label: 'Cancelar', value: false }, { label: 'Pagar com Stripe', primary: true, value: true }]
    }).then(async r => {
      if (!r) return;
      try {
        const res = await srv.api('POST', '/api/billing/checkout', { origin: location.origin });
        if (res.url) { location.href = res.url; clog('INFO', 'Stripe checkout: ' + res.id); }
        else throw new Error(res.error || 'sem URL de checkout');
      } catch (e) { toast('Erro real: ' + e.message.slice(0, 70), 'close'); }
    });
  },
  promo(name, desc) {
    Page.open('promo', name, el => {
      el.innerHTML = `<div class="about-hero"><div class="drawer-logo">${icon('logo', 'color:#fff')}</div><h2>${esc(name)}</h2><p>${esc(desc)}</p></div>`;
      const r = document.createElement('div'); r.className = 'btn-row';
      r.innerHTML = '<button class="big-btn primary">Baixar APK (GitHub Releases)</button>';
      r.querySelector('button').onclick = () => window.open('https://github.com/rlkbiloga-coder/Thcode/releases', '_blank', 'noopener');
      el.appendChild(r);
    });
  },
  help() {
    Page.open('help', 'Ajuda', el => {
      sect(el, 'Atalhos de teclado');
      [['Ctrl+S', 'Salvar arquivo'], ['Ctrl+F', 'Localizar'], ['Ctrl+H', 'Localizar e substituir'], ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'], ['Ctrl+Shift+P', 'Command Palette'], ['Esc', 'Fechar painel/menu']].forEach(([k, d]) => {
        const r = document.createElement('div');
        r.className = 'set-row';
        r.innerHTML = `${icon('keyboard')}<div class="grow"><div class="t">${d}</div></div><span class="kbd" style="font-family:var(--font-code);font-size:11px;background:var(--surface3);padding:3px 8px;border-radius:6px">${k}</span>`;
        el.appendChild(r);
      });
      sect(el, 'Gestos mobile');
      [['Deslize rápido nas abas', 'Troca de arquivo'], ['Deslize da borda esquerda', 'Abre o menu'], ['Pinça no editor', 'Zoom da fonte'], ['Toque longo em arquivo', 'Menu de contexto'], ['Toque longo na aba', 'Opções da aba']].forEach(([g, d]) => {
        const r = document.createElement('div');
        r.className = 'set-row';
        r.innerHTML = `${icon('info')}<div class="grow"><div class="t">${g}</div><div class="s">${d}</div></div>`;
        el.appendChild(r);
      });
      note(el, 'Dúvidas? Visite <b>acode.foxdebug.com/docs</b> ou o <b>Discord</b> da comunidade.');
    });
  }
};
/* ---- misc: tabs position, autosave, term theme, app icon, formatter ---- */
function moveTabs(pos) {
  const tabs = $('#tabs');
  if (pos === 'bottom') {
    let slot = $('#tabsBottom');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'tabsBottom';
      slot.className = 'no-select';
      slot.style.cssText = 'flex:none;display:flex;height:40px;background:var(--surface);border-top:1px solid var(--line);padding:4px;';
      $('#app').insertBefore(slot, $('#quicktools'));
    }
    slot.appendChild(tabs);
    tabs.style.flex = '1';
  } else {
    $('.topbar').insertBefore(tabs, $('#newTabBtn'));
    tabs.style.flex = '';
    $('#tabsBottom')?.remove();
  }
  renderTabs();
}
let autosaveIv = null;
function setupAutosave() {
  clearInterval(autosaveIv);
  if (S.autosave > 0) {
    autosaveIv = setInterval(() => {
      if (T.active) Ed.snapshot(T.active);
      const dirty = Object.keys(T.dirty);
      if (dirty.length) { dirty.forEach(p => saveFileSilent(p)); toast('Autosave: ' + dirty.length + ' arquivo(s)', 'save'); }
    }, S.autosave * 1000);
  }
}
function saveFileSilent(p) {
  const content = p === T.active ? Ed.value() : Ed.currentContent(p);
  fSet(p, content);
  delete T.dirty[p];
  renderTabs(); updateCrumb();
}
function applyTermTheme() {
  let st = $('#termThemeStyle');
  if (!st) { st = document.createElement('style'); st.id = 'termThemeStyle'; document.head.appendChild(st); }
  const themes = {
    dark: ['#0a0c10', '#d6dce4'], green: ['#031007', '#7ee787'],
    amber: ['#100a02', '#e3b341'], light: ['#f6f8fa', '#24292f'],
    'pro-green': ['#02120a', '#00ff9d'], 'pro-amber': ['#170b00', '#ffb020'], 'pro-purple': ['#0e0618', '#c084fc']
  };
  const [bg, fg] = themes[S.termTheme] || themes.dark;
  st.textContent = `.term,.term-in-row{background:${bg}!important;color:${fg}}.term-in{color:${fg}!important}.term-out{color:${fg}}${S.cursorBlink === false ? '.term-cursor{animation:none}' : ''}`;
}
function applyAppIcon() {
  const a = APP_ICONS.find(x => x.id === State.appIcon) || APP_ICONS[0];
  $$('.drawer-logo').forEach(d => { d.style.background = a.bg; });
}
function formatCode(content, lang) {
  if (lang === 'json') {
    try { const tw = (S.pluginSettings && S.pluginSettings.prettier && S.pluginSettings.prettier.tabWidth) || 2; return JSON.stringify(JSON.parse(content), null, tw) + '\n'; } catch (_) { return content; }
  }
  return content.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/\s*$/, '\n');
}
function formatActive() {
  if (!T.active) { toast('Nenhum arquivo aberto', 'info'); return; }
  Ed.pushUndo(T.active, Ed.value());
  Ed.setValue(formatCode(Ed.value(), detectLang(T.active)));
  Ed.onEdit(false);
  toast('Arquivo formatado', 'wand');
  clog('INFO', 'Format: ' + T.active);
}
function applySettingsJson(text) {
  try {
    const obj = JSON.parse(text);
    let n = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (k in DEFAULT_SETTINGS && typeof v === typeof DEFAULT_SETTINGS[k]) { S[k] = v; n++; }
    }
    applySettings(); setupAutosave(); moveTabs(S.openFileListPos === 'bottom' ? 'bottom' : 'header'); renderEditor();
    toast(`${n} configurações aplicadas`, 'settings');
    clog('INFO', 'settings.json applied');
  } catch (e) { toast('settings.json inválido: ' + e.message, 'info'); }
}

/* ============================== DRAWER ============================== */
const Drawer = {
  sel: 'files',
  isOpen() { return $('#drawer').classList.contains('open'); },
  open() { $('#drawer').classList.remove('hidden'); $('#scrim').classList.remove('hidden'); requestAnimationFrame(() => { $('#drawer').classList.add('open'); $('#scrim').classList.add('show'); }); },
  close() { $('#drawer').classList.remove('open'); $('#scrim').classList.remove('show'); setTimeout(() => { $('#drawer').classList.add('hidden'); if ($('#fileMenu').classList.contains('hidden')) $('#scrim').classList.add('hidden'); }, 260); },
  render() {
    const body = $('#drawerBody');
    const appIcon = APP_ICONS.find(x => x.id === State.appIcon) || APP_ICONS[0];
    document.querySelector('#drawer .drawer-logo').style.background = appIcon.bg;
    const secs = [
      { t: 'Arquivo', items: [
        { ic: 'file', t: 'Abrir arquivo', fn: () => pickImport(false) },
        { ic: 'files', t: 'Abrir pasta', fn: () => pickImport(true) },
        { ic: 'terminal', t: 'Terminal', fn: () => Panel.open('terminal') },
        { ic: 'clock', t: 'Arquivos recentes', fn: () => recentDialog() },
        { ic: 'cmd', t: 'Open Command Palette', fn: () => Palette.open() }
      ]},
      { t: 'Configure', items: [
        { ic: 'settings', t: 'Configurações', fn: () => SettingsPage.open() },
        { ic: 'palette', t: 'Change Theme', fn: () => SettingsPage.theme() },
        { ic: 'puzzle', t: 'Explorar Plugins', fn: () => Panel.open('plugins') },
        { ic: 'globe', t: 'Serviços', fn: () => SettingsPage.services() }
      ]},
      { t: 'Learn', items: [
        { ic: 'help', t: 'Ajuda', fn: () => SettingsPage.help() },
        { ic: 'info', t: 'Sobre', fn: () => SettingsPage.about() },
        { ic: 'star', t: 'Descobrir', fn: () => SettingsPage.discover() }
      ]},
      { t: 'Connect', items: [
        { ic: 'globe', t: 'Website', fn: () => window.open('https://acode.foxdebug.com', '_blank') },
        { ic: 'discord', t: 'Discord', fn: () => window.open('https://acode.foxdebug.com', '_blank') },
        { ic: 'github', t: 'GitHub', fn: () => window.open(THCODE_REPO, '_blank') },
        { ic: 'telegram', t: 'Telegram', fn: () => window.open('https://acode.foxdebug.com', '_blank') }
      ]}
    ];
    body.innerHTML = '';
    secs.forEach(s => {
      const d = document.createElement('div');
      d.className = 'drawer-sect'; d.textContent = s.t;
      body.appendChild(d);
      s.items.forEach(it => {
        const b = document.createElement('button');
        b.className = 'drawer-item';
        b.innerHTML = `${icon(it.ic)}<span>${esc(it.t)}</span>`;
        b.onclick = () => { this.close(); vibrate(6); setTimeout(it.fn, 120); };
        body.appendChild(b);
      });
    });
  },
  init() {
    this.render();
    $('#menuBtn').onclick = () => { this.render(); this.open(); };
    $('#drawerClose').onclick = () => this.close();
  }
};
function recentDialog() {
  const items = Recent.list.filter(fExists);
  if (!items.length) { toast('Nenhum arquivo recente', 'clock'); return; }
  dList('Abrir recentes', items.map(f => ({ label: baseName(f), hint: dirName(f), value: f }))).then(v => { if (v) openFile(v); });
}

/* ============================== FILE MENU POPUP ============================== */
const FileMenu = {
  items() {
    return [
      { ic: 'file', t: 'Novo arquivo', fn: () => newFile() },
      { ic: 'save', t: 'Salvar', fn: () => saveFile() },
      { ic: 'save', t: 'Salvar como', fn: () => saveAs() },
      { ic: 'files', t: 'Arquivos', fn: () => Panel.open('files') },
      { ic: 'close', t: 'Fechar arquivo', fn: () => T.active && closeTab(T.active) },
      { ic: 'clock', t: 'Abrir recentes', fn: () => recentDialog() },
      { ic: 'search', t: 'Achar arquivo', fn: () => quickOpen() },
      { ic: 'console', t: 'Console', fn: () => ConsolePage.open() },
      { ic: 'terminal', t: 'Terminal', fn: () => Panel.open('terminal') },
      { ic: 'grid', t: 'Running processes', fn: () => Procs.open() },
      { sep: true },
      { ic: 'settings', t: 'Configurações', fn: () => SettingsPage.open() },
      { ic: 'help', t: 'Ajuda', fn: () => SettingsPage.help() },
      { sep: true },
      { ic: 'exit', t: 'Sair', fn: () => doExit() }
    ];
  },
  toggle() {
    const m = $('#fileMenu');
    if (!m.classList.contains('hidden')) { m.classList.add('hidden'); return; }
    m.innerHTML = '';
    this.items().forEach(it => {
      if (it.sep) { const s = document.createElement('div'); s.className = 'popup-sep'; m.appendChild(s); return; }
      const b = document.createElement('button');
      b.className = 'popup-item';
      b.innerHTML = `<span>${esc(it.t)}</span>${icon(it.ic)}`;
      b.onclick = () => { m.classList.add('hidden'); vibrate(6); setTimeout(it.fn, 60); };
      m.appendChild(b);
    });
    m.classList.remove('hidden');
  },
  init() {
    $('#overflowBtn').onclick = e => { e.stopPropagation(); this.toggle(); };
    document.addEventListener('pointerdown', e => {
      if (!$('#fileMenu').classList.contains('hidden') && !e.target.closest('#fileMenu') && !e.target.closest('#overflowBtn')) $('#fileMenu').classList.add('hidden');
    });
  }
};
async function doExit() {
  if (S.confirmOnExit && Object.keys(T.dirty).length) {
    const r = await dConfirm('Sair', 'Existem alterações não salvas. Salvar tudo antes de sair?', 'Salvar tudo');
    if (r === null) return;
    if (r) Object.keys(T.dirty).forEach(p => saveFileSilent(p));
  }
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#14181d;z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff';
  ov.innerHTML = `<div style="width:84px;height:84px;border-radius:22px;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center">${icon('logo', 'width:56px;height:48px;color:#fff')}</div>
    <div style="font-size:17px;font-weight:700">Thcode encerrado</div>
    <div style="color:#9aa1ad;font-size:13px">Sessão salva localmente</div>
    <button id="rebootBtn" style="background:var(--accent);color:#fff;font-weight:700;padding:12px 34px;border-radius:24px;margin-top:8px">Reiniciar</button>`;
  document.body.appendChild(ov);
  ov.querySelector('#rebootBtn').onclick = () => location.reload();
}

/* ============================== ACCOUNT ============================== */
function accountDialog() { Auth.dialog(); return; } function accountDialogLegacy() {
  const name = GH.user || 'Convidado';
  dialog({
    title: 'Conta',
    body: `<div style="display:flex;align-items:center;gap:12px;margin:8px 0"><div class="avatar" style="width:46px;height:46px;font-size:20px">${esc(name[0].toUpperCase())}</div>
      <div><b style="font-size:16px">${esc(name)}</b><br><span style="color:var(--muted);font-size:12px">${State.pro ? '👑 Thcode PRO' : 'Plano gratuito'}${State.adfree ? ' • ad-free' : ''}</span></div></div>`,
    buttons: [
      { label: GH.user ? 'Sair do GitHub' : 'GitHub', action: () => { if (GH.user) { GH.user = null; Store.save(); toast('Desconectado', 'github'); } else Panel.open('github'); } },
      { label: State.pro ? 'PRO ✓' : 'Ativar PRO', primary: true, action: () => { if (!State.pro) SettingsPage.removeAds(); } }
    ]
  });
}

/* ============================== GESTURES ============================== */
function swipeable(el, onLeft, onRight, threshold = 60) {
  let x0 = 0, y0 = 0, t0 = 0;
  el.addEventListener('touchstart', e => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); }, { passive: true });
  el.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
    if (dt < 350 && Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && onLeft) onLeft(); else if (dx > 0 && onRight) onRight();
    }
  }, { passive: true });
}
function cycleTab(dir) {
  if (T.open.length < 2) return;
  const i = T.open.indexOf(T.active);
  const n = (i + dir + T.open.length) % T.open.length;
  setActiveFile(T.open[n]);
  vibrate(8);
}
function initGestures() {
  swipeable($('#tabs'), () => cycleTab(1), () => cycleTab(-1), 70);
  swipeable($('#panel'), () => Panel.close(), null, 80);
  // borda esquerda abre drawer
  let ex = 0, et = 0;
  document.addEventListener('touchstart', e => { if (e.touches.length === 1 && e.touches[0].clientX < 26) { ex = e.touches[0].clientX; et = Date.now(); } else ex = -1; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (ex >= 0 && Date.now() - et < 400 && e.changedTouches[0].clientX - ex > 70 && !Drawer.isOpen() && $('#pageRoot').classList.contains('hidden')) Drawer.open();
  }, { passive: true });
  swipeable($('#drawer'), () => Drawer.close(), null, 70);
  // pinça no editor = zoom da fonte
  const wrap = $('#editorWrap');
  let d0 = 0, z0 = 100;
  wrap.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      z0 = S.editorZoom || 100;
    }
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && d0 > 0) {
      if (!Plugins.isInstalled('pinch-zoom')) return;
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const z = clamp(Math.round(z0 * d / d0), 50, 250);
      if (z !== S.editorZoom) { S.editorZoom = z; applySettings(); renderEditor(); Store.save(); }
    }
  }, { passive: false });
}

/* ============================== STATUSBAR / TICKERS ============================== */
function tickClock() {}
function tickNet() {}

/* ============================== BOOT ============================== */
function restore() {
  const d = Store.load();
  if (!d) {
    seedFS();
    T.open = ['/MeuJarvis/index.html', '/MeuJarvis/app.lua', '/MeuJarvis/script.js'];
    T.active = '/MeuJarvis/index.html';
    return false;
  }
  try {
    S = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
    FS = d.fs && d.fs.files ? d.fs : FS;
    if (!FS.dirs) FS.dirs = ['/MeuJarvis'];
    if (S.rememberFiles !== false && d.tabs && d.tabs.open) {
      T.open = d.tabs.open.filter(fExists);
      T.active = fExists(d.tabs.active) ? d.tabs.active : (T.open[0] || null);
    } else {
      T.open = fExists('/MeuJarvis/index.html') ? ['/MeuJarvis/index.html'] : [];
      T.active = T.open[0] || null;
    }
    Recent.list = (d.recent || []).filter(fExists);
    Favs.list = (d.favs || []).filter(fExists);
    if (d.plugins) Plugins.installed = d.plugins;
    if (d.notifs) Notifs.list = d.notifs;
    if (d.agentMsgs) AI.agentMsgs = d.agentMsgs;
    if (d.aiChats) { AI.chats = d.aiChats; AI.chatId = AI.chats[0]?.id || null; }
    if (d.termHist) Term.hist = d.termHist;
    if (d.procs) Procs.list = d.procs;
    if (d.gh) GH.user = d.gh;
    if (d.cwd && (dExists(d.cwd) || d.cwd === '/')) Term.cwd = d.cwd;
    if (d.panel) Panel.current = d.panel;
    State.pro = !!d.pro; State.adfree = !!d.adfree; State.appIcon = d.appIcon || 'default';
    Panel._restoredOpen = !!d.panelOpen;
    return true;
  } catch (_) { seedFS(); return false; }
}
function boot() {
  const splash = $('#splash'), fill = $('#splashBarFill'), status = $('#splashStatus');
  const steps = [
    ['Securing SFTP profiles...', 18], ['Loading settings.json...', 38],
    ['Loading plugins...', 58], ['Restoring session...', 78], ['Ready', 100]
  ];
  // init tudo antes de revelar
  const had = restore();
  Ed.init(); QT.build(); Find.init(); Palette.init(); Panel.init(); Page.init(); Drawer.render();
  $('#menuBtn').onclick = () => { Drawer.render(); Drawer.open(); };
  $('#drawerClose').onclick = () => Drawer.close();
  $('#scrim').onclick = () => { Drawer.close(); $('#fileMenu').classList.add('hidden'); };
  $('#newTabBtn').onclick = () => newFile();
  FileMenu.init();
  $('#avatarBtn').onclick = () => accountDialog();
  $('#qtFab').onclick = () => { $('#quicktools').classList.toggle('collapsed'); $('#qtFab').textContent = $('#quicktools').classList.contains('collapsed') ? '⌃' : '⌄'; };
  if (S.floatingButton === false) $('#qtFab').style.display = 'none';
  applySettings(); applyTermTheme(); applyAppIcon(); setupAutosave();
  if (S.openFileListPos === 'bottom') moveTabs('bottom');
  if (S.uiZoom && S.uiZoom !== 100) document.body.style.fontSize = (14 * S.uiZoom / 100) + 'px';
  Term.lines = Term.welcome();
  renderTabs();
  if (T.active) { Ed.setValue(Ed.currentContent(T.active)); } else { Ed.setValue(''); }
  renderEditor(); syncEditorScroll();
  const nUpd = Object.keys(Plugins.updates).length;
  $('#pluginBadge').textContent = nUpd;
  $('#pluginBadge').classList.toggle('hidden', nUpd === 0);
  if (!had) {
    Notifs.push('Plugin Updates', `${nUpd} plugins have new versions available.`, 'puzzle');
    Notifs.push('Bem-vindo ao Thcode', 'Toque no menu para explorar arquivos, terminal, plugins e IA.', 'info');
  }
  Notifs.updateBadge();
  clog('INFO', 'Application initialized');
  clog('INFO', 'File loaded: ' + (T.active || 'none'));
  clog('INFO', 'Plugin manager ready');
  clog('INFO', 'Connectors ready (GitHub + OpenRouter)');
  if (S.checkForAppUpdates) setTimeout(() => Notifs.push('Atualização', 'Thcode v2.0.0 está atualizado.', 'refresh'), 4000);
  tickClock(); tickNet();
  setInterval(tickClock, 10000);
  setInterval(tickNet, 2200);
  setInterval(() => Procs.tick(), 2500);
  initGestures();
  // teclado global
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); $('#paletteWrap').classList.contains('hidden') ? Palette.open() : Palette.close(); }
    else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); quickOpen(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); Find.open(false); }
    else if (e.key === 'Escape') escCascade();
  });
  window.addEventListener('beforeunload', e => {
    if (S.confirmOnExit && Object.keys(T.dirty).length) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('error', e => { try { clog('ERROR', e.message); } catch (_) {} });
  realBoot({ splash, fill, status, had });
}


/* ==========================================================================
   THCODE v2 — Catálogo de plugins, capacidades, detalhes e efeitos reais
   ========================================================================== */
PLUGIN_DEFS.push(
  { id: 'lua-support', name: 'Lua Language Support', ver: '1.0.2', dl: '88.4K', desc: 'Realce, snippets e execução para Lua', bg: 'linear-gradient(135deg,#000080,#2b2ba0)', ic: 'files' },
  { id: 'vscode-icons', name: 'vscode Icons', ver: '2.0.4', dl: '210K', desc: 'Ícones de arquivo estilo VS Code (letras)', bg: 'linear-gradient(135deg,#007acc,#00c6ff)', ic: 'grid' },
  { id: 'ai-sidebar', name: 'AI Assistant Sidebar', ver: '2.1.1', dl: '64.2K', desc: 'Ações rápidas de IA sobre a seleção', bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', ic: 'ai' },
  { id: 'blackbox-ai', name: 'BlackBox AI For TDG', ver: '3.1.6', dl: '32.8K', desc: 'Múltiplos provedores de IA em um plugin', bg: 'linear-gradient(135deg,#111827,#000)', ic: 'grid' },
  { id: 'opencode-ai', name: 'OpenCode AI', ver: '0.2.2', dl: '4.23K', desc: 'Agente de codificação OpenCode no editor', bg: 'linear-gradient(135deg,#e8e8e8,#9a9a9a)', ic: 'console' },
  { id: 'rutex-agent', name: 'RutexAI Coding Agent', ver: '0.0.9', dl: '12.7K', desc: 'Agente autônomo para tarefas de código', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', ic: 'hex' },
  { id: 'font-icons', name: 'Font icons', ver: '1.0.1', dl: '18.9K', desc: 'Ícones de fonte para o explorador', bg: 'linear-gradient(135deg,#f8fafc,#94a3b8)', ic: 'font' },
  { id: 'acode-purple', name: 'Acode Purple (theme)', ver: '1.1.7', dl: '96.1K', desc: 'Tema roxo neon oficial da comunidade', bg: 'linear-gradient(135deg,#a100ff,#5b21b6)', ic: 'palette' },
  { id: 'better-ui', name: 'Better UI', ver: '1.12.5', dl: '141K', desc: 'Densidade, escala e refinamentos de UI', bg: 'linear-gradient(135deg,#f59e0b,#111111)', ic: 'eye' },
  { id: 'eslint', name: 'ESLint', ver: '1.4.0', dl: '120K', desc: 'Lint de JavaScript no editor', bg: 'linear-gradient(135deg,#8080f2,#4b32c3)', ic: 'zap' },
  { id: 'todo-tree', name: 'Todo Tree', ver: '2.3.1', dl: '77.5K', desc: 'Liste TODOs e FIXMEs do projeto', bg: 'linear-gradient(135deg,#22c55e,#14532d)', ic: 'search' },
  { id: 'json-tools', name: 'JSON Tools', ver: '1.2.0', dl: '58.3K', desc: 'Validar e minificar JSON', bg: 'linear-gradient(135deg,#c678dd,#5b21b6)', ic: 'wand' },
  { id: 'md-preview', name: 'Markdown Preview', ver: '1.5.2', dl: '83.9K', desc: 'Preview de Markdown no navegador', bg: 'linear-gradient(135deg,#3b82f6,#0f172a)', ic: 'eye' },
  { id: 'emmet', name: 'Emmet', ver: '2.1.0', dl: '190K', desc: 'Expansão de abreviações com Tab', bg: 'linear-gradient(135deg,#f97316,#7c2d12)', ic: 'zap' },
  { id: 'bracket-colorizer', name: 'Bracket Pair Colorizer', ver: '1.0.8', dl: '66.6K', desc: 'Colchetes coloridos por nível', bg: 'linear-gradient(135deg,#eab308,#84cc16)', ic: 'palette' },
  { id: 'npm-scripts', name: 'npm Scripts', ver: '1.1.0', dl: '29.4K', desc: 'Execute scripts do package.json', bg: 'linear-gradient(135deg,#cb0000,#5c0000)', ic: 'play' }
);
const PLUGIN_META = {
  'acodex-term': { vendor: 'Acode-Foundation', rating: 99, reviews: 412, updated: '2d ago', tags: ['terminal', 'alpine', 'linux'], feats: ['Terminal Alpine com apk', 'Histórico persistente', 'Temas e fontes ajustáveis'] },
  'github': { vendor: 'Acode-Foundation', rating: 97, reviews: 358, updated: '4d ago', tags: ['git', 'github', 'repos'], feats: ['Dados reais via api.github.com', 'Clonar com README real', 'Cache offline'] },
  'ai-assistant': { vendor: 'Thcode', rating: 96, reviews: 187, updated: '1d ago', tags: ['ai', 'chat', 'assistant'], feats: ['Chat com streaming', 'Histórico de conversas', 'API real (OpenRouter) opcional'] },
  'prettier': { vendor: 'Thcode', rating: 98, reviews: 520, updated: '1w ago', tags: ['format', 'lint'], feats: ['JSON com tabWidth configurável', 'Formatar ao salvar', 'Remove espaços extras'] },
  'pinch-zoom': { vendor: 'Thcode', rating: 95, reviews: 96, updated: '3w ago', tags: ['editor', 'zoom'], feats: ['Pinça ajusta a fonte (50–250%)'] },
  'opencode-ai': { vendor: 'victorzee', lic: 'MIT', rating: 100, reviews: 3, updated: '4d ago', tags: ['ai', 'coding', 'agent', 'opencode', 'llm', 'assistant', 'terminal'], oss: true,
    changelog: [['0.2.3', 'Correção do probe de saúde e escala do iframe', '4d ago'], ['0.2.2', 'Render reativo do estado atual', '2w ago'], ['0.2.1', 'Lançamento inicial', '1mo ago']],
    readme: `# opencode\n\nRun the OpenCode AI coding agent inside the Editor.\n\n## Features\n\n- Launches OpenCode as a background HTTP server\n- Embeds the web UI in a full-page iframe\n- Loopback health probe and auto-install\n- Log levels: none, debug, info, warn, error\n\n## Requirements\n\nNode.js and npm must be available in the built-in Alpine Linux terminal:\n\n\`\`\`sh\napk add --no-cache nodejs npm\n\`\`\`\n\n## Project Structure\n\n\`\`\`\nsrc/\n  main.ts      # plugin init/destroy, flow orchestration\n  state.ts     # state machine (transition, onStateChange)\n  opencode/    # install, server, health\n  ui/          # render orchestrator, one func per state\n\`\`\`\n\n## License\n\nMIT — see the LICENSE file.` },
  'blackbox-ai': { vendor: 'The DarkGhost Developer', lic: 'MIT', rating: 100, reviews: 3, updated: '4mo ago', tags: ['thedarkghost', 'blackbox', 'ai', 'gemini', 'openai', 'deepseek', 'claude'],
    changelog: [['3.1.6', 'Suporte a Claude e DeepSeek', '4mo ago'], ['3.1.0', 'Seletor de provedor', '5mo ago']],
    readme: `# BlackBox AI\n\nBlackBox AI adalah platform AI yang memungkinkan pengguna mengakses berbagai layanan kecerdasan buatan secara terpadu.\n\n## Mendapatkan API\n\n- Gemini\n- OpenAI\n- Claude\n- DeepSeek\n\n## Tutorial\n\n1. Escolha o Provider nas configurações\n2. Cole sua Api Key do provedor\n3. Selecione o modelo BlackBox AI no chat\n\nTerimakasih.\n**The DarkGhost**` },
  'rutex-agent': { vendor: 'RutexLabs', rating: 94, reviews: 41, updated: '1w ago', tags: ['ai', 'agent', 'coding'], feats: ['Tarefas multi-etapas', 'Contexto de arquivos (CTX)', 'Modelos via OpenRouter'] },
  'term-pro': { vendor: 'Thcode', rating: 93, reviews: 64, updated: '2w ago', tags: ['terminal', 'themes'], feats: ['Temas Pro extras', 'Fonte dedicada'] },
  'resp-tester': { vendor: 'Thcode', rating: 92, reviews: 58, updated: '3w ago', tags: ['preview', 'responsive', 'devices'], feats: ['Modo Devices no preview', 'Presets 360–768px'] },
  'python': { vendor: 'Thcode', rating: 97, reviews: 890, updated: '5d ago', tags: ['python', 'run'], feats: ['Executa print() no terminal', 'Realce Python'] },
  'py-runner': { vendor: 'Community', rating: 91, reviews: 120, updated: '1mo ago', tags: ['python', 'run'], feats: ['Atalho Run para Python'] },
  'lua-support': { vendor: 'Community', rating: 90, reviews: 45, updated: '2w ago', tags: ['lua'], feats: ['Executa print() no terminal', 'Snippets Lua'] },
  'cpp': { vendor: 'Community', rating: 89, reviews: 37, updated: '1mo ago', tags: ['c', 'cpp'], feats: ['Simula g++ no terminal'] },
  'vscode-icons': { vendor: 'Community', rating: 95, reviews: 230, updated: '1w ago', tags: ['icons', 'theme'], feats: ['Letra colorida por linguagem'] },
  'material-icons': { vendor: 'Community', rating: 93, reviews: 140, updated: '2w ago', tags: ['icons'], feats: ['Ícones com brilho Material'] },
  'font-icons': { vendor: 'Community', rating: 88, reviews: 52, updated: '3w ago', tags: ['icons'], feats: ['Símbolos de fonte no explorer'] },
  'better-ui': { vendor: 'Thcode', rating: 96, reviews: 310, updated: '2d ago', tags: ['ui', 'density'], feats: ['Modo compacto', 'Ajustes de densidade'] },
  'acode-purple': { vendor: 'Community', rating: 98, reviews: 402, updated: '4d ago', tags: ['theme', 'purple'], feats: ['Tema Royal', 'Intensidade do neon'] },
  'ayu': { vendor: 'Community', rating: 94, reviews: 180, updated: '2w ago', tags: ['theme'], feats: ['Tema Ayu'] },
  'sweet-plasma': { vendor: 'Community', rating: 92, reviews: 88, updated: '1mo ago', tags: ['theme'], feats: ['Tema Plasma'] },
  'emmet': { vendor: 'Thcode', rating: 97, reviews: 265, updated: '1w ago', tags: ['editor', 'snippets'], feats: ['! + Tab → boilerplate', '.classe / #id / ul>li*3'] },
  'snippets': { vendor: 'Thcode', rating: 91, reviews: 95, updated: '3w ago', tags: ['editor', 'snippets'], feats: ['Snippets no autocomplete'] },
  'path-intel': { vendor: 'Community', rating: 90, reviews: 70, updated: '1mo ago', tags: ['editor', 'paths'], feats: ['Completa caminhos do projeto'] },
  'bracket-colorizer': { vendor: 'Community', rating: 93, reviews: 112, updated: '2w ago', tags: ['editor', 'colors'], feats: ['Arco-íris por nível ()[]{}'] },
  'abread': { vendor: 'Community', rating: 89, reviews: 40, updated: '1mo ago', tags: ['nav'], feats: ['Breadcrumb clicável'] },
  'ai-sidebar': { vendor: 'Thcode', rating: 92, reviews: 66, updated: '1w ago', tags: ['ai'], feats: ['Perguntar à IA sobre a seleção'] },
  'aicodex': { vendor: 'AicodeX', rating: 88, reviews: 30, updated: '2mo ago', tags: ['ai', 'gpt'], feats: ['Modelo GPT extra'] },
  'eslint': { vendor: 'Community', rating: 90, reviews: 77, updated: '2w ago', tags: ['lint', 'js'], feats: ['Lint: console, ponto e vírgula'] },
  'todo-tree': { vendor: 'Community', rating: 91, reviews: 63, updated: '3w ago', tags: ['todo', 'search'], feats: ['Lista TODO/FIXME do projeto'] },
  'json-tools': { vendor: 'Thcode', rating: 92, reviews: 54, updated: '1w ago', tags: ['json'], feats: ['Validar e minificar JSON'] },
  'md-preview': { vendor: 'Thcode', rating: 93, reviews: 71, updated: '1w ago', tags: ['markdown', 'preview'], feats: ['Renderiza .md no navegador'] },
  'color-palette': { vendor: 'Community', rating: 90, reviews: 69, updated: '1mo ago', tags: ['colors', 'tools'], feats: ['Gera paleta do arquivo atual'] },
  'git-scm': { vendor: 'Community', rating: 91, reviews: 83, updated: '2w ago', tags: ['git'], feats: ['Status e commit simulados'] },
  'gh-manager': { vendor: 'Community', rating: 89, reviews: 44, updated: '1mo ago', tags: ['github'], feats: ['Aba Issues/PRs'] },
  'git-dust': { vendor: 'Community', rating: 87, reviews: 29, updated: '2mo ago', tags: ['git', 'stats'], feats: ['Estatísticas do projeto'] },
  'android-builder': { vendor: 'Thcode', rating: 90, reviews: 58, updated: '3w ago', tags: ['android', 'build'], feats: ['Build APK simulado'] },
  'npm-scripts': { vendor: 'Community', rating: 88, reviews: 33, updated: '1mo ago', tags: ['npm'], feats: ['Lista scripts do package.json'] },
  'add-package': { vendor: 'Thcode', rating: 89, reviews: 47, updated: '2w ago', tags: ['npm'], feats: ['npm install atualiza package.json'] },
  'academy': { vendor: 'Thcode', rating: 94, reviews: 120, updated: '1w ago', tags: ['learn'], feats: ['Tutoriais na Ajuda'] },
  'path-linker': { vendor: 'Community', rating: 86, reviews: 25, updated: '2mo ago', tags: ['nav'], feats: ['Abrir caminho sob o cursor'] },
  'suger': { vendor: 'Community', rating: 85, reviews: 19, updated: '3mo ago', tags: ['debug'], feats: ['Inspecionar arquivo'] }
};
function pmeta(id) {
  const d = PLUGIN_DEFS.find(x => x.id === id) || {};
  const m = PLUGIN_META[id] || {};
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return {
    vendor: m.vendor || 'Community', lic: m.lic || 'MIT',
    rating: m.rating || (88 + (h % 11)), reviews: m.reviews || (8 + (h % 120)),
    updated: m.updated || 'recentemente', tags: m.tags || ['tools'],
    feats: m.feats || [d.desc || 'Plugin para Thcode'],
    changelog: m.changelog || [[d.ver || '1.0.0', 'Versão atual estável', m.updated || 'recente']],
    readme: m.readme || null, oss: m.oss || false,
    contributors: m.contributors || [m.vendor || 'Community']
  };
}
/* ---------- capacidades calculadas dos plugins instalados ---------- */
const CAPS = {};
const PLUGIN_THEMES = [
  { id: 'ayu', name: 'Ayu', bg: '#0d0f11', bar: '#15181c', acc: '#e6b450', need: 'ayu' },
  { id: 'plasma', name: 'Sweet Plasma', bg: '#12081f', bar: '#1e0f33', acc: '#ff2fb3', need: 'sweet-plasma' },
  { id: 'royal', name: 'Royal Purple', bg: '#150a24', bar: '#211038', acc: '#a100ff', need: 'acode-purple' }
];
function syncPluginThemes() {
  for (let i = THEMES.length - 1; i >= 0; i--) if (['ayu', 'plasma', 'royal'].includes(THEMES[i].id)) THEMES.splice(i, 1);
  PLUGIN_THEMES.forEach(t => { if (Plugins.isInstalled(t.need)) THEMES.push({ id: t.id, name: t.name + ' ✦', bg: t.bg, bar: t.bar, acc: t.acc }); });
}
function computeCaps() {
  const has = id => Plugins.isInstalled(id);
  Object.assign(CAPS, {
    rainbow: has('bracket-colorizer'), crumb: has('abread'),
    snippets: has('snippets'), paths: has('path-intel'), emmet: has('emmet'),
    devices: has('resp-tester'), python: has('python') || has('py-runner'),
    lua: has('lua-support'), cpp: has('cpp'), gitx: has('git-scm'),
    todo: has('todo-tree'), eslint: has('eslint'), jsonTools: has('json-tools'),
    md: has('md-preview'), paletteGen: has('color-palette'), builder: has('android-builder'),
    npm: has('add-package') || has('npm-scripts'), academy: has('academy'),
    stats: has('git-dust'), askAI: has('ai-sidebar'), linker: has('path-linker'),
    inspect: has('suger'), termPro: has('terminal-pro')
  });
  syncPluginThemes();
  if (!AI_MODELS.includes('BlackBox AI') && has('blackbox-ai')) AI_MODELS.push('BlackBox AI');
  if (!AI_MODELS.includes('Rutex Zero') && has('rutex-agent')) AI_MODELS.push('Rutex Zero');
}
/* ---------- ícones por pack ---------- */
function ficon(L) {
  const pack = S.iconPack || 'default';
  const ok = pack === 'default' || (pack === 'vscode' && Plugins.isInstalled('vscode-icons')) ||
    (pack === 'material' && Plugins.isInstalled('material-icons')) || (pack === 'font' && Plugins.isInstalled('font-icons'));
  const p = ok ? pack : 'default';
  if (p === 'vscode') return `<i class="ipk-letter" style="background:${L.color}">${esc(L.name[0])}</i>`;
  if (p === 'material') return icon('file', `color:${L.color};filter:drop-shadow(0 0 5px ${L.color})`);
  if (p === 'font') return `<span style="color:${L.color};font-size:15px;line-height:1">◈</span>`;
  return icon('file', `color:${L.color}`);
}
/* ---------- arco-íris de colchetes ---------- */
function rainbowify(html) {
  const cols = ['#e5c07b', '#c678dd', '#61afef', '#98c379', '#e06c75', '#56b6c2'];
  let out = '', depth = 0, inTag = false;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === '<') { inTag = true; out += ch; continue; }
    if (ch === '>') { inTag = false; out += ch; continue; }
    if (!inTag && ch === '&') { const sc = html.indexOf(';', i); if (sc > 0 && sc - i < 10) { out += html.slice(i, sc + 1); i = sc; continue; } }
    if (!inTag && '([{'.includes(ch)) { out += `<span style="color:${cols[depth % 6]};font-weight:700">${ch}</span>`; depth++; }
    else if (!inTag && ')]}'.includes(ch)) { depth = Math.max(0, depth - 1); out += `<span style="color:${cols[depth % 6]};font-weight:700">${ch}</span>`; }
    else out += ch;
  }
  return out;
}
/* ---------- snippets / paths / emmet ---------- */
const Snippets = {
  data: {
    js: ['console.log()', 'addEventListener', 'querySelector', 'getElementById', 'async () => {}', 'JSON.parse', 'JSON.stringify', 'for (let i = 0', 'setTimeout('],
    html: ['<div></div>', '<span></span>', '<script></script>', '<link>', '<button></button>', '<!DOCTYPE html>'],
    css: ['@media', 'display: flex', 'margin: 0 auto', ':hover', 'transition:'],
    py: ['print()', 'def ', 'for i in ', 'import '], lua: ['print()', 'function ', 'local '], sh: ['echo ', 'if [  ]; then'],
    json: ['"key": ', 'true', 'false', 'null']
  },
  add(prefix, set) {
    if (!CAPS.snippets || !prefix) return;
    const lang = T.active ? detectLang(T.active) : 'txt';
    (this.data[lang] || this.data.js).forEach(w => { if (w.toLowerCase().startsWith(prefix.toLowerCase()) && w !== prefix && set.size < 46) set.add(w); });
  }
};
const PathIntel = {
  add(prefix, set) {
    if (!CAPS.paths || !prefix || prefix.length < 1) return;
    const v = Ed.input.value.slice(0, Ed.input.selectionStart).split('\n').pop();
    if (!/["'(\s][^"'()\n]*\/[^"'()\n]*$/.test(v) && !v.endsWith('/')) return;
    for (const f of Object.keys(FS.files)) {
      const b = baseName(f);
      if (b !== '.keep' && b.toLowerCase().startsWith(prefix.toLowerCase()) && set.size < 46) set.add(b);
    }
  }
};
const Emmet = {
  tryExpand() {
    if (!CAPS.emmet || !T.active) return false;
    const input = Ed.input, s = input.selectionStart, v = input.value;
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const m = v.slice(lineStart, s).match(/([!a-z.#>+*][\w.#>+*-]*)$/i);
    if (!m) return false;
    const abbr = m[1];
    const lang = detectLang(T.active);
    let out = null;
    if (abbr === '!') out = '<!DOCTYPE html>\n<html>\n<head>\n\t<meta charset="utf-8">\n</head>\n<body>\n\t\n</body>\n</html>';
    else if (abbr === 'lorem') out = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    else if (lang === 'html' && /^\.[\w-]+$/.test(abbr)) out = `<div class="${abbr.slice(1)}"></div>`;
    else if (lang === 'html' && /^#[\w-]+$/.test(abbr)) out = `<div id="${abbr.slice(1)}"></div>`;
    else if (lang === 'html' && /^ul>li\*\d+$/.test(abbr)) { const k = +abbr.split('*')[1]; out = '<ul>\n' + Array.from({ length: Math.min(k, 20) }, () => '\t<li></li>').join('\n') + '\n</ul>'; }
    else if (/^(div|p|span|a|ul|li|ol|button|input|form|h1|h2|h3|table|tr|td)$/.test(abbr)) out = `<${abbr}></${abbr}>`;
    if (out === null) return false;
    Ed.pushUndo(T.active, v);
    input.value = v.slice(0, s - abbr.length) + out + v.slice(input.selectionEnd);
    input.selectionStart = input.selectionEnd = s - abbr.length + out.length;
    Ed.onEdit(false); toast('Emmet: ' + abbr, 'wand'); return true;
  }
};
/* ---------- markdown lite (README) ---------- */
function mdLite(md) {
  const fences = [];
  md = String(md).replace(/```(\w*)\n([\s\S]*?)```/g, (m, l, code) => { fences.push(`<pre><code>${esc(code).replace(/\n$/, '')}</code></pre>`); return `\u0000${fences.length - 1}\u0000`; });
  let html = esc(md).split('\n').map(line => {
    if (/^###\s/.test(line)) return `<h2>${line.slice(4)}</h2>`;
    if (/^##\s/.test(line)) return `<h1>${line.slice(3)}</h1>`;
    if (/^#\s/.test(line)) return `<h1>${line.slice(2)}</h1>`;
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) return `<ul><li>${line.replace(/^(\s*[-*+]|\s*\d+\.)\s/, '')}</li></ul>`;
    if (!line.trim() || /^\u0000\d+\u0000$/.test(line.trim())) return line;
    return `<p>${line.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</p>`;
  }).join('\n');
  return html.replace(/\u0000(\d+)\u0000/g, (m, i) => fences[+i]);
}
/* ---------- overlay de instalação ---------- */
function installOverlay(name, ver, steps, done) {
  const ov = document.createElement('div');
  ov.className = 'install-ov';
  ov.innerHTML = `<div class="install-card"><h3>${esc(name)}</h3><div class="sub">v${esc(ver)}</div>
    <div class="install-bar"><i></i></div><div class="install-steps">${steps.map(s => `<div class="istep">${icon('clock')}<span>${s}</span></div>`).join('')}</div></div>`;
  document.body.appendChild(ov);
  const rows = [...ov.querySelectorAll('.istep')];
  const bar = ov.querySelector('.install-bar i');
  let i = 0;
  const next = () => {
    if (i > 0) { rows[i - 1].classList.remove('doing'); rows[i - 1].classList.add('done'); rows[i - 1].querySelector('svg').outerHTML = icon('check'); }
    if (i >= rows.length) {
      bar.style.width = '100%';
      setTimeout(() => { ov.remove(); done && done(); }, 280);
      return;
    }
    rows[i].classList.add('doing');
    rows[i].querySelector('svg').outerHTML = icon('refresh');
    bar.style.width = ((i + 1) / rows.length * 100) + '%';
    i++;
    setTimeout(next, 340 + Math.random() * 260);
  };
  next();
}
/* ---------- detalhe do plugin ---------- */
const PluginDetail = {
  tab: 'readme',
  open(id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    if (!def) return;
    this.tab = 'readme';
    Page.open('plugdetail', def.name, el => this.render(el, id), false);
    this.gear(id);
  },
  gear(id) {
    document.querySelector('#pageGear')?.remove();
    if (!PLUGIN_SCHEMAS[id]) return;
    const g = document.createElement('button');
    g.className = 'icon-btn'; g.id = 'pageGear'; g.title = 'Configurações do plugin';
    g.innerHTML = icon('settings');
    g.onclick = () => PluginSettings.open(id);
    document.querySelector('.page-head').appendChild(g);
  },
  render(el, id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    const m = pmeta(id);
    const inst = Plugins.isInstalled(id);
    const upd = Plugins.updates[id];
    const btns = inst
      ? `<button class="big-btn uninstall" id="pdUn">🗑 Desinstalar</button>${upd ? `<button class="big-btn primary" id="pdUp">⟳ Atualizar</button>` : ''}`
      : `<button class="big-btn primary" id="pdIn" style="flex:1">⬇ Instalar</button>`;
    el.innerHTML = `<div class="pd-hero">
      <div class="pd-icon"><div class="plugin-ico" style="background:${def.bg}">${icon(def.ic)}</div>${m.oss ? `<span class="pd-oss">${icon('github')}Código Aberto</span>` : ''}</div>
      <div class="pd-name">${esc(def.name)}</div>
      <div class="pd-chips"><span class="pd-chip">🏷 v${inst ? Plugins.installed[id] : def.ver}${upd ? ` <span class="up">→ v${upd}</span>` : ''}</span><span class="pd-chip">👤 ${esc(m.vendor)}</span><span class="pd-chip">⚖ ${esc(m.lic)}</span></div>
      <div class="pd-stats"><span>📦 Catálogo real via jsDelivr (npm)</span></div>
      <div class="pd-tags">${m.tags.map(t => `<span class="pd-tag">${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="pd-btns">${btns}</div>
    <div class="pd-note">${icon('info')}<span>Plugins comprados não são sincronizados com sua conta Thcode. Use a mesma conta do Google na Play Store para restaurar sua compra.</span></div>
    <div class="pd-tabs"><button data-t="readme" class="${this.tab === 'readme' ? 'sel' : ''}">Visão Geral</button><button data-t="contrib" class="${this.tab === 'contrib' ? 'sel' : ''}">Contribuidores</button><button data-t="log" class="${this.tab === 'log' ? 'sel' : ''}">Registro de Alterações</button></div>
    <div class="pd-body" id="pdBody"></div>`;
    const paint = () => {
      const b = el.querySelector('#pdBody');
      if (this.tab === 'readme') {
        const readme = m.readme || `# ${def.name}\n\n${def.desc}.\n\n## Recursos\n\n${m.feats.map(f => `- ${f}`).join('\n')}\n\n## Instalação\n\nToque em **Instalar** — nenhuma configuração extra é necessária.\n\n## Licença\n\n${m.lic} — código aberto.`;
        b.innerHTML = mdLite(readme);
      } else if (this.tab === 'contrib') {
        b.innerHTML = `<h1>Contribuidores</h1>` + m.contributors.map((c, i) => `<div class="row">${icon('github')}<div class="grow"><div class="t">${esc(c)}</div><div class="s">${i === 0 ? 'Autor • mantenedor' : 'Colaborador'}</div></div></div>`).join('');
      } else {
        b.innerHTML = `<h1>Registro de Alterações</h1>` + m.changelog.map(([v, txt, d]) => `<div class="cl-ver"><h4>v${esc(v)}</h4><div class="date">${esc(d)}</div><ul><li>${esc(txt)}</li></ul></div>`).join('');
      }
      el.querySelectorAll('.pd-tabs button').forEach(x => x.classList.toggle('sel', x.dataset.t === this.tab));
    };
    el.querySelectorAll('.pd-tabs button').forEach(x => x.onclick = () => { this.tab = x.dataset.t; paint(); });
    paint();
    el.querySelector('#pdIn')?.addEventListener('click', () => { Plugins.install(id); Page.back(); });
    el.querySelector('#pdUn')?.addEventListener('click', async () => {
      const ok = await dConfirm('Desinstalar', `Desinstalar <b>${esc(def.name)}</b>?`, 'Desinstalar');
      if (ok) { Plugins.uninstall(id); Page.back(); }
    });
    el.querySelector('#pdUp')?.addEventListener('click', () => { Plugins.update(id); Page.back(); });
  }
};
/* ---------- schemas de configuração por plugin ---------- */
const PLUGIN_SCHEMAS = {
  'opencode-ai': [
    { k: 'iframeScale', t: 'Iframe Scale (%)', d: 'Scale factor for the web UI iframe (70–150, default 75)', type: 'number', min: 70, max: 150, def: 75 },
    { k: 'logLevel', t: 'Log Level', d: 'Verbosity of plugin log output (none disables all logs)', type: 'select', opts: ['none', 'debug', 'info', 'warn', 'error'], def: 'none' },
    { k: 'hideHeader', t: 'Hide header in landscape', d: 'Automatically hide header in landscape orientation to maximize content area', type: 'toggle', def: true }
  ],
  'blackbox-ai': [
    { k: 'provider', t: 'Provider', d: 'Provider BlackBox AI.', type: 'select', opts: ['openai', 'gemini', 'deepseek', 'claude'], def: 'openai' },
    { k: 'openaiKey', t: 'Openai Api Key', d: 'The Api Key to used', type: 'password', def: '' },
    { k: 'geminiKey', t: 'Gemini Api Key', d: 'The Api Key to used blackbox.', type: 'password', def: '' },
    { k: 'deepseekKey', t: 'DeepSeek Api Key', d: 'The Api Key for DeepSeek Coder.', type: 'password', def: '' },
    { k: 'claudeKey', t: 'Claude Api Key', d: 'The Api Key for Anthropic Claude.', type: 'password', def: '' }
  ],
  'rutex-agent': [
    { k: 'model', t: 'Modelo', d: 'Modelo padrão do agente', type: 'select', opts: AI_MODELS, def: 'OpenRouter' },
    { k: 'apiKey', t: 'API Key', d: 'Chave OpenRouter (opcional, fica no aparelho)', type: 'password', def: '' },
    { k: 'temperature', t: 'Temperature', d: 'Criatividade das respostas (0–1)', type: 'number', min: 0, max: 1, step: 0.1, def: 0.7 }
  ],
  'ai-assistant': [
    { k: 'model', t: 'Modelo', d: 'Modelo padrão do assistente', type: 'select', opts: AI_MODELS, def: 'OpenRouter' },
    { k: 'apiKey', t: 'API Key (OpenRouter)', d: 'Para respostas reais via API', type: 'password', def: '' }
  ],
  'aicodex': [{ k: 'apiKey', t: 'API Key', d: 'Chave da API AicodeX GPT', type: 'password', def: '' }],
  'prettier': [
    { k: 'tabWidth', t: 'Tab Width', d: 'Espaços na indentação do JSON', type: 'select', opts: ['2', '4'], def: '2' },
    { k: 'semi', t: 'Ponto e vírgula', d: 'Manter ; no fim das linhas', type: 'toggle', def: true }
  ],
  'better-ui': [
    { k: 'density', t: 'Densidade', d: 'Espaçamento da interface', type: 'select', opts: ['comfortable', 'compact'], def: 'comfortable' }
  ],
  'acode-purple': [
    { k: 'glow', t: 'Intensidade do neon', d: 'Brilho dos elementos ativos (0–100)', type: 'number', min: 0, max: 100, def: 55 }
  ],
  'terminal-pro': [
    { k: 'theme', t: 'Tema Pro', d: 'Tema extra do terminal', type: 'select', opts: ['pro-green', 'pro-amber', 'pro-purple'], def: 'pro-green' }
  ],
  'eslint': [
    { k: 'noConsole', t: 'Avisar console.*', d: 'Marca console.log como aviso', type: 'toggle', def: true },
    { k: 'semi', t: 'Exigir ponto e vírgula', d: 'Avisa linhas sem ;', type: 'toggle', def: false }
  ]
};
function pset(pid) {
  if (!S.pluginSettings) S.pluginSettings = {};
  if (!S.pluginSettings[pid]) S.pluginSettings[pid] = {};
  const out = S.pluginSettings[pid];
  (PLUGIN_SCHEMAS[pid] || []).forEach(f => { if (out[f.k] === undefined) out[f.k] = f.def; });
  return out;
}
const PluginSettings = {
  open(pid) {
    const def = PLUGIN_DEFS.find(p => p.id === pid);
    Page.open('pset', def ? def.name : pid, el => this.render(el, pid), false);
  },
  render(el, pid) {
    const schema = PLUGIN_SCHEMAS[pid] || [];
    const cur = pset(pid);
    el.innerHTML = '';
    if (!schema.length) { el.innerHTML = '<div class="empty">Este plugin não tem configurações.</div>'; return; }
    schema.forEach(f => {
      const row = document.createElement('div');
      row.className = 'schema-row';
      let ctrl = '';
      if (f.type === 'toggle') ctrl = `<div class="switch${cur[f.k] ? ' on' : ''}"></div>`;
      else if (f.type === 'select') ctrl = `<select>${f.opts.map(o => `<option${String(cur[f.k]) === String(o) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      else if (f.type === 'number') ctrl = `<span class="num-val">${esc(cur[f.k])}</span>${icon('chevron', 'width:16px;height:16px;color:var(--muted2)')}`;
      else ctrl = `<input type="password" value="${esc(cur[f.k])}" placeholder="••••••••" autocomplete="off">`;
      row.innerHTML = `<div class="grow"><div class="t">${esc(f.t)}</div><div class="s">${esc(f.d)}</div></div>${ctrl}`;
      if (f.type === 'toggle') row.onclick = () => { cur[f.k] = !cur[f.k]; row.querySelector('.switch').classList.toggle('on', cur[f.k]); Store.save(); this.applied(pid, f.k); };
      else if (f.type === 'select') row.querySelector('select').onchange = e => { cur[f.k] = e.target.value; Store.save(); this.applied(pid, f.k); toast('Configuração salva', 'settings'); };
      else if (f.type === 'number') row.onclick = async () => {
        const v = await dPrompt(f.t, String(cur[f.k]), `${f.min}–${f.max}`);
        if (v === null || v === '') return;
        const n = clamp(parseFloat(v) || f.def, f.min, f.max);
        cur[f.k] = n; Store.save(); row.querySelector('.num-val').textContent = n; this.applied(pid, f.k);
      };
      else row.querySelector('input').onchange = e => { cur[f.k] = e.target.value; Store.save(); toast('Chave salva localmente', 'lock'); };
      el.appendChild(row);
    });
    if (schema.some(f => f.type === 'password')) note(el, '<b>🔒 Suas chaves ficam somente neste aparelho</b> (localStorage). Nunca as compartilhe.');
  },
  applied(pid, key) {
    if (pid === 'better-ui' && key === 'density') { S.uiDensity = pset(pid).density; applySettings(); Store.save(); }
    if (pid === 'acode-purple' && key === 'glow') { const a = pset(pid).glow / 100; document.body.style.setProperty('--accent-glow', `rgba(161,0,255,${a})`); }
    if (pid === 'terminal-pro' && key === 'theme') { S.termTheme = pset(pid).theme; applyTermTheme(); }
    clog('INFO', `Plugin ${pid}: ${key} atualizado`);
  }
};
/* ---------- overrides: install com overlay + efeitos ---------- */
Plugins._rawInstall = Plugins.install.bind(Plugins);
Plugins._rawUninstall = Plugins.uninstall.bind(Plugins);
Plugins._rawUpdate = Plugins.update.bind(Plugins);
Plugins.install = function (id) {
  const def = PLUGIN_DEFS.find(p => p.id === id);
  installOverlay(def.name, def.ver, ['Baixando pacote', 'Verificando assinatura', 'Registrando recursos', 'Ativando plugin'], () => {
    this._rawInstall(id);
    computeCaps();
    if (Page.current === 'plugdetail') Page.rerender();
    renderEditor();
  });
};
Plugins.uninstall = function (id) {
  const def = PLUGIN_DEFS.find(p => p.id === id);
  installOverlay(def.name, Plugins.installed[id] || def.ver, ['Desativando recursos', 'Removendo arquivos'], () => {
    this._rawUninstall(id);
    computeCaps();
    if (S.appTheme && !THEMES.some(t => t.id === S.appTheme)) { S.appTheme = 'neon'; applySettings(); }
    if (Page.current === 'plugdetail') Page.rerender();
    renderEditor();
  });
};
Plugins.update = function (id) {
  const def = PLUGIN_DEFS.find(p => p.id === id);
  installOverlay(def.name, this.updates[id], ['Baixando atualização', 'Aplicando migração', 'Reiniciando plugin'], () => {
    this._rawUpdate(id);
    computeCaps();
    if (Page.current === 'plugdetail') Page.rerender();
  });
};
const _refreshUI = Plugins.refreshUI.bind(Plugins);
Plugins.refreshUI = function () { computeCaps(); _refreshUI(); };
/* ---------- painel "instale o plugin" ---------- */
const PanelNeed = {
  show(panelTitle, pluginName, pluginId, desc) {
    Panel.setHead(panelTitle, 'Plugin necessário', []);
    const body = $('#panelBody');
    body.innerHTML = `<div class="empty">${icon('puzzle')}<br><b style="color:var(--text)">${esc(pluginName)}</b><br>${esc(desc)}<br><br></div>
      <div class="btn-row"><button class="big-btn primary" id="needBtn">Instalar plugin</button></div>`;
    body.querySelector('#needBtn').onclick = () => PluginDetail.open(pluginId);
  }
};
const _panelRender = Panel.render.bind(Panel);
Panel.render = function () {
  const id = this.current;
  if (id === 'terminal' && !Plugins.isInstalled('acodex-term')) return PanelNeed.show('Terminal', 'AcodeX - Terminal', 'acodex-term', 'O terminal precisa deste plugin para funcionar.');
  if (id === 'github' && !Plugins.isInstalled('github')) return PanelNeed.show('GitHub', 'Github', 'github', 'A integração GitHub precisa deste plugin.');
  if (id === 'ai' && !Plugins.isInstalled('ai-assistant')) return PanelNeed.show('AI Assistant', 'AI Assistant Beta', 'ai-assistant', 'O assistente precisa deste plugin.');
  _panelRender();
};
const _pageBack = Page.back.bind(Page);
Page.back = function () { document.querySelector('#pageGear')?.remove(); _pageBack(); };
const _pageClose = Page.close.bind(Page);
Page.close = function (a) { document.querySelector('#pageGear')?.remove(); _pageClose(a); };

/* ==========================================================================
   THCODE v2 — Bash real (variáveis, pipes, redirects, glob, $())
   ========================================================================== */
const rxEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function splitShell(str, seps) {
  const parts = [];
  let cur = '', q = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    let hit = null;
    for (const s of seps) if (str.startsWith(s, i)) { hit = s; break; }
    if (hit) { if (cur.trim()) parts.push({ t: 'cmd', v: cur }); cur = ''; parts.push({ t: 'sep', v: hit }); i += hit.length - 1; }
    else cur += ch;
  }
  if (cur.trim()) parts.push({ t: 'cmd', v: cur });
  return parts;
}
function tokenize(line) {
  const out = [];
  let cur = '', q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === ' ' || ch === '\t') { if (cur) { out.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const fRead = p => { const f = fGet(p); return f ? f.c : undefined; };
const Bash = {
  async run(term, raw) {
    const line = (raw || '').trim();
    if (!term.env) term.env = { USER: 'root', HOST: 'localhost', HOME: '/MeuJarvis', SHELL: '/bin/sh' };
    term.print('g', term.promptStr() + ' ' + line);
    if (!line) return;
    term.hist.push(line);
    if (term.hist.length > (S.termHistory || 200)) term.hist.shift();
    term.histIdx = -1; Store.save();
    const asg = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (asg && !tokenize(line)[0].includes('=')) { term.env[asg[1]] = asg[2]; return; }
    let expanded = await this.subst(term, line);
    for (const k of Object.keys(term.env)) expanded = expanded.split('$' + k).join(term.env[k]);
    expanded = expanded.split('~').join(term.env.HOME);
    const chain = splitShell(expanded, ['&&', '||', ';']);
    let status = 0, gate = null;
    for (const part of chain) {
      if (part.t === 'sep') { gate = part.v; continue; }
      if (gate === '&&' && status !== 0) { gate = null; continue; }
      if (gate === '||' && status === 0) { gate = null; continue; }
      gate = null;
      status = await this.pipeline(term, part.v.trim());
    }
  },
  async subst(term, line) {
    const m = line.match(/\$\(([^()]+)\)/);
    if (!m) return line;
    const out = [];
    const fake = { capture: out, cwd: term.cwd, env: term.env, hist: [], resolve: p => Term.resolve.call({ cwd: term.cwd }, p) };
    await this.pipeline(fake, m[1]);
    return line.replace(m[0], out.join('\n'));
  },
  say(term, kind, text) {
    if (term.capture) { if (text) term.capture.push(text); return; }
    String(text).split('\n').forEach(l => term.print(kind, l));
  },
  glob(term, pat) {
    if (!pat.includes('*')) return [pat];
    const rx = new RegExp('^' + pat.split('*').map(rxEsc).join('.*') + '$');
    const L = listDir(term.cwd);
    const names = [...L.dirs, ...L.files].filter(n => rx.test(n));
    return names.length ? names.sort() : [pat];
  },
  async pipeline(term, seg) {
    const stages = splitShell(seg, ['|']).filter(p => p.t === 'cmd').map(p => p.v.trim());
    let input = '', status = 0;
    for (let i = 0; i < stages.length; i++) {
      let st = stages[i], redir = null, append = false;
      const rm = st.match(/^(.*?)\s*(>>|>)\s*(\S+)\s*$/);
      if (rm && !/^echo\s+["'].*[<>]/.test(st)) { st = rm[1]; redir = rm[3]; append = rm[2] === '>>'; }
      const toks = tokenize(st).flatMap(t => this.glob(term, t));
      if (!toks.length) continue;
      const r = await this.execCmd(term, toks[0], toks.slice(1), input);
      status = r.status;
      input = r.out;
      if (redir) {
        const p = term.resolve(redir);
        fSet(p, append ? (fRead(p) || '') + input : input);
        input = '';
      }
    }
    if (input) this.say(term, 'd', input.replace(/\n$/, ''));
    return status;
  },
  ok(out = '') { return { status: 0, out: out ? String(out).replace(/\n$/, '') + '\n' : '' }; },
  fail(msg, code = 1) { return { status: code, out: (msg || '') + (msg ? '\n' : '') }; },
  async execCmd(term, cmd, args, input) {
    const cdp = p => term.resolve(p);
    const err = m => this.say(term, 'r', m);
    switch (cmd) {
      case '': return this.ok();
      case 'help': return this.ok('Comandos: cd pwd ls cat head tail echo grep wc sort uniq find touch mkdir rm cp mv clear env export unset history\napk node python lua g++ git npm open run serve build acode rutex curl wget ping ps kill df du chmod sudo exit\nRecursos: VAR=x, $VAR, $(cmd), pipes |, redirects > >>, globs *, && || ;');
      case 'echo': {
        let a = args, nl = true;
        if (a[0] === '-n') { nl = false; a = a.slice(1); }
        if (a[0] === '-e') a = a.slice(1);
        return this.ok(a.join(' ').replace(/\\n/g, '\n') + (nl ? '' : ''));
      }
      case 'true': return this.ok();
      case 'false': return this.fail('', 1);
      case 'pwd': return this.ok(term.cwd);
      case 'whoami': return this.ok(term.env.USER);
      case 'hostname': return this.ok(term.env.HOST);
      case 'uname': return this.ok(args.includes('-a') ? 'Linux localhost 6.1.0-thcode #1 SMP aarch64 GNU/Linux' : 'Linux');
      case 'date': return this.ok(new Date().toString());
      case 'env': return this.ok(Object.entries(term.env).map(([k, v]) => `${k}=${v}`).join('\n'));
      case 'printenv': return args.length ? (term.env[args[0]] !== undefined ? this.ok(term.env[args[0]]) : this.fail('', 1)) : this.execCmd(term, 'env', [], input);
      case 'export': for (const a of args) { const eq = a.indexOf('='); if (eq > 0) term.env[a.slice(0, eq)] = a.slice(eq + 1); } return this.ok();
      case 'unset': args.forEach(a => delete term.env[a]); return this.ok();
      case 'history': return this.ok(term.hist.slice(-30).map((h, i) => `  ${i + 1}  ${h}`).join('\n'));
      case 'alias': return this.ok(`ll='ls -la'\n..='cd ..'`);
      case 'clear': if (term.lines) { term.lines = []; if (term.paint) term.paint(); } return { status: 0, out: '' };
      case 'exit': case 'logout': return this.ok('Use o botão ✕ do painel para fechar o terminal.');
      case 'cd': {
        const d = args[0] ? cdp(args[0]) : term.env.HOME;
        if (fExists(d)) { err(`cd: not a directory: ${args[0]}`); return { status: 1, out: '' }; }
        if (!dExists(d)) { err(`cd: ${args[0]}: No such file or directory`); return { status: 1, out: '' }; }
        term.cwd = d;
        if (term.updatePrompt) setTimeout(() => term.updatePrompt(document), 0);
        return this.ok();
      }
      case 'ls': {
        const a = args.filter(x => !x.startsWith('-') || x === '-'), flags = args.filter(x => x.startsWith('-')).join('');
        const paths = a.length ? a : [null];
        const outs = [];
        for (const ap of paths) {
          const d = ap === null ? term.cwd : cdp(ap);
          if (fExists(d)) { outs.push(baseName(d)); continue; }
          if (!dExists(d)) return this.fail(`ls: ${ap}: No such file or directory`);
          const L = listDir(d);
          if (flags.includes('l')) outs.push(L.dirs.map(n => `drwxr-xr-x  root  0  ${n}/`).concat(L.files.map(n => `-rw-r--r--  root  ${(fRead(d === '/' ? '/' + n : d + '/' + n) || '').length}  ${n}`)).join('\n'));
          else outs.push(L.dirs.map(n => n + '/').concat(L.files).join(flags.includes('1') ? '\n' : '  '));
        }
        return this.ok(outs.filter(Boolean).join('\n'));
      }
      case 'cat': {
        if (!args.length) return input ? this.ok(input.replace(/\n$/, '')) : this.fail('cat: missing operand');
        const t = fRead(cdp(args[0]));
        if (t === undefined) return this.fail(`cat: ${args[0]}: No such file or directory`);
        return this.ok(t.replace(/\n$/, ''));
      }
      case 'head': case 'tail': {
        let n = 10, f = null;
        const ni = args.indexOf('-n');
        if (ni >= 0) { n = parseInt(args[ni + 1]) || 10; f = args.filter((a, i) => i !== ni && i !== ni + 1 && a !== '-n')[0]; }
        else f = args[0];
        const txt = f ? fRead(cdp(f)) : input.replace(/\n$/, '');
        if (txt === undefined) return this.fail(`${cmd}: ${f}: No such file or directory`);
        const lines = txt.split('\n');
        return this.ok((cmd === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n'));
      }
      case 'wc': {
        const fs = args.filter(a => !a.startsWith('-'));
        const txt = fs.length ? fRead(cdp(fs[fs.length - 1])) : input;
        if (txt === undefined) return this.fail(`wc: ${fs[fs.length - 1]}: No such file or directory`);
        const l = txt.split('\n').length, w = txt.split(/\s+/).filter(Boolean).length, c = txt.length;
        const fl = args.join(' ');
        if (/\bl\b/.test(fl) && !/[wc]/.test(fl.replace('l', ''))) return this.ok(String(l));
        return this.ok(`${l} ${w} ${c}`);
      }
      case 'grep': {
        const a = args.filter(x => x !== '-i'), ci = args.includes('-i'), pat = a[0] || '', file = a[1];
        const txt = file ? fRead(cdp(file)) : input;
        if (txt === undefined) return this.fail(`grep: ${file}: No such file or directory`);
        let rx;
        try { rx = new RegExp(pat, ci ? 'i' : ''); } catch (_) { rx = new RegExp(rxEsc(pat), ci ? 'i' : ''); }
        const hits = txt.split('\n').filter(l => rx.test(l));
        return hits.length ? this.ok(hits.join('\n')) : this.fail('', 1);
      }
      case 'sort': {
        const txt = args.length ? fRead(cdp(args[0])) : input;
        if (txt === undefined) return this.fail(`sort: ${args[0]}: No such file or directory`);
        return this.ok(txt.split('\n').sort().join('\n'));
      }
      case 'uniq': {
        const txt = args.length ? fRead(cdp(args[0])) : input;
        if (txt === undefined) return this.fail(`uniq: ${args[0]}: No such file or directory`);
        return this.ok(txt.split('\n').filter((l, i, arr) => l !== arr[i - 1]).join('\n'));
      }
      case 'find': {
        const root = args[0] && !args[0].startsWith('-') ? cdp(args[0]) : term.cwd;
        const nm = args.includes('-name') ? args[args.indexOf('-name') + 1] : null;
        const rx = nm ? new RegExp('^' + nm.split('*').map(rxEsc).join('.*') + '$') : null;
        const hits = Object.keys(FS.files).filter(p => p.startsWith(root) && (!rx || rx.test(p.split('/').pop())));
        return this.ok(hits.join('\n'));
      }
      case 'touch': {
        if (!args.length) return this.fail('touch: missing operand');
        for (const a of args) { const p = cdp(a); if (!fExists(p)) fSet(p, ''); }
        return this.ok();
      }
      case 'mkdir': {
        if (!args.length) return this.fail('mkdir: missing operand');
        for (const a of args) ensureDir(cdp(a));
        Store.save(); return this.ok();
      }
      case 'rm': {
        const a = args.filter(x => !x.startsWith('-'));
        if (!a.length) return this.fail('rm: missing operand');
        for (const f of a) {
          const p = cdp(f);
          if (!fExists(p) && !dExists(p)) { err(`rm: ${f}: No such file or directory`); return { status: 1, out: '' }; }
          fDel(p);
          if (T.open.includes(p)) closeTab(p);
        }
        return this.ok();
      }
      case 'cp': {
        if (args.length < 2) return this.fail('cp: missing destination');
        const src = fRead(cdp(args[0]));
        if (src === undefined) return this.fail(`cp: ${args[0]}: No such file or directory`);
        fSet(cdp(args[1]), src); return this.ok();
      }
      case 'mv': {
        if (args.length < 2) return this.fail('mv: missing destination');
        const p = cdp(args[0]), src = fRead(p);
        if (src === undefined) return this.fail(`mv: ${args[0]}: No such file or directory`);
        fSet(cdp(args[1]), src); fDel(p);
        if (T.open.includes(p)) { T.open[T.open.indexOf(p)] = cdp(args[1]); if (T.active === p) T.active = cdp(args[1]); renderTabs(); }
        return this.ok();
      }
      case 'df': return this.ok('Filesystem      Size  Used Avail Use% Mounted on\ndata            12G   3.1G  8.9G  26% /data');
      case 'du': {
        const d = args[0] ? cdp(args[0]) : term.cwd;
        let bytes = 0;
        for (const [p, f] of Object.entries(FS.files)) if (p.startsWith(d)) bytes += (f.c || '').length;
        return this.ok(`${(bytes / 1024).toFixed(1)}K\t${args[0] || '.'}`);
      }
      case 'chmod': case 'chown': return this.ok();
      case 'sudo': return args[0] ? this.execCmd(term, args[0], args.slice(1), input) : this.fail('usage: sudo <command>');
      case 'ps': return this.ok('  PID TTY      COMMAND\n' + Procs.list.map(p => `${String(p.pid).padStart(5)} pts/0    ${p.name} (${p.status})`).join('\n'));
      case 'kill': {
        const p = Procs.list.find(x => x.pid === +args[0]);
        if (!p) return this.fail(`kill: (${args[0]}) - No such process`);
        p.status = 'stopped'; p.cpu = 0; Store.save(); return this.ok();
      }
      case 'sleep': await new Promise(r => setTimeout(r, Math.min(5, parseFloat(args[0]) || 0) * 1000)); return this.ok();
      case 'apk': {
        const sub = args[0], pkgs = args.filter(a => !a.startsWith('-')).slice(1);
        if (sub === 'add') return this.ok(pkgs.map(p => `(1/1) Installing ${p} — OK (simulado)`).join('\n') || 'OK');
        if (sub === 'del') return this.ok(pkgs.map(p => `(1/1) Purging ${p} (simulado)`).join('\n') || 'OK');
        if (sub === 'list' || sub === 'search') return this.ok(['nodejs', 'npm', 'python3', 'lua5.4', 'g++', 'git', 'curl', 'openssh'].filter(p => !pkgs[0] || p.includes(pkgs[0])).join('\n'));
        if (sub === 'update') return this.ok('fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main\nOK (simulado)');
        if (sub === 'upgrade') return this.ok('OK: 0 pacotes para atualizar (simulado)');
        return this.fail('apk: use add | del | list | search | update');
      }
      case 'node': {
        if (args[0] === '--version' || args[0] === '-v') return this.ok('v20.11.0 (simulado)');
        if (!args[0]) return this.ok('Welcome to Node.js v20 — use: node <arquivo>');
        const src = fRead(cdp(args[0]));
        if (src === undefined) return this.fail(`node: ${args[0]}: No such file or directory`);
        const logs = [...src.matchAll(/console\.log\(([^)]*)\)/g)].map(m => m[1].replace(/^['"]|['"]$/g, ''));
        return this.ok(logs.join('\n') || '(sem saída — console.log não encontrado)');
      }
      case 'python': case 'python3': {
        if (!CAPS.python) { err(`${cmd}: instale o plugin Python para executar`); PluginDetail.open('python'); return { status: 127, out: '' }; }
        if (args[0] === '--version') return this.ok('Python 3.12.0 (simulado)');
        const src = fRead(cdp(args[0] || ''));
        if (src === undefined) return this.fail(`${cmd}: can't open file '${args[0]}'`);
        const logs = [...src.matchAll(/print\(([^)]*)\)/g)].map(m => m[1].replace(/^['"]|['"]$/g, ''));
        return this.ok(logs.join('\n') || '(sem saída — print() não encontrado)');
      }
      case 'lua': {
        if (!CAPS.lua) { err('lua: instale o plugin Lua para executar'); PluginDetail.open('lua-support'); return { status: 127, out: '' }; }
        const src = fRead(cdp(args[0] || ''));
        if (src === undefined) return this.fail(`lua: cannot open ${args[0]}`);
        const logs = [...src.matchAll(/print\(([^)]*)\)/g)].map(m => m[1].replace(/^['"]|['"]$/g, ''));
        return this.ok(logs.join('\n') || '(sem saída)');
      }
      case 'g++': case 'gcc': {
        if (!CAPS.cpp) { err(`${cmd}: instale o plugin C/C++ para compilar`); PluginDetail.open('cpp'); return { status: 127, out: '' }; }
        const src = fRead(cdp(args[0] || ''));
        if (src === undefined) return this.fail(`${cmd}: ${args[0]}: No such file or directory`);
        return this.ok('a.out gerado (simulado)');
      }
      case 'git': return this.git(term, args);
      case 'npm': return this.npm(term, args);
      case 'acode': return this.ok(`Thcode ${APP_VER} (base Acode ${ACODE_BASE}) — Mobile IDE`);
      case 'rutex': Panel.open('agent'); return this.ok();
      case 'open': {
        if (!args[0]) return this.fail('open: missing operand');
        const p = cdp(args[0]);
        if (fRead(p) === undefined) return this.fail(`open: ${args[0]}: No such file or directory`);
        openFile(p); return this.ok();
      }
      case 'run': {
        if (!T.active) return this.fail('run: nenhum arquivo aberto');
        const lang = detectLang(T.active);
        if (lang === 'py') return this.execCmd(term, 'python', [T.active], input);
        if (lang === 'lua') return this.execCmd(term, 'lua', [T.active], input);
        if (lang === 'js') return this.execCmd(term, 'node', [T.active], input);
        if (lang === 'sh') return this.ok('Shell script executado (simulado).');
        Browser.open(T.active); return this.ok('Preview aberto.');
      }
      case 'serve': Browser.open(args[0] ? cdp(args[0]) : (T.active || '/index.html')); return this.ok(`Servindo em localhost:${S.previewPort} (simulado)`);
      case 'build': return CAPS.builder ? this.ok('Build APK… app-debug.apk gerado (simulado)') : this.fail('build: instale o plugin Android Builder', 127);
      case 'ping': return this.ok(`PING ${args[0] || '8.8.8.8'}: 4 pacotes transmitidos, 4 recebidos (simulado)`);
      case 'curl': case 'wget': {
        const url = args.filter(a => !a.startsWith('-')).pop();
        if (!url) return this.fail(`usage: ${cmd} <url>`);
        try {
          const r = await fetch(url.startsWith('http') ? url : 'https://' + url);
          const t = await r.text();
          return this.ok(`HTTP ${r.status} — ${t.length} bytes\n` + t.slice(0, 1200));
        } catch (e) { return this.fail(`${cmd}: falha de rede (offline?)`); }
      }
      default: {
        const custom = CustomCmds.find(cmd);
        if (custom) {
          try { const r = await custom.fn(args.join(' '), input); return this.ok(r || ''); }
          catch (e) { return this.fail('plugin ' + cmd + ': ' + e.message); }
        }
        err(`${cmd}: command not found — digite "help"`);
        return { status: 127, out: '' };
      }
    }
  },
  async git(term, args) {
    const sub = args[0];
    if (sub === 'status') return CAPS.gitx ? this.ok('On branch main\nnothing to commit (simulado)') : this.fail('git: instale o plugin Git SCM', 128);
    if (sub === 'log') return this.ok('a1b2c3d (HEAD) Initial commit (simulado)');
    if (sub === 'clone' && args[1]) {
      const m = args[1].match(/github\.com[/:]([^/]+\/[^/.]+)/);
      const name = m ? m[1].split('/')[1] : 'repo';
      try {
        const rd = await fetch(`https://api.github.com/repos/${m ? m[1] : 'x/y'}/readme`, { headers: { Accept: 'application/vnd.github.raw' } });
        const readme = rd.ok ? await rd.text() : '# ' + name;
        fSet(`/${name}/README.md`, readme.slice(0, 20000));
        return this.ok(`Cloning into '${name}'…\nREADME real baixado (${readme.length} bytes) ✓`);
      } catch (e) { return this.fail('git: falha de rede'); }
    }
    if (sub === 'add' || sub === 'commit') return CAPS.gitx ? this.ok(sub === 'add' ? 'staged (simulado)' : '[main abc1234] commit (simulado)') : this.fail('git: instale o plugin Git SCM', 128);
    if (sub === 'remote' || sub === 'pull' || sub === 'push') return this.ok('(simulado)');
    if (sub === '--version') return this.ok('git version 2.43.0 (simulado)');
    return this.fail('git: use status | log | clone | add | commit | pull | push');
  },
  async npm(term, args) {
    const sub = args[0];
    if (sub === 'install' || sub === 'i') {
      if (!CAPS.npm) return this.fail('npm: instale o plugin Add Package', 127);
      const pkg = args[1] || '';
      const p = term.resolve('package.json');
      let j = { name: 'thcode-app', dependencies: {} };
      try { const cur = fRead(p); if (cur) j = JSON.parse(cur); } catch (_) {}
      if (pkg) { j.dependencies = j.dependencies || {}; j.dependencies[pkg] = '^1.0.0'; fSet(p, JSON.stringify(j, null, 2)); }
      return this.ok(pkg ? `+ ${pkg}@1.0.0 (package.json atualizado ✓)` : 'up to date (simulado)');
    }
    if (sub === 'run' && args[1]) {
      try {
        const j = JSON.parse(fRead(term.resolve('package.json')) || '{}');
        if (j.scripts && j.scripts[args[1]]) return this.ok(`> ${j.scripts[args[1]]}\n(script executado — simulado)`);
        return this.fail(`npm: missing script: ${args[1]}`);
      } catch (_) { return this.fail('npm: package.json inválido'); }
    }
    if (sub === 'list') return this.ok('(nenhum pacote — simulado)');
    if (sub === '--version' || sub === '-v') return this.ok('10.2.0 (simulado)');
    return this.fail('npm: use install | run | list');
  }
};
Term.exec = function (raw) { Bash.run(this, raw); };

/* ==========================================================================
   THCODE v2 — API de plugins personalizados + hooks
   ========================================================================== */
const Hooks = {
  map: {},
  on(pid, ev, fn) { (this.map[ev] = this.map[ev] || []).push({ pid, fn }); },
  fire(ev, data) { (this.map[ev] || []).forEach(h => { try { h.fn(data); } catch (e) { console.warn('[thcode] hook', ev, e); } }); }
};
const CustomCmds = {
  list: [],
  add(pid, name, fn) { this.list = this.list.filter(c => c.name !== name); this.list.push({ pid, name, fn }); },
  find(name) { return this.list.find(c => c.name === name); }
};
const ThcodeAPI = {
  for(pid) {
    return {
      version: APP_VER,
      notify: (t, b) => Notifs.push(t, b || '', 'puzzle'),
      commands: { register: (name, fn) => CustomCmds.add(pid, name, fn) },
      on: (ev, fn) => Hooks.on(pid, ev, fn),
      fs: {
        read: p => fRead(p),
        write: (p, c) => fSet(p, c),
        list: () => Object.keys(FS.files)
      },
      settings: {
        get: (k, d) => { const s = pset(pid); return s[k] !== undefined ? s[k] : d; },
        set: (k, v) => { const s = pset(pid); s[k] = v; Store.save(); }
      }
    };
  }
};
const CustomPlugins = {
  KEY: 'thcode.custom.v1',
  list: [],
  template(name) {
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `// ==ThcodePlugin==\n// @name ${name}\n// @id ${id}\n// @version 1.0.0\n// @description Meu plugin personalizado\n// ==/ThcodePlugin==\n\n// Registra um comando de terminal: digite "${id}"\nThcode.commands.register('${id}', async (args) => {\n  Thcode.notify('${name}', 'Comando executado: ' + args);\n  return 'Olá do ${name}!';\n});\n\n// Reage a eventos: fs:save, app:boot\nThcode.on('fs:save', (path) => {\n  console.log('[${id}] salvo:', path);\n});\n`;
  },
  parse(code) {
    const g = k => (String(code).match(new RegExp('// @' + k + ' (.+)')) || [])[1] || '';
    return { id: (g('id') || ('custom-' + Date.now())).trim(), name: (g('name') || 'Sem nome').trim(), ver: (g('version') || '1.0.0').trim(), desc: (g('description') || 'Plugin personalizado').trim(), code: String(code) };
  },
  load() {
    try { this.list = JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (_) { this.list = []; }
    this.list.forEach(c => this.register(c, true));
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.list)); } catch (_) {} },
  register(c, silent) {
    if (!PLUGIN_DEFS.some(p => p.id === c.id)) PLUGIN_DEFS.push({ id: c.id, name: c.name + ' ✎', ver: c.ver, dl: '—', desc: c.desc, bg: 'linear-gradient(135deg,#334155,#0f172a)', ic: 'puzzle' });
    if (c.installed !== false) Plugins.installed[c.id] = c.ver;
    PLUGIN_META[c.id] = { vendor: 'Você', lic: 'MIT', rating: 100, reviews: 1, updated: 'agora', tags: ['custom'], feats: ['Comandos de terminal próprios', 'Hooks fs:save e app:boot', 'Acesso à API Thcode'] };
    try {
      new Function('Thcode', c.code)(ThcodeAPI.for(c.id));
      if (!silent) { toast('Plugin "' + c.name + '" ativo!', 'check'); clog('INFO', 'Plugin personalizado ativo: ' + c.id); }
    } catch (e) { toast('Erro no plugin ' + c.name, 'error'); clog('ERROR', 'Falha no plugin ' + c.id + ': ' + e.message); }
  },
  install(code) {
    const c = this.parse(code);
    if (PLUGIN_DEFS.some(p => p.id === c.id) && !c.id.startsWith('custom-')) { toast('ID já existe: ' + c.id, 'error'); return; }
    this.list = this.list.filter(x => x.id !== c.id);
    c.installed = true;
    this.list.push(c); this.save();
    installOverlay(c.name, c.ver, ['Lendo manifesto', 'Validando API', 'Ativando plugin'], () => {
      this.register(c, true);
      toast('Plugin "' + c.name + '" instalado!', 'check');
      if (Panel.current === 'plugins') Panel.render();
    });
  },
  fromFile() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.js';
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => this.install(String(r.result || ''));
      r.readAsText(f);
    };
    inp.click();
  },
  async fromURL() {
    const url = await dPrompt('Instalar da URL', 'https://', 'Cole o link do arquivo .js do plugin');
    if (!url) return;
    try {
      const r = await fetch(url);
      if (!r.ok) throw 0;
      this.install(await r.text());
    } catch (_) { toast('Falha ao baixar o plugin', 'error'); }
  },
  async newPlugin() {
    const name = await dPrompt('Novo plugin', '', 'Nome do plugin (ex: Meu Atalho)');
    if (!name) return;
    const code = this.template(name);
    const c = this.parse(code);
    fSet('/plugins/' + c.id + '.js', code);
    openFile('/plugins/' + c.id + '.js');
    this.install(code);
  },
  remove(id) {
    this.list = this.list.filter(x => x.id !== id); this.save();
    delete Plugins.installed[id];
    const i = PLUGIN_DEFS.findIndex(p => p.id === id);
    if (i >= 0) PLUGIN_DEFS.splice(i, 1);
    CustomCmds.list = CustomCmds.list.filter(c => c.pid !== id);
    computeCaps();
    toast('Plugin removido', 'trash');
    if (Panel.current === 'plugins') Panel.render();
  }
};

/* ==========================================================================
   THCODE v2 — Boot real + PWA + métricas
   ========================================================================== */
const Metrics = { bootMs: 0, counts: {}, count(k) { this.counts[k] = (this.counts[k] || 0) + 1; } };
let FSIndex = null;
function buildFSIndex() {
  const idx = { byExt: {}, total: 0, bytes: 0 };
  for (const [p, f] of Object.entries(FS.files)) {
    const e = (p.split('.').pop() || '').toLowerCase();
    (idx.byExt[e] = idx.byExt[e] || []).push(p);
    idx.total++; idx.bytes += ((f && f.c) || '').length;
  }
  return idx;
}
function warmHighlight() {
  try {
    const p = T.active || '/index.html';
    const f = fGet(p);
    if (f) highlight(f.c.slice(0, 6000), detectLang(p));
  } catch (_) {}
}
async function realBoot({ splash, fill, status, had }) {
  const log = $('#splashLog');
  const say = (t, ok) => {
    status.textContent = t;
    if (log) { const d = document.createElement('div'); d.className = ok ? 'ok' : ''; d.textContent = (ok ? '✓ ' : '› ') + t; log.appendChild(d); }
  };
  const set = p => { fill.style.width = p + '%'; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  try {
    say('Carregando settings.json…'); set(8); await wait(200);
    say(`settings.json ✓ (${Object.keys(S).length} chaves)`, true); set(18); await wait(150);
    say('Indexando workspace…'); set(30);
    FSIndex = buildFSIndex();
    say(`${FSIndex.total} arquivos indexados ✓`, true); set(44); await wait(150);
    computeCaps();
    const ids = Object.keys(Plugins.installed);
    say(`Carregando ${ids.length} plugins…`); set(56);
    for (const id of ids) { say('plugin: ' + id + ' v' + Plugins.installed[id]); await wait(80); }
    CustomPlugins.load();
    if (CustomPlugins.list.length) say(`${CustomPlugins.list.length} plugins personalizados ✓`, true);
    say(`${ids.length + CustomPlugins.list.length} plugins ativos ✓`, true); set(70); await wait(130);
    say('Restaurando sessão…'); warmHighlight(); set(86); await wait(170);
    say('Pronto ✓', true); set(100); await wait(230);
    Hooks.fire('app:boot');
  } catch (e) { say('Boot com avisos — seguindo…'); await wait(300); }
  splash.classList.add('hide');
  $('#app').classList.remove('hidden');
  $('#app').setAttribute('aria-hidden', 'false');
  if (!had || Panel._restoredOpen) Panel.open(Panel.current);
  renderEditor(); syncEditorScroll();
  setTimeout(() => splash.remove(), 450);
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  Metrics.bootMs = Math.round(now - BOOT_T0);
  clog('INFO', 'Thcode pronto em ' + Metrics.bootMs + 'ms');
}
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
function pwaInstall() {
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt = null; }); }
  else toast('Use "Adicionar à tela inicial" do navegador', 'info');
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ==========================================================================
   THCODE v2 — Navegador de preview (fiel aos prints)
   ========================================================================== */
function mdDoc(p) {
  const body = mdLite((fGet(p) || { c: '' }).c);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;padding:20px;max-width:760px;margin:auto;line-height:1.7;color:#1a1d21}pre{background:#f1f3f5;padding:12px;border-radius:8px;overflow:auto}code{background:#eef;font-size:.9em}a{color:#a100ff}h1{border-bottom:1px solid #eee;padding-bottom:8px}</style></head><body>${body}</body></html>`;
}
const Browser = {
  el: null, noCache: false,
  open(path) {
    const p = path || T.active || '/index.html';
    if (detectLang(p) === 'md' && !CAPS.md) { toast('Instale o plugin Markdown Preview', 'info'); PluginDetail.open('md-preview'); return; }
    this.close(true);
    const proto = location.protocol === 'https:' ? 'https' : 'http';
    const url = `${proto}://localhost:${S.previewPort}${normPath(p)}`;
    const el = document.createElement('div');
    el.className = 'browser';
    el.innerHTML = `<div class="browser-bar">
        <div class="browser-logo"><svg><use href="#i-logo"/></svg></div>
        <div class="browser-url">${esc(url)}</div>
        <button class="icon-btn" id="bRef" title="Recarregar">${icon('refresh')}</button>
        <button class="icon-btn" id="bMenu" title="Opções">${icon('menu')}</button>
      </div>
      <div class="browser-view" id="bView"><iframe class="browser-frame" id="bFrame" sandbox="allow-scripts allow-modals" title="preview"></iframe></div>
      <button class="browser-back" id="bExit">✕ Editor</button>`;
    document.body.appendChild(el);
    this.el = el;
    this.load(p);
    if (CAPS.devices && S.devPreset && S.devPreset !== 'off') this.applyPreset(S.devPreset);
    el.querySelector('#bRef').onclick = () => { this.load(p); toast('Página recarregada', 'refresh'); };
    el.querySelector('#bExit').onclick = () => this.close();
    el.querySelector('#bMenu').onclick = e => { e.stopPropagation(); this.menu(p); };
  },
  load(p) {
    if (!this.el) return;
    const frame = this.el.querySelector('#bFrame');
    const lang = detectLang(p);
    let html;
    if (lang === 'md' && CAPS.md) html = mdDoc(p);
    else if (lang === 'html') html = (fGet(p) || { c: '' }).c;
    else html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:monospace;background:#0b0e13;color:#e6e9ee;padding:20px;white-space:pre-wrap}</style></head><body>${esc(((fGet(p) || { c: 'Arquivo vazio' }).c).slice(0, 20000))}</body></html>`;
    if (this.noCache) html += `\n<!-- nocache ${Date.now()} -->`;
    frame.srcdoc = html;
  },
  menu(p) {
    document.querySelector('.browser-menu')?.remove();
    const m = document.createElement('div');
    m.className = 'browser-menu';
    const dev = CAPS.devices ? '' : ' (plugin)';
    m.innerHTML = `<button id="bmDev">${icon('mobile')}Devices<span style="margin-left:auto;font-size:11px;color:#8b95a3">${esc(S.devPreset || 'off')}</span></button>
      <button id="bmCache">${icon('zap')}Disable Cache<span class="ck${this.noCache ? ' on' : ''}">${this.noCache ? '✓' : ''}</span></button>
      <button id="bmExt">${icon('external')}Open in Browser</button>
      <button id="bmExit">${icon('close')}Exit</button>`;
    document.body.appendChild(m);
    const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } };
    setTimeout(() => document.addEventListener('click', off), 50);
    m.querySelector('#bmDev').onclick = () => { m.remove(); this.devices(); };
    m.querySelector('#bmCache').onclick = () => { this.noCache = !this.noCache; m.remove(); this.load(p); toast(this.noCache ? 'Cache desativado' : 'Cache ativado', 'zap'); };
    m.querySelector('#bmExt').onclick = () => {
      m.remove();
      try {
        const blob = new Blob([this.el.querySelector('#bFrame').srcdoc], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
      } catch (_) { toast('Não foi possível abrir externamente', 'error'); }
    };
    m.querySelector('#bmExit').onclick = () => this.close();
  },
  async devices() {
    if (!CAPS.devices) { toast('Instale o plugin Responsive Tester', 'info'); PluginDetail.open('resp-tester'); return; }
    const presets = [['off', 'Desligado (tela cheia)'], ['360', 'Phone 360px'], ['390', 'iPhone 390px'], ['414', 'Plus 414px'], ['768', 'Tablet 768px']];
    const v = await dList('Devices', presets.map(([val, label]) => ({ label: ((S.devPreset || 'off') === val ? '✓ ' : '') + label, hint: val === 'off' ? '—' : val + 'px', value: val, icon: 'mobile' })));
    if (v !== undefined && v !== null) this.applyPreset(v);
  },
  applyPreset(v) {
    S.devPreset = v; Store.save();
    const view = this.el?.querySelector('#bView'), frame = this.el?.querySelector('#bFrame');
    if (!view || !frame) return;
    if (v === 'off') { view.classList.remove('dev'); frame.style.maxWidth = ''; }
    else { view.classList.add('dev'); frame.style.maxWidth = v + 'px'; }
  },
  close(silent) {
    document.querySelector('.browser-menu')?.remove();
    if (!this.el) return;
    const el = this.el;
    this.el = null;
    if (silent) { el.remove(); return; }
    el.classList.add('closing');
    setTimeout(() => el.remove(), 200);
  }
};
Preview.open = function (path) { Metrics.count('preview'); Browser.open(path || T.active); };

/* ==========================================================================
   THCODE v2 — Conectores reais (GitHub + OpenRouter)
   ========================================================================== */
const Conn = {
  lastCheck: null,
  key() { try { return S.connKey || pset('ai-assistant').apiKey || pset('rutex-agent').apiKey || ''; } catch (_) { return S.connKey || ''; } },
  useReal() { return S.connReal && !!this.key(); },
  modelId(name) {
    const map = { 'OpenRouter': 'openrouter/auto', 'GPT-4o mini': 'openai/gpt-4o-mini', 'Claude 3.5 Sonnet': 'anthropic/claude-3.5-sonnet', 'DeepSeek V3': 'deepseek/deepseek-chat', 'Llama 3.1 70B': 'meta-llama/llama-3.1-70b-instruct', 'Gemini 1.5 Flash': 'google/gemini-flash-1.5', 'Rutex Zero': 'openrouter/auto', 'BlackBox AI': 'openrouter/auto' };
    return map[name] || 'openrouter/auto';
  },
  async check() {
    const out = { github: 'offline', openrouter: 'offline', net: navigator.onLine ? 'online' : 'offline' };
    try {
      const r = await Promise.race([fetch('https://api.github.com/rate_limit'), new Promise((_, rej) => setTimeout(() => rej(0), 7000))]);
      out.github = r.ok ? 'online' : 'erro';
    } catch (_) {}
    if (this.key()) {
      try {
        const r = await Promise.race([fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: 'Bearer ' + this.key() } }), new Promise((_, rej) => setTimeout(() => rej(0), 7000))]);
        out.openrouter = r.ok ? 'online' : (r.status === 401 ? 'chave inválida' : 'erro');
      } catch (_) {}
    } else out.openrouter = 'sem chave';
    this.lastCheck = new Date().toLocaleTimeString();
    this.status = out;
    return out;
  },
  async gh(path) {
    const r = await fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' } });
    if (r.status === 403) throw new Error('limite da API (tente mais tarde)');
    if (r.status === 404) throw new Error('não encontrado');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  },
  async chat(prompt, modelName, system) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.key(), 'HTTP-Referer': location.href, 'X-Title': 'Thcode' },
      body: JSON.stringify({ model: this.modelId(modelName), messages: [{ role: 'system', content: system || 'Você é um assistente de programação no app Thcode. Responda em pt-BR, com código quando útil.' }, { role: 'user', content: prompt }] })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(r.status === 401 ? 'chave inválida' : 'HTTP ' + r.status + ' ' + t.slice(0, 80));
    }
    const j = await r.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '(resposta vazia)';
  }
};
/* ---------- IA com API real ---------- */
const _streamReply = AI.streamReply.bind(AI);
AI.streamReply = async function (container, prompt, mode) {
  Metrics.count('ai');
  if (Conn.useReal()) {
    try { await this.streamReal(container, prompt, mode); return; }
    catch (e) { toast('API: ' + e.message + ' — modo offline', 'error'); }
  }
  _streamReply(container, prompt, mode);
};
AI.streamReal = async function (container, prompt, mode) {
  const boxSel = mode === 'agent' ? '#agentMsgs' : '#aiMsgs';
  const box = container.querySelector(boxSel);
  if (!box) return;
  this.streaming = true; this.stopFlag = false;
  const typing = document.createElement('div');
  typing.className = 'msg ai';
  typing.innerHTML = `<div class="who">${icon('hex')} RUTEX</div><span class="typing-dots"><i></i><i></i><i></i></span>`;
  box.appendChild(typing); box.scrollTop = box.scrollHeight;
  const model = mode === 'agent' ? this.model : ((S.pluginSettings && S.pluginSettings['ai-assistant'] && S.pluginSettings['ai-assistant'].model) || AI_MODELS[0]);
  try {
    const full = await Conn.chat(prompt, model);
    if (!document.contains(typing)) { this.streaming = false; return; }
    typing.remove();
    const msg = { role: 'ai', text: '\u{1F310} ' + full };
    if (mode === 'agent') { this.agentMsgs.push(msg); this.paintAgentMsgs(container); }
    else { this.currentChat().msgs.push(msg); this.paintChat(container); }
    Store.save();
  } catch (e) { typing.remove(); this.streaming = false; throw e; }
  this.streaming = false;
};
const _renderAssistant = AI.renderAssistant.bind(AI);
AI.renderAssistant = function (c) { _renderAssistant(c); if (this.aiTab === 'settings') AISettings.extra(c); };
const AISettings = {
  extra(container) {
    const alt = container.querySelector('#aiAlt');
    if (!alt || alt.querySelector('.api-real')) return;
    const box = document.createElement('div');
    box.className = 'api-real';
    box.innerHTML = `<div class="sect">API real (OpenRouter)</div>`;
    const keyRow = document.createElement('div');
    keyRow.className = 'schema-row';
    keyRow.innerHTML = `<div class="grow"><div class="t">API Key</div><div class="s">sk-or-… (somente neste aparelho)</div></div><input type="password" value="${esc(S.connKey)}" placeholder="••••••••" autocomplete="off">`;
    keyRow.querySelector('input').onchange = e => { S.connKey = e.target.value.trim(); Store.save(); toast('Chave salva localmente', 'lock'); };
    const tRow = document.createElement('div');
    tRow.className = 'schema-row';
    tRow.innerHTML = `<div class="grow"><div class="t">Usar API real</div><div class="s">${Conn.useReal() ? '● respostas via OpenRouter' : '○ modo offline (simulado)'}</div></div><div class="switch${S.connReal ? ' on' : ''}"></div>`;
    tRow.onclick = () => { S.connReal = !S.connReal; tRow.querySelector('.switch').classList.toggle('on', S.connReal); Store.save(); toast(S.connReal ? 'API real ativada' : 'Modo offline', 'ai'); AI.renderAssistant(container); };
    box.appendChild(keyRow); box.appendChild(tRow);
    if (Plugins.isInstalled('blackbox-ai')) {
      const bb = document.createElement('div');
      bb.className = 'schema-row';
      bb.innerHTML = `<div class="grow"><div class="t">BlackBox AI</div><div class="s">Provider: ${esc(pset('blackbox-ai').provider || 'openai')}</div></div>${icon('chevron', 'width:16px;height:16px;color:var(--muted2)')}`;
      bb.onclick = () => PluginSettings.open('blackbox-ai');
      box.appendChild(bb);
    }
    const test = document.createElement('div');
    test.className = 'btn-row';
    test.innerHTML = `<button class="big-btn" id="aiTest">Testar conexão</button>`;
    test.querySelector('#aiTest').onclick = async () => {
      toast('Testando OpenRouter…', 'ai');
      await Conn.check();
      toast('OpenRouter: ' + (Conn.status ? Conn.status.openrouter : '?'), (Conn.status && Conn.status.openrouter === 'online') ? 'check' : 'error');
    };
    box.appendChild(test);
    alt.appendChild(box);
  }
};
/* ---------- GitHub com API real ---------- */
GH.render = function () {
  Panel.setHead('GitHub', 'Repositórios', [
    { ic: 'search', fn: () => { const q = prompt('Buscar usuário GitHub:', GH.user || ''); if (q !== null) { GH.user = q.trim(); Panel.render(); } } }
  ]);
  const body = $('#panelBody');
  body.innerHTML = `<div class="search-bar"><input class="input" id="ghQ" placeholder="Usuário GitHub…" value="${esc(GH.user || '')}"></div><div id="ghBody"><div class="empty">Digite um usuário e toque em Buscar.<br><span style="font-size:11px">Dados reais via api.github.com • offline mostra cache.</span><br><br><button class="big-btn primary" id="ghGo" style="max-width:220px;margin:auto">Buscar</button></div></div>`;
  body.querySelector('#ghGo').onclick = () => { GH.user = body.querySelector('#ghQ').value.trim(); this.fetch(); };
  body.querySelector('#ghQ').addEventListener('keydown', e => { if (e.key === 'Enter') { GH.user = e.target.value.trim(); this.fetch(); } });
  if (GH.user) this.fetch();
};
GH.fetch = async function () {
  const box = $('#ghBody');
  if (!box) return;
  const u = GH.user;
  box.innerHTML = '<div class="empty">Buscando @' + esc(u) + '…</div>';
  try {
    const [user, repos] = await Promise.all([Conn.gh('/users/' + encodeURIComponent(u)), Conn.gh('/users/' + encodeURIComponent(u) + '/repos?per_page=8&sort=updated')]);
    try { localStorage.setItem('thcode.gh.' + u.toLowerCase(), JSON.stringify({ user, repos })); } catch (_) {}
    this.paint(box, u, user, repos, true);
  } catch (e) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem('thcode.gh.' + u.toLowerCase())); } catch (_) {}
    if (cached) this.paint(box, u, cached.user, cached.repos, false, 'offline — mostrando cache');
    else {
      box.innerHTML = `<div class="empty">Falha: ${esc(e.message)}.<br>Verifique a conexão.<br><br><button class="big-btn" id="ghRetry" style="max-width:220px;margin:auto">Tentar de novo</button></div>`;
      box.querySelector('#ghRetry').onclick = () => GH.fetch();
    }
  }
};
GH.paint = function (box, u, user, repos, live, warn) {
  const mgr = Plugins.isInstalled('gh-manager');
  box.innerHTML = `<div class="row"><img src="${esc(user.avatar_url)}" style="width:44px;height:44px;border-radius:50%" alt=""><div class="grow"><div class="t">${esc(user.name || user.login)} ${live ? '<span class="tag">● real</span>' : '<span class="tag">cache</span>'}</div><div class="s">@${esc(user.login)} • ${user.followers} seguidores • ${user.public_repos} repos</div></div></div>
    ${warn ? `<div class="note warn">⚠ ${esc(warn)}</div>` : ''}
    ${mgr ? `<div class="pd-tabs" style="margin-top:4px"><button data-t="r" class="sel">Repos</button><button data-t="i">Issues</button><button data-t="p">PRs</button></div><div id="ghTabs"></div>` : `<div class="sect">Repositórios atualizados</div><div id="ghRepos"></div>`}`;
  const paintRepos = el => {
    el.innerHTML = repos.length ? repos.map(r => `<div class="row" data-r="${esc(r.full_name)}">${icon('github')}<div class="grow"><div class="t">${esc(r.name)}</div><div class="s">⭐ ${r.stargazers_count} • 🍴 ${r.forks_count}${r.language ? ' • ' + esc(r.language) : ''}</div></div><button class="mini-btn">Clonar</button></div>`).join('') : '<div class="empty">Sem repositórios.</div>';
    el.querySelectorAll('.row').forEach(row => row.querySelector('button').onclick = async ev => {
      ev.stopPropagation();
      toast('Clonando ' + row.dataset.r + '…', 'github');
      try {
        const rd = await fetch(`https://api.github.com/repos/${row.dataset.r}/readme`, { headers: { Accept: 'application/vnd.github.raw' } });
        const name = row.dataset.r.split('/')[1];
        fSet(`/${name}/README.md`, rd.ok ? (await rd.text()).slice(0, 20000) : '# ' + name);
        Panel.open('files');
        toast('Clonado com README real ✓', 'check');
      } catch (_) { toast('Falha de rede', 'error'); }
    });
  };
  if (mgr) {
    const tabs = box.querySelector('#ghTabs');
    paintRepos(tabs);
    box.querySelectorAll('.pd-tabs button').forEach(b => b.onclick = async () => {
      box.querySelectorAll('.pd-tabs button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      if (b.dataset.t === 'r') return paintRepos(tabs);
      tabs.innerHTML = '<div class="empty">Carregando…</div>';
      try {
        const repo = repos[0];
        if (!repo) { tabs.innerHTML = '<div class="empty">Sem repos.</div>'; return; }
        const items = await Conn.gh(`/repos/${repo.full_name}/${b.dataset.t === 'i' ? 'issues?per_page=5' : 'pulls?per_page=5'}`);
        tabs.innerHTML = items.length ? items.map(i => `<div class="row">${icon(b.dataset.t === 'i' ? 'alert' : 'git')}<div class="grow"><div class="t">${esc(i.title)}</div><div class="s">#${i.number} • ${esc(i.state)}</div></div></div>`).join('') : '<div class="empty">Nada aqui.</div>';
      } catch (e) { tabs.innerHTML = `<div class="empty">Falha: ${esc(e.message)}</div>`; }
    });
  } else paintRepos(box.querySelector('#ghRepos'));
};
/* ---------- Serviços / Métricas / Diagnóstico / Descobrir / Legal ---------- */
SettingsPage.services = function () {
  Page.open('services', 'Serviços conectados', async el => {
    el.innerHTML = '<div class="empty">Verificando serviços…</div>';
    const st = await Conn.check();
    const dot = v => v === 'online' ? 'ok pulse' : (v === 'sem chave' ? 'warn' : 'off');
    el.innerHTML = `<div class="diag-row"><div class="svc-dot ${dot(st.github)}"></div><div class="grow"><div class="t">GitHub API</div><div class="s">api.github.com • ${esc(st.github)} • dados reais de usuários e repos</div></div></div>
      <div class="diag-row"><div class="svc-dot ${dot(st.openrouter)}"></div><div class="grow"><div class="t">OpenRouter</div><div class="s">openrouter.ai • ${esc(st.openrouter)} • ${Conn.useReal() ? 'respostas reais ATIVADAS' : 'ative com sua chave nas configurações de IA'}</div></div><button class="mini-btn" id="svcKey">Chave</button></div>
      <div class="diag-row"><div class="svc-dot ok"></div><div class="grow"><div class="t">Registro de plugins</div><div class="s">${PLUGIN_DEFS.length} plugins no catálogo • ${Object.keys(Plugins.installed).length} instalados</div></div><button class="mini-btn" id="svcPlug">Ver</button></div>
      <div class="diag-row"><div class="svc-dot ok"></div><div class="grow"><div class="t">Atualização</div><div class="s">Thcode ${APP_VER} • canal estável${Conn.lastCheck ? ' • verificado às ' + Conn.lastCheck : ''}</div></div><button class="mini-btn" id="svcUpd">Verificar</button></div>
      <div class="btn-row"><button class="big-btn primary" id="svcTest">Testar tudo de novo</button></div>`;
    el.querySelector('#svcKey').onclick = () => { Panel.open('ai'); setTimeout(() => { AI.aiTab = 'settings'; Panel.render(); }, 60); };
    el.querySelector('#svcPlug').onclick = () => Page.open('plugins', 'Plugins', p => renderPlugins(p, true));
    el.querySelector('#svcUpd').onclick = () => { Notifs.push('Atualização', 'Thcode ' + APP_VER + ' está atualizado.', 'refresh'); toast('Thcode está atualizado ✓', 'check'); };
    el.querySelector('#svcTest').onclick = () => this.services();
  }, false);
};
SettingsPage.metrics = function () {
  Page.open('metrics', 'Métricas', el => {
    let lsBytes = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); lsBytes += (localStorage.getItem(k) || '').length; } } catch (_) {}
    const files = Object.keys(FS.files).length;
    const bytes = Object.values(FS.files).reduce((a, f) => a + ((f && f.c) || '').length, 0);
    const lines = Object.values(FS.files).reduce((a, f) => a + ((f && f.c) || '').split('\n').length, 0);
    const mem = (performance && performance.memory) ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : '—';
    const m = (v, l) => `<div class="metric"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    el.innerHTML = `<div class="sect">Desempenho</div><div class="metric-grid">
      ${m(Metrics.bootMs + ' ms', 'Tempo de boot')}${m(document.querySelectorAll('*').length, 'Nós DOM')}${m(mem, 'Memória JS')}${m((Metrics.counts.ai || 0), 'Chamadas de IA')}</div>
      <div class="sect">Workspace</div><div class="metric-grid">
      ${m(files, 'Arquivos')}${m(lines.toLocaleString('pt-BR'), 'Linhas de código')}${m((bytes / 1024).toFixed(1) + ' KB', 'Tamanho do código')}${m((Metrics.counts.preview || 0), 'Previews abertos')}</div>
      <div class="sect">Armazenamento</div><div class="metric-grid">
      ${m((lsBytes / 1024).toFixed(1) + ' KB', 'localStorage usado')}${m(Object.keys(Plugins.installed).length, 'Plugins ativos')}</div>`;
  }, false);
};
SettingsPage.diagnostics = function () {
  Page.open('diag', 'Diagnóstico', el => {
    const rows = [];
    const add = (st, t, s) => rows.push(`<div class="diag-row"><div class="diag-ic ${st}">${icon(st === 'ok' ? 'check' : st === 'warn' ? 'alert' : 'info')}</div><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div></div>`);
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); add('ok', 'Armazenamento', 'localStorage funcionando.'); }
    catch (_) { add('warn', 'Armazenamento', 'localStorage indisponível — nada será salvo.'); }
    add(navigator.onLine ? 'ok' : 'warn', 'Rede', navigator.onLine ? 'Online — APIs reais disponíveis.' : 'Offline — usando cache e simulação.');
    add('info', 'Tela', `${screen.width}×${screen.height} • ${matchMedia('(orientation: landscape)').matches ? 'paisagem' : 'retrato'}.`);
    const upd = Object.keys(Plugins.updates).length;
    add(upd ? 'warn' : 'ok', 'Plugins', upd ? `${upd} atualização(ões) pendente(s).` : 'Todos os plugins atualizados.');
    add(Conn.key() ? 'ok' : 'info', 'API de IA', Conn.key() ? (Conn.useReal() ? 'Chave configurada e API real ATIVA.' : 'Chave configurada (modo offline selecionado).') : 'Sem chave — IA roda em modo offline.');
    add('ServiceWorker' in navigator ? 'ok' : 'warn', 'PWA', 'ServiceWorker' in navigator ? 'Suportado — app instalável.' : 'Não suportado neste navegador.');
    el.innerHTML = rows.join('') + `<div class="btn-row"><button class="big-btn" id="dgCopy">Copiar relatório</button><button class="big-btn primary" id="dgFix">Corrigir tudo</button></div>`;
    el.querySelector('#dgCopy').onclick = () => { navigator.clipboard?.writeText(`Thcode ${APP_VER} — boot ${Metrics.bootMs}ms — plugins ${Object.keys(Plugins.installed).length} — ${navigator.onLine ? 'online' : 'offline'}`); toast('Relatório copiado', 'check'); };
    el.querySelector('#dgFix').onclick = () => {
      Object.keys(Plugins.updates).forEach(id => Plugins.update(id));
      toast(upd ? 'Atualizando plugins…' : 'Nada a corrigir ✓', upd ? 'refresh' : 'check');
    };
  }, false);
};
SettingsPage.discover = function () {
  const items = [
    ['Acode Editor', 'O editor original que inspirou o Thcode', 'https://acode.foxdebug.com', 'linear-gradient(135deg,#a100ff,#5b21b6)', 'logo'],
    ['Acode no GitHub', 'Código-fonte original (GPL-3.0)', 'https://github.com/Acode-Foundation/Acode', 'linear-gradient(135deg,#111827,#374151)', 'github'],
    ['Thcode Repo', 'Repositório deste projeto', THCODE_REPO, 'linear-gradient(135deg,#a100ff,#ec4899)', 'logo'],
    ['OpenRouter', 'Centenas de modelos de IA, uma API', 'https://openrouter.ai', 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'ai'],
    ['GitHub', 'Hospede e colabore em código', 'https://github.com', 'linear-gradient(135deg,#111827,#000)', 'github'],
    ['MDN Web Docs', 'Referência de HTML, CSS e JS', 'https://developer.mozilla.org', 'linear-gradient(135deg,#1e293b,#0ea5e9)', 'book'],
    ['Node.js', 'JavaScript no servidor', 'https://nodejs.org', 'linear-gradient(135deg,#22c55e,#14532d)', 'hex'],
    ['Python', 'Linguagem Python oficial', 'https://python.org', 'linear-gradient(135deg,#3776ab,#ffd43b)', 'files'],
    ['Stack Overflow', 'Perguntas e respostas dev', 'https://stackoverflow.com', 'linear-gradient(135deg,#f97316,#7c2d12)', 'help'],
    ['OpenAI', 'Modelos GPT e API', 'https://openai.com', 'linear-gradient(135deg,#10a37f,#0d5c46)', 'ai'],
    ['Google AI', 'Gemini e AI Studio', 'https://ai.google', 'linear-gradient(135deg,#4285f4,#34a853)', 'ai'],
    ['Anthropic', 'Claude e API', 'https://anthropic.com', 'linear-gradient(135deg,#d97706,#92400e)', 'ai']
  ];
  Page.open('discover', 'Descobrir', el => {
    if (CAPS.academy) {
      const lessons = [
        ['Terminal Linux', 'cd, ls, pipes e variáveis', 'cd /MeuJarvis\nls -la\ncat index.html | head -n 20\nNOME=Thcode && echo Olá $NOME'],
        ['Plugins', 'Detalhes, configurações e API própria', 'Toque num plugin para ver detalhes.\nUse ⚙ para configurar.\nCrie o seu em Plugins → ＋ Novo.'],
        ['IA real', 'Chat, agente e OpenRouter', 'Ative sua chave em AI → Configurações.\nUse CTX no agente para anexar arquivos.']
      ];
      const box = document.createElement('div');
      box.innerHTML = '<div class="sect">🎓 Tutoriais Thcode Academy</div>' + lessons.map((l, i) => `<div class="diag-row" data-i="${i}" style="cursor:pointer"><div class="diag-ic info">${icon('book')}</div><div class="grow"><div class="t">${l[0]}</div><div class="s">${l[1]}</div></div></div>`).join('');
      el.appendChild(box);
      box.querySelectorAll('.diag-row').forEach(r => r.onclick = () => dAlert(lessons[+r.dataset.i][0], `<pre style="white-space:pre-wrap;font-size:12px">${esc(lessons[+r.dataset.i][2])}</pre>`));
    }
    el.innerHTML += `<div class="discover-grid">${items.map(([t, s, u, bg, ic]) => `<div class="disc-card" data-u="${esc(u)}"><div class="plugin-ico" style="background:${bg}">${icon(ic)}</div><b>${esc(t)}</b><span>${esc(s)}</span><span class="go">Abrir ↗</span></div>`).join('')}</div>`;
    el.querySelectorAll('.disc-card').forEach(c => c.onclick = () => { try { window.open(c.dataset.u, '_blank'); } catch (_) { toast('Não foi possível abrir', 'error'); } });
  }, false);
};
SettingsPage.legal = function () {
  Page.open('legal', 'Termos e Privacidade', el => {
    el.innerHTML = '';
    el.appendChild(setRow('book', 'Termos de Serviço', 'Regras de uso do Thcode.', () => this.terms()));
    el.appendChild(setRow('lock', 'Política de Privacidade', 'Como seus dados são tratados.', () => this.privacy()));
    el.appendChild(setRow('info', 'Avisos', 'Licenças e créditos de terceiros.', () => this.notices()));
    note(el, 'Última atualização: <b>28/09/2026</b> • Versão ' + APP_VER);
  }, false);
};
SettingsPage.terms = function () {
  Page.open('terms', 'Termos de Serviço', el => {
    el.innerHTML = `<div class="legal"><div class="upd">Vigência: 28/09/2026 • Thcode ${APP_VER}</div>
    <h2>1. O serviço</h2><p>Thcode é um editor de código mobile open-source (licença MIT). O app roda 100% no seu aparelho: arquivos, configurações e plugins ficam salvos localmente.</p>
    <h2>2. Uso aceitável</h2><ul><li>Você pode usar, copiar, modificar e distribuir o Thcode conforme a licença MIT.</li><li>Não use o app para violar leis ou direitos de terceiros.</li><li>Chaves de API são de sua responsabilidade: nunca as compartilhe.</li></ul>
    <h2>3. Serviços de terceiros</h2><p>Recursos opcionais usam APIs externas (GitHub, OpenRouter). Ao ativá-los, aplicam-se também os termos desses provedores. O Thcode não se responsabiliza por indisponibilidade ou cobrança desses serviços.</p>
    <h2>4. Garantias</h2><p>O software é fornecido "COMO ESTÁ", sem garantias. Em nenhuma hipótese os autores serão responsáveis por perda de dados — mantenha backups.</p>
    <h2>5. Contato</h2><p>Abra uma issue no repositório oficial: ${esc(THCODE_REPO)}.</p></div>`;
  }, false);
};
SettingsPage.privacy = function () {
  Page.open('privacy', 'Política de Privacidade', el => {
    el.innerHTML = `<div class="legal"><div class="upd">Vigência: 28/09/2026 • Thcode ${APP_VER}</div>
    <h2>1. Dados locais</h2><p>Todo o seu código, configurações, histórico de terminal e contas locais ficam <b>somente no seu aparelho</b> (localStorage). O Thcode não possui servidor próprio e não coleta, transmite ou vende seus dados.</p>
    <h2>2. Chaves de API</h2><p>Chaves (OpenRouter, OpenAI, Gemini etc.) são armazenadas apenas localmente e enviadas <b>somente</b> ao provedor escolhido, quando você ativa a API real.</p>
    <h2>3. Rede</h2><ul><li><b>GitHub:</b> buscas de usuário/repos via api.github.com (sem autenticação).</li><li><b>OpenRouter:</b> apenas com sua chave e autorização.</li><li><b>Diagnóstico:</b> nenhuma telemetria é enviada.</li></ul>
    <h2>4. Seus direitos</h2><p>Você pode exportar (backup JSON) ou apagar tudo a qualquer momento em Configurações → Restaurar original.</p></div>`;
  }, false);
};
SettingsPage.notices = function () {
  Page.open('notices', 'Avisos de Terceiros', el => {
    el.innerHTML = `<div class="legal"><div class="upd">Thcode ${APP_VER} • base Acode ${ACODE_BASE}</div>
    <h2>Licenças</h2><ul><li><b>Thcode</b> — MIT (este projeto).</li><li><b>Acode</b> — GPL-3.0, © Acode-Foundation. Interface e fluxos inspirados no original.</li></ul>
    <h2>Serviços</h2><ul><li><b>GitHub API</b> — © GitHub, Inc. Termos em docs.github.com.</li><li><b>OpenRouter</b> — Termos em openrouter.ai/terms.</li><li><b>Fontes do sistema</b> — sem dependências externas; o app funciona offline.</li></ul>
    <h2>Marcas</h2><p>Android, Google Play e marcas de terceiros pertencem aos seus detentores.</p></div>`;
  }, false);
};

/* ==========================================================================
   THCODE v2 — Contas locais (hash + sessão)
   ========================================================================== */
const Auth = {
  KEY: 'thcode.users.v1', SES: 'thcode.session.v1',
  users() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (_) { return []; } },
  saveU(u) { try { localStorage.setItem(this.KEY, JSON.stringify(u)); } catch (_) {} },
  hash(pw, salt) {
    let h1 = 0xdeadbeef ^ salt.length, h2 = 0x41c6ce57 ^ pw.length;
    const s = salt + '::' + pw;
    for (let i = 0; i < s.length; i++) { const ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  },
  current() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SES));
      return s ? this.users().find(u => u.email === s.email) || null : null;
    } catch (_) { return null; }
  },
  register(name, email, pw) {
    email = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
    if (pw.length < 4) throw new Error('Senha muito curta (mín. 4).');
    const users = this.users();
    if (users.some(u => u.email === email)) throw new Error('Este e-mail já está cadastrado.');
    const salt = Math.random().toString(36).slice(2);
    users.push({ name: name.trim() || email.split('@')[0], email, salt, hash: this.hash(pw, salt), created: Date.now() });
    this.saveU(users);
    localStorage.setItem(this.SES, JSON.stringify({ email }));
  },
  login(email, pw) {
    email = email.trim().toLowerCase();
    const u = this.users().find(x => x.email === email);
    if (!u || u.hash !== this.hash(pw, u.salt)) throw new Error('E-mail ou senha incorretos.');
    localStorage.setItem(this.SES, JSON.stringify({ email }));
    return u;
  },
  logout() { try { localStorage.removeItem(this.SES); } catch (_) {} },
  dialog() {
    const me = this.current();
    if (me) return this.account(me);
    const ov = document.createElement('div');
    ov.className = 'install-ov';
    ov.innerHTML = `<div class="install-card"><h3>Conta Thcode</h3><div class="sub">local • sem servidor • seus dados ficam no aparelho</div>
      <div class="pd-tabs"><button data-t="in" class="sel">Entrar</button><button data-t="up">Criar conta</button></div>
      <div style="padding:14px 2px 4px;display:flex;flex-direction:column;gap:10px">
        <input class="input" id="auName" placeholder="Nome (só p/ criar conta)">
        <input class="input" id="auEmail" placeholder="E-mail" type="email" autocomplete="off">
        <input class="input" id="auPw" placeholder="Senha" type="password">
        <div id="auErr" style="color:var(--red);font-size:12px;min-height:16px"></div>
      </div>
      <div class="btn-row"><button class="big-btn" id="auCancel">Cancelar</button><button class="big-btn primary" id="auGo">Entrar</button></div></div>`;
    document.body.appendChild(ov);
    let mode = 'in';
    const paint = () => {
      ov.querySelectorAll('.pd-tabs button').forEach(b => b.classList.toggle('sel', b.dataset.t === mode));
      ov.querySelector('#auName').style.display = mode === 'up' ? '' : 'none';
      ov.querySelector('#auGo').textContent = mode === 'up' ? 'Criar conta' : 'Entrar';
    };
    ov.querySelectorAll('.pd-tabs button').forEach(b => b.onclick = () => { mode = b.dataset.t; paint(); });
    ov.querySelector('#auCancel').onclick = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    paint();
    ov.querySelector('#auGo').onclick = () => {
      const err = ov.querySelector('#auErr');
      try {
        if (mode === 'up') { this.register(ov.querySelector('#auName').value, ov.querySelector('#auEmail').value, ov.querySelector('#auPw').value); toast('Conta criada! 🎉', 'check'); }
        else { this.login(ov.querySelector('#auEmail').value, ov.querySelector('#auPw').value); toast('Bem-vindo de volta!', 'check'); }
        Notifs.push('Conta', (mode === 'up' ? 'Conta criada: ' : 'Login: ') + ov.querySelector('#auEmail').value.trim(), 'user');
        ov.remove();
      } catch (e) { err.textContent = e.message; }
    };
  },
  account(me) {
    Page.open('account', 'Minha conta', el => {
      el.innerHTML = `<div class="pd-hero"><div class="avatar" style="width:76px;height:76px;font-size:30px;background:linear-gradient(135deg,var(--accent),var(--accent2))">${esc((me.name || 'U')[0].toUpperCase())}</div>
        <div class="pd-name">${esc(me.name)}</div><div class="pd-chips"><span class="pd-chip">✉ ${esc(me.email)}</span><span class="pd-chip">${State.pro ? '👑 Thcode PRO' : 'Plano gratuito'}</span></div></div>
        <div class="btn-row"><button class="big-btn" id="acOut">Sair</button><button class="big-btn primary" id="acPro">${State.pro ? 'Gerenciar PRO' : 'Assinar PRO'}</button></div>`;
      el.querySelector('#acOut').onclick = () => { this.logout(); Page.back(); toast('Sessão encerrada', 'info'); };
      el.querySelector('#acPro').onclick = () => {
        State.pro = !State.pro; Store.save(); refreshPro();
        Notifs.push('Thcode PRO', State.pro ? 'Acesso vitalício sem anúncios ativado.' : 'Assinatura cancelada.', 'star');
        Page.rerender();
      };
    }, false);
  }
};
/* ==========================================================================
   THCODE v2 — Ferramentas dos plugins (paleta de comandos)
   ========================================================================== */
function gotoLine(path, ln) {
  openFile(path);
  setTimeout(() => {
    const v = Ed.input.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(ln - 1, v.length); i++) pos += v[i].length + 1;
    Ed.input.focus();
    try { Ed.input.setSelectionRange(pos, pos + (v[ln - 1] || '').length); } catch (_) {}
    Ed.updateCursor();
  }, 80);
}
const Tools = {
  _need(pid) { toast('Instale o plugin para usar', 'info'); PluginDetail.open(pid); },
  palette() {
    if (!Plugins.isInstalled('color-palette')) return this._need('color-palette');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    const src = (fGet(T.active) || { c: '' }).c;
    const cols = [...new Set([...src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0]).concat([...src.matchAll(/rgba?\([^)]+\)/g)].map(m => m[0])))].slice(0, 40);
    Page.open('toolpal', 'Paleta do arquivo', el => {
      el.innerHTML = cols.length ? `<div class="discover-grid">${cols.map(c => `<div class="disc-card" data-c="${esc(c)}"><div style="height:44px;border-radius:9px;background:${esc(c)};border:1px solid var(--line)"></div><b style="font-family:var(--font-code);font-size:11px">${esc(c)}</b><span class="go">Copiar</span></div>`).join('')}</div>` : '<div class="empty">Nenhuma cor encontrada neste arquivo.</div>';
      el.querySelectorAll('.disc-card').forEach(d => d.onclick = () => { navigator.clipboard?.writeText(d.dataset.c); toast(d.dataset.c + ' copiado', 'check'); });
    }, false);
  },
  todos() {
    if (!Plugins.isInstalled('todo-tree')) return this._need('todo-tree');
    const hits = [];
    for (const [p, f] of Object.entries(FS.files)) {
      ((f && f.c) || '').split('\n').forEach((l, i) => {
        const m = l.match(/(TODO|FIXME|XXX|HACK|NOTE)\s*:?\s*(.*)/);
        if (m) hits.push({ p, ln: i + 1, tag: m[1], txt: m[2].trim().slice(0, 80) });
      });
    }
    Page.open('tooltodo', `TODOs (${hits.length})`, el => {
      el.innerHTML = hits.length ? hits.map(h => `<div class="row" data-p="${esc(h.p)}" data-l="${h.ln}"><span class="tag">${h.tag}</span><div class="grow"><div class="t">${esc(h.txt) || '(sem texto)'}</div><div class="s">${esc(h.p)}:${h.ln}</div></div></div>`).join('') : '<div class="empty">Nenhum TODO no projeto. 🎉</div>';
      el.querySelectorAll('.row').forEach(r => r.onclick = () => { Page.close(); gotoLine(r.dataset.p, +r.dataset.l); });
    }, false);
  },
  lint() {
    if (!Plugins.isInstalled('eslint')) return this._need('eslint');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    const rules = pset('eslint');
    const issues = [];
    ((fGet(T.active) || { c: '' }).c).split('\n').forEach((l, i) => {
      if (rules.noConsole && /console\.(log|warn|error)/.test(l)) issues.push({ ln: i + 1, msg: 'console.* encontrado (no-console)', lv: 'warn' });
      if (rules.semi && detectLang(T.active) === 'js' && /^\s*(const|let|var|return|import|export|await).*\S$/.test(l) && !/[;{}:]$/.test(l.trim())) issues.push({ ln: i + 1, msg: 'Falta ponto e vírgula (semi)', lv: 'warn' });
      if (/\t/.test(l) && S.tabsToSpaces) issues.push({ ln: i + 1, msg: 'Tab onde há espaços (indent)', lv: 'info' });
    });
    Page.open('toollint', `Lint (${issues.length})`, el => {
      el.innerHTML = issues.length ? issues.map(x => `<div class="diag-row" data-l="${x.ln}"><div class="diag-ic ${x.lv === 'warn' ? 'warn' : 'info'}">${icon('alert')}</div><div class="grow"><div class="t">Linha ${x.ln}</div><div class="s">${esc(x.msg)}</div></div></div>`).join('') + `<div class="btn-row"><button class="big-btn" id="lintCfg">Regras</button></div>` : '<div class="empty">Nenhum problema. ✨</div>';
      el.querySelectorAll('.diag-row').forEach(r => r.onclick = () => { Page.close(); gotoLine(T.active, +r.dataset.l); });
      el.querySelector('#lintCfg')?.addEventListener('click', () => PluginSettings.open('eslint'));
    }, false);
  },
  jsonValidate() {
    if (!Plugins.isInstalled('json-tools')) return this._need('json-tools');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    try { JSON.parse(Ed.input.value); dAlert('JSON válido', '✓ O arquivo <b>' + esc(baseName(T.active)) + '</b> é um JSON válido.'); }
    catch (e) { dAlert('JSON inválido', '✕ ' + esc(e.message)); }
  },
  jsonMin() {
    if (!Plugins.isInstalled('json-tools')) return this._need('json-tools');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    try {
      const min = JSON.stringify(JSON.parse(Ed.input.value));
      Ed.pushUndo(T.active, Ed.input.value);
      Ed.input.value = min; Ed.onEdit(true); saveFile(T.active, min);
      toast('JSON minificado ✓', 'check');
    } catch (e) { toast('JSON inválido: ' + e.message, 'error'); }
  },
  gitQuick() {
    if (!Plugins.isInstalled('git-scm')) return this._need('git-scm');
    const dirty = Object.keys(T.dirty);
    Page.open('toolgit', 'Git rápido', el => {
      el.innerHTML = `<div class="diag-row"><div class="diag-ic info">${icon('git')}</div><div class="grow"><div class="t">branch main</div><div class="s">${dirty.length} arquivo(s) modificado(s) (simulado)</div></div></div>
      ${dirty.map(p => `<div class="row">${icon('file')}<div class="grow"><div class="t">${esc(baseName(p))}</div><div class="s">${esc(p)}</div></div><span class="tag">M</span></div>`).join('')}
      <div class="btn-row"><button class="big-btn primary" id="gCommit">Commit</button></div>`;
      el.querySelector('#gCommit').onclick = async () => {
        const msg = await dPrompt('Commit', '', 'Mensagem do commit');
        if (!msg) return;
        clog('INFO', 'git commit: ' + msg);
        Notifs.push('Git', 'Commit "' + msg + '" (simulado).', 'git');
        toast('Commit criado (simulado) ✓', 'check');
      };
    }, false);
  },
  apk() {
    if (!Plugins.isInstalled('android-builder')) return this._need('android-builder');
    Page.open('toolapk', 'Build APK', el => {
      el.innerHTML = `<div class="install-bar" style="margin:16px"><i id="apkBar"></i></div><div class="install-steps" id="apkSteps" style="padding:0 16px"></div><div class="btn-row"><button class="big-btn primary" id="apkGo">Iniciar build</button></div>`;
      el.querySelector('#apkGo').onclick = () => {
        const steps = ['Coletando arquivos', 'Compilando (aapt)', 'Assinando (debug)', 'Alinhando (zipalign)'];
        const box = el.querySelector('#apkSteps'), bar = el.querySelector('#apkBar');
        box.innerHTML = steps.map(s => `<div class="istep">${icon('clock')}<span>${s}</span></div>`).join('');
        const rows = [...box.children];
        let i = 0;
        const next = () => {
          if (i > 0) { rows[i - 1].classList.replace('doing', 'done'); rows[i - 1].querySelector('svg').outerHTML = icon('check'); }
          if (i >= rows.length) { bar.style.width = '100%'; toast('app-debug.apk gerado (12,4 MB) — simulado', 'check'); return; }
          rows[i].classList.add('doing'); rows[i].querySelector('svg').outerHTML = icon('refresh');
          bar.style.width = ((i + 1) / rows.length * 100) + '%';
          i++; setTimeout(next, 600);
        };
        next();
      };
    }, false);
  },
  stats() {
    if (!Plugins.isInstalled('git-dust')) return this._need('git-dust');
    const byLang = {};
    let lines = 0;
    for (const [p, f] of Object.entries(FS.files)) {
      const L = LANGS[detectLang(p)];
      byLang[L.name] = byLang[L.name] || { n: 0, l: 0, c: L.color };
      byLang[L.name].n++; const k = ((f && f.c) || '').split('\n').length; byLang[L.name].l += k; lines += k;
    }
    const rows = Object.entries(byLang).sort((a, b) => b[1].l - a[1].l);
    const max = rows[0] ? rows[0][1].l : 1;
    Page.open('toolstats', 'Estatísticas', el => {
      el.innerHTML = `<div class="metric-grid"><div class="metric"><div class="v">${rows.reduce((a, r) => a + r[1].n, 0)}</div><div class="l">Arquivos</div></div><div class="metric"><div class="v">${lines.toLocaleString('pt-BR')}</div><div class="l">Linhas</div></div></div>` +
        rows.map(([n, d]) => `<div class="diag-row"><div class="grow"><div class="t">${esc(n)} — ${d.n} arq • ${d.l.toLocaleString('pt-BR')} linhas</div><div class="install-bar" style="margin-top:8px"><i style="width:${(d.l / max * 100).toFixed(1)}%;background:${d.c}"></i></div></div></div>`).join('');
    }, false);
  },
  askAI() {
    if (!Plugins.isInstalled('ai-sidebar')) return this._need('ai-sidebar');
    const sel = Ed.input.value.slice(Ed.input.selectionStart, Ed.input.selectionEnd).trim();
    if (!sel) { toast('Selecione um trecho de código primeiro', 'info'); return; }
    Panel.open('agent');
    setTimeout(() => {
      const inp = document.querySelector('#agentIn');
      if (inp) { inp.value = `Explique este código:\n\n${sel.slice(0, 1500)}`; inp.focus(); }
      toast('Seleção enviada ao agente', 'ai');
    }, 80);
  },
  npm() {
    if (!CAPS.npm) return this._need('npm-scripts');
    let j = {};
    try { j = JSON.parse((fGet('/package.json') || { c: '{}' }).c); } catch (_) {}
    const scripts = Object.entries((j.scripts) || {});
    Page.open('toolnpm', 'npm scripts', el => {
      el.innerHTML = scripts.length ? scripts.map(([k, v]) => `<div class="row">${icon('play')}<div class="grow"><div class="t">${esc(k)}</div><div class="s">${esc(v)}</div></div><button class="mini-btn">Run</button></div>`).join('') : '<div class="empty">Nenhum script em /package.json</div>';
      el.querySelectorAll('.row').forEach(r => r.querySelector('button').onclick = () => { Page.close(); Panel.open('terminal'); setTimeout(() => Term.exec('npm run ' + r.querySelector('.t').textContent), 120); });
    }, false);
  },
  openPath() {
    if (!Plugins.isInstalled('path-linker')) return this._need('path-linker');
    const v = Ed.input.value, s = Ed.input.selectionStart;
    const m = v.slice(0, s).match(/[\w\-./\\]+$/) || [''];
    const cand = m[0].replace(/['"`)\]]+$/, '');
    const p = normPath(cand.startsWith('/') ? cand : '/' + cand);
    if (FS.files[p] !== undefined) { openFile(p); toast('Aberto: ' + p, 'files'); }
    else if (dExists(p)) { Explorer.root = p; Panel.open('files'); }
    else toast('Caminho não encontrado: ' + cand, 'error');
  },
  inspect() {
    if (!Plugins.isInstalled('suger')) return this._need('suger');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    const c = Ed.input.value, L = LANGS[detectLang(T.active)];
    let h = 5381;
    for (let i = 0; i < c.length; i++) h = ((h << 5) + h + c.charCodeAt(i)) >>> 0;
    Page.open('toolinsp', 'Inspecionar', el => {
      el.innerHTML = `<div class="diag-row"><div class="diag-ic info">${icon('search')}</div><div class="grow"><div class="t">${esc(baseName(T.active))}</div><div class="s">${esc(T.active)}</div></div></div>
      <div class="metric-grid"><div class="metric"><div class="v">${L.name}</div><div class="l">Linguagem</div></div><div class="metric"><div class="v">${c.split('\n').length.toLocaleString('pt-BR')}</div><div class="l">Linhas</div></div>
      <div class="metric"><div class="v">${c.split(/\s+/).filter(Boolean).length.toLocaleString('pt-BR')}</div><div class="l">Palavras</div></div><div class="metric"><div class="v">${(c.length / 1024).toFixed(1)} KB</div><div class="l">Tamanho</div></div></div>
      <div class="diag-row"><div class="grow"><div class="t">Hash djb2</div><div class="s" style="font-family:var(--font-code)">${h.toString(16)}</div></div></div>`;
    }, false);
  },
  md() {
    if (!CAPS.md) return this._need('md-preview');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    Browser.open(T.active);
  }
};
const _palCmds = Palette.commands.bind(Palette);
Palette.commands = function () {
  const base = _palCmds();
  const has = pid => Plugins.isInstalled(pid);
  const need = (pid, t) => ({ t: t + ' 🔌', s: 'Instalar plugin para ativar', fn: () => PluginDetail.open(pid) });
  const ex = [
    has('color-palette') ? { t: 'Gerar paleta do arquivo', s: 'Extrai cores do arquivo atual', fn: () => Tools.palette() } : need('color-palette', 'Gerar paleta do arquivo'),
    has('todo-tree') ? { t: 'Listar TODOs do projeto', s: 'TODO, FIXME, HACK…', fn: () => Tools.todos() } : need('todo-tree', 'Listar TODOs do projeto'),
    has('eslint') ? { t: 'Lint: verificar arquivo', s: 'Regras do plugin ESLint', fn: () => Tools.lint() } : need('eslint', 'Lint: verificar arquivo'),
    has('json-tools') ? { t: 'JSON: validar arquivo', s: 'Valida o JSON atual', fn: () => Tools.jsonValidate() } : need('json-tools', 'JSON: validar arquivo'),
    has('json-tools') ? { t: 'JSON: minificar', s: 'Remove espaços do JSON', fn: () => Tools.jsonMin() } : null,
    has('git-scm') ? { t: 'Git: status e commit', s: 'Commit rápido (simulado)', fn: () => Tools.gitQuick() } : need('git-scm', 'Git: status e commit'),
    has('android-builder') ? { t: 'Build APK', s: 'Gera APK debug (simulado)', fn: () => Tools.apk() } : need('android-builder', 'Build APK'),
    has('git-dust') ? { t: 'Estatísticas do projeto', s: 'Arquivos e linhas por linguagem', fn: () => Tools.stats() } : need('git-dust', 'Estatísticas do projeto'),
    has('ai-sidebar') ? { t: 'Perguntar à IA sobre a seleção', s: 'Envia seleção ao agente', fn: () => Tools.askAI() } : need('ai-sidebar', 'Perguntar à IA sobre a seleção'),
    CAPS.npm ? { t: 'npm: scripts', s: 'Executa scripts do package.json', fn: () => Tools.npm() } : need('npm-scripts', 'npm: scripts'),
    has('path-linker') ? { t: 'Abrir caminho sob o cursor', s: 'Resolve o path no texto', fn: () => Tools.openPath() } : need('path-linker', 'Abrir caminho sob o cursor'),
    has('suger') ? { t: 'Inspecionar arquivo', s: 'Métricas do arquivo atual', fn: () => Tools.inspect() } : need('suger', 'Inspecionar arquivo'),
    CAPS.md ? { t: 'Markdown: preview', s: 'Renderiza .md no navegador', fn: () => Tools.md() } : need('md-preview', 'Markdown: preview'),
    ...CustomCmds.list.map(c => ({ t: '⚡ ' + c.name, s: 'Comando de plugin personalizado', fn: () => { Panel.open('terminal'); setTimeout(() => Term.exec(c.name), 120); } }))
  ].filter(Boolean);
  return [...base, ...ex];
};


/* Handle de depuração/testes (console + tests/smoke.mjs) */
window.ThcodeTest = { S, T, FS, Ed, AC, Term, Bash, Panel, Page, Drawer, Palette, Plugins, PLUGIN_DEFS, PLUGIN_META, AI, GH, AI_MODELS, Browser, Conn, Auth, Tools, CustomPlugins, CustomCmds, Hooks, CAPS, computeCaps, PluginDetail, PluginSettings, pset, SettingsPage, Notifs, Procs, State, Store, Metrics, openFile, saveFile, closeTab, fGet, fSet, fDel, fExists, fRead, dExists, listDir, detectLang, LANGS, baseName, normPath, applySettings, applyTermTheme, applySettingsJson, formatActive, renderEditor, updateCrumb, toast, dialog, dAlert, dConfirm, dPrompt, dList, THEMES, APP_VER, LS_KEY, OLD_LS_KEY, ficon, rainbowify, Emmet, Snippets, gotoLine };
document.addEventListener('DOMContentLoaded', boot);
})();
