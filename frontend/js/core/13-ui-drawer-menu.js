/* ============================== DRAWER ============================== */
const Drawer = {
  sel: 'files',
  isOpen() { return $('#drawer').classList.contains('open'); },
  open() { clearTimeout(this.closeTimer); $('#drawer').classList.remove('hidden'); $('#scrim').classList.remove('hidden'); requestAnimationFrame(() => { $('#drawer').classList.add('open'); $('#scrim').classList.add('show'); }); },
  close() { clearTimeout(this.closeTimer); $('#drawer').classList.remove('open'); $('#scrim').classList.remove('show'); this.closeTimer = setTimeout(() => { $('#drawer').classList.add('hidden'); if ($('#fileMenu').classList.contains('hidden')) $('#scrim').classList.add('hidden'); }, 260); },
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
        { ic: 'cmd', t: 'Open Command Palette', fn: () => Palette.open() },
        { ic: 'grid', t: 'Painel React (Home)', fn: () => window.ThcodeReact?.open() }
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
      { t: 'Conectar', items: [
        { ic: 'globe', t: 'Site do Thcode', fn: () => window.open('https://rlkbiloga-coder.github.io/Thcode/', '_blank') },
        { ic: 'github', t: 'GitHub do Thcode', fn: () => window.open(THCODE_REPO, '_blank') },
        { ic: 'star', t: 'Acode — inspiração do Thcode', fn: () => window.open('https://acode.foxdebug.com', '_blank') }
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

