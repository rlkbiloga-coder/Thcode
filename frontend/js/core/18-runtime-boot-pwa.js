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
  if (location.search.includes('share=')) handleShared();
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
/* #1: PWA — avisa sobre nova versão com botão "Recarregar". */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const announce = worker => {
      if (!navigator.serviceWorker.controller) return; // primeira instalação: sem aviso
      const wrap = document.createElement('div');
      wrap.id = 'sw-update';
      wrap.style.cssText = 'position:fixed;bottom:16px;left:12px;right:12px;z-index:99999;display:flex;gap:10px;align-items:center;justify-content:space-between;background:#151922;color:#eee;border:1px solid #2a3040;border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:.92rem';
      wrap.innerHTML = '<span>' + icon('refresh') + ' Nova versão do Thcode disponível.</span>';
      const btn = document.createElement('button');
      btn.textContent = 'Recarregar';
      btn.style.cssText = 'background:#a100ff;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:600';
      btn.onclick = () => {
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
        worker.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => location.reload(), 1500); // garantia extra
      };
      wrap.appendChild(btn);
      (document.body || document.documentElement).appendChild(wrap);
      vibrate(20);
    };
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) announce(w); });
    });
    if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting);
    setInterval(() => reg.update().catch(() => {}), 6 * 60 * 60 * 1000);
  }).catch(() => {});
}

/* #2: Web Share Target — arquivos/texto compartilhados pelo Android entram no VFS. */
async function handleShared() {
  if (!location.search.includes('share=')) return;
  try {
    if (!('caches' in window)) return;
    const cache = await caches.open('thcode-share');
    const keys = await cache.keys();
    if (!keys.length) return;
    let first = null, count = 0;
    for (const req of keys) {
      const res = await cache.match(req);
      const blob = await res.blob();
      const name = decodeURIComponent(new URL(req.url).pathname.split('/').pop() || 'compartilhado.txt');
      const textual = /^text\//.test(blob.type) || /json|xml|javascript|csv|svg|html|css/.test(blob.type);
      const content = textual ? await blob.text() : '[binário — ' + blob.size + ' bytes — compartilhado via Android]';
      const p = normPath('/' + name);
      fSet(p, content);
      count++;
      if (!first) first = p;
    }
    await caches.delete('thcode-share');
    history.replaceState(null, '', location.pathname);
    if (first) { openFile(first); Panel.render(); toast(count + (count > 1 ? ' arquivos' : ' arquivo') + ' compartilhado(s) recebido(s)', 'plus'); }
  } catch (e) { clog('WARN', 'share target: ' + (e && e.message)); }
}

