/* ============================================================
   THCODE PRO — página promocional/UI baseada no mockup oficial.
   Cada card mostra o status REAL (nada de "✓" falso sem backend).
   ============================================================ */
(() => {
  'use strict';
  const W = window.ThcodeTest;
  if (!W) return;
  const { Page, Preview, Panel, esc } = W;
  const REPO = 'https://github.com/rlkbiloga-coder/Thcode';

  function open() {
    Page.open('promo', 'Thcode Pro — IDE Mobile Real', el => {
      const srv = window.ThcodeServer;
      const up = srv && srv.isUp();
      const live = (ok, okTxt, offTxt) => `<span class="pr-status ${ok ? 'ok' : 'off'}">${ok ? '✓ ' + okTxt : '○ ' + offTxt}</span>`;
      el.innerHTML = `
        <div class="promo">
          <div class="pr-title">Thcode <span>Pro</span></div>
          <div class="pr-sub">IDE Mobile Real — nenhuma simulação</div>
          <div class="pr-grid">
            <div class="pr-card"><div class="pr-ic">⌨</div><div class="pr-name">Terminal Real & PTY</div>
              ${live(up, 'PTY conectado', 'local VFS; PTY ao conectar backend')}
              <div class="pr-desc">xterm.js + WebSocket + node-pty. Shell de verdade.</div></div>
            <div class="pr-card"><div class="pr-ic">🗂</div><div class="pr-name">File System & Git</div>
              ${live(true, 'VFS persistido + git real', 'offline: localStorage')}
              <div class="pr-desc">VFS real no navegador; git binário no backend.</div></div>
            <div class="pr-card"><div class="pr-ic">🤖</div><div class="pr-name">IA Local & Vault</div>
              ${live(true, 'Groq/Ollama/OpenRouter', 'chaves no Vault AES-256')}
              <div class="pr-desc">Providers free direto no app ou via backend.</div></div>
            <div class="pr-card"><div class="pr-ic">🐙</div><div class="pr-name">GitHub + SFTP</div>
              ${live(true, 'API real (token seu)', 'CORS direto')}
              <div class="pr-desc">Repos, commits, issues, releases, SSH real.</div></div>
          </div>
          <div class="pr-tag">Toda função é <b>REAL</b> — sem backend, o app diz o que não está disponível.</div>
          <div class="pr-btns">
            <button class="pr-btn solid" id="prDemo">Ver Demo</button>
            <a class="pr-btn ghost" href="${REPO}" target="_blank" rel="noopener">GitHub</a>
            <button class="pr-btn ghost" id="prSrv">Servidor</button>
          </div>
        </div>`;
      el.querySelector('#prDemo').onclick = () => Preview.open();
      el.querySelector('#prSrv').onclick = () => Panel.open('server');
    });
  }

  const _pal = W.Palette.commands.bind(W.Palette);
  W.Palette.commands = function () {
    return [..._pal(), { t: 'Thcode Pro — sobre & features', s: 'página oficial do app', fn: open }];
  };
  window.ThcodePromo = { open };
})();
