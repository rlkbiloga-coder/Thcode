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

