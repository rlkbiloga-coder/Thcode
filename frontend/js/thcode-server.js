/* ============================================================
   THCODE SERVER BRIDGE — conecta o PWA a um backend real (Thcode backend).
   Sem backend: tudo honestamente "desconectado". Nada é simulado aqui.
   ============================================================ */
(() => {
  'use strict';
  const W = window.ThcodeTest;
  if (!W) return;
  const { Term, Panel, Page, Store, toast, dPrompt, esc, icon } = W;
  const $ = s => document.querySelector(s);

  const Server = {
    LS: 'thcode.backend.v1',
    url: null, token: null, status: 'disconnected', ws: null, retry: 0,
    load() { try { const d = JSON.parse(localStorage.getItem(this.LS)); if (d) { this.url = d.url || null; this.token = d.token || null; } } catch (e) {} },
    save() { try { localStorage.setItem(this.LS, JSON.stringify({ url: this.url, token: this.token })); } catch (e) {} },
    isUp() { return this.status === 'connected'; },

    async api(method, path, body) {
      if (!this.url) throw new Error('Backend não configurado (Servidor → Conectar)');
      const r = await fetch(this.url.replace(/\/$/, '') + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      return j;
    },

    async connect(url, token) {
      this.status = 'connecting'; this.render();
      try {
        this.url = url.replace(/\/$/, ''); this.token = token;
        const h = await (await fetch(this.url + '/api/health')).json();
        if (!h.status) throw new Error('Resposta de health inválida');
        this.status = 'connected'; this.retry = 0; this.save();
        toast('Backend conectado: ' + (h.backend || 'ok'), 'check');
        this.render();
      } catch (e) {
        this.status = 'disconnected';
        this.render();
        Panel.setHead('Servidor', 'Desconectado');
        toast('Falha ao conectar: ' + e.message.slice(0, 80), 'close');
      }
    },
    disconnect() { this.status = 'disconnected'; this.ws && this.ws.close(); this.ws = null; this.render(); },

    /* ---------- SYSTEM STATUS REAL ---------- */
    async renderHealth(box) {
      if (this.status !== 'connected') {
        box.innerHTML = `<div class="empty">${icon('info')}<br>Conecte um backend para ver<br>o status real do sistema.</div>`;
        return;
      }
      box.innerHTML = '<div class="empty">Verificando…</div>';
      try {
        const h = await this.api('GET', '/api/health');
        box.innerHTML = `<div class="note">backend: ${esc(h.backend)} • node ${esc(h.node)} • ${esc(h.platform)}</div>` +
          h.checks.map(c => `<div class="row"><div class="grow"><div class="t" style="color:${c.ok ? 'var(--ok,#7ec)' : 'var(--err,#e66)'}">${c.ok ? '✓' : '✕'} ${esc(c.name)}</div><div class="s">${esc(c.detail || '')}</div></div></div>`).join('');
      } catch (e) {
        box.innerHTML = `<div class="empty" style="color:var(--err,#e66)">Erro real: ${esc(e.message)}</div>`;
      }
    },

    /* ---------- PAINEL SERVIDOR ---------- */
    render() {
      Panel.setHead('Servidor', this.status === 'connected' ? '● Connected' : this.status === 'connecting' ? '● Conectando…' : '● Disconnected', [
        { ic: 'refresh', t: 'Reconectar', fn: () => Server.connect(Server.url, Server.token) },
        { ic: 'exit', t: 'Desconectar', fn: () => Server.disconnect() }
      ]);
      const body = $('#panelBody');
      const st = this.status === 'connected' ? 'var(--ok,#7ec)' : 'var(--err,#e66)';
      body.innerHTML = `
        <div class="sect">Backend (terminal PTY, execução, SFTP, IA)</div>
        <div class="note">Status: <b style="color:${st}">${this.status === 'connected' ? 'Connected' : this.status === 'connecting' ? 'Connecting' : 'Disconnected'}</b><br>
        ${this.url ? 'URL: ' + esc(this.url) : 'Sem URL configurada. Funções de servidor ficam desativadas até conectar (nada é simulado).'}</div>
        <div class="btn-row">
          <button class="big-btn primary" id="srvConnect">${icon('zap')} Conectar backend</button>
        </div>
        <div class="btn-row">
          <button class="big-btn" id="srvTerm" ${this.status === 'connected' ? '' : 'disabled style="opacity:.4"'}>Terminal REAL (PTY)</button>
        </div>
        <div class="sect">System Status (verificado de verdade)</div>
        <div id="srvHealth"></div>`;
      body.querySelector('#srvConnect').onclick = async () => {
        const u = await dPrompt('URL do backend', 'Ex: https://seu-backend.onrender.com', this.url || 'https://thcode-backend.onrender.com');
        if (!u) return;
        const t = await dPrompt('Token da API (THCODE_API_TOKEN)', 'Fica no .env do backend', '');
        Server.connect(u, t || '');
      };
      body.querySelector('#srvTerm').onclick = () => this.openTerminal();
      this.renderHealth(body.querySelector('#srvHealth'));
    },

    /* ---------- TERMINAL REAL (xterm.js + WebSocket PTY) ---------- */
    openTerminal() {
      if (this.status !== 'connected') { toast('Conecte o backend primeiro', 'close'); return; }
      if (!window.Terminal) {
        const l1 = document.createElement('link'); l1.rel = 'stylesheet';
        l1.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css';
        const s1 = document.createElement('script'); s1.src = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js';
        const s2 = document.createElement('script'); s2.src = 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js';
        const load = src => new Promise(r => { const s = document.createElement('script'); s.src = src; s.onload = r; document.head.appendChild(s); });
        document.head.appendChild(l1);
        Promise.all([load(s1.src), load(s2.src)]).then(() => this.mountTerminal());
        return;
      }
      this.mountTerminal();
    },
    mountTerminal() {
      Page.open('rterm', 'Terminal REAL (PTY)', el => {
        el.innerHTML = `<div class="note">Conectando ao PTY do backend…</div><div id="xt" style="height:70vh"></div>`;
        const wsUrl = this.url.replace(/^http/, 'ws') + '/ws/terminal?token=' + encodeURIComponent(this.token || '');
        const ws = new WebSocket(wsUrl);
        this.ws = ws;
        const term = new Terminal({ fontSize: 13, cursorBlink: true, theme: { background: '#0b0e13' } });
        const fit = new FitAddon.FitAddon();
        term.loadAddon(fit);
        term.open(el.querySelector('#xt'));
        setTimeout(() => fit.fit(), 60);
        term.onData(d => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'in', data: d })));
        ws.onmessage = m => {
          try { const j = JSON.parse(m.data); if (j.type === 'out' || j.type === 'err') term.write(j.data); } catch (e) {}
        };
        ws.onclose = () => term.write('\r\n\x1b[31m[desconectado do PTY]\x1b[0m\r\n');
        window.addEventListener('resize', () => fit.fit());
      });
    }
  };

  /* rotas novas do painel */
  const _panelRender = Panel.render.bind(Panel);
  Panel.render = function () {
    if (Panel.current === 'server') return Server.render();
    return _panelRender();
  };
  /* botão na barra lateral */
  function addRail() {
    const rail = $('#rail'); if (!rail || document.querySelector('[data-panel="server"]')) return;
    const b = document.createElement('button');
    b.className = 'rail-btn'; b.dataset.panel = 'server'; b.title = 'Servidor / Status';
    b.innerHTML = `<svg><use href="#i-console"/></svg>`;
    b.onclick = () => Panel.toggle('server');
    rail.insertBefore(b, rail.querySelector('#avatarBtn'));
  }
  addRail();

  /* comando no palette */
  const _pal = W.Palette.commands.bind(W.Palette);
  W.Palette.commands = function () {
    return [..._pal(),
      { t: 'Servidor: conectar backend', s: 'Terminal PTY real, execução, SFTP', fn: () => Panel.open('server') },
      { t: 'Terminal REAL (PTY remoto)', s: 'xterm.js + WebSocket', fn: () => Server.openTerminal() }
    ];
  };

  Server.load();
  window.ThcodeServer = Server;
  console.log('Thcode Server Bridge pronto (status: ' + Server.status + ')');
})();
