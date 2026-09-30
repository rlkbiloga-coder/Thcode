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

