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
    clearTimeout(this.closeTimer);
    if (this.current === id) this.stack.pop();
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
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => { r.classList.add('hidden'); r.classList.remove('closing'); }, 180);
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

