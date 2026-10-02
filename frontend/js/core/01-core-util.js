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
const APP_VER = 'v2.5.1 Studio';
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

