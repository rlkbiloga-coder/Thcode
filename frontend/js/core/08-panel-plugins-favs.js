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

