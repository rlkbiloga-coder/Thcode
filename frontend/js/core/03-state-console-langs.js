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

