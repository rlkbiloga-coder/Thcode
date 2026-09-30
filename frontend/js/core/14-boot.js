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


