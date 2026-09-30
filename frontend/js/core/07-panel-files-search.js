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
    $('#panelClose').onclick = () => this.close();
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

