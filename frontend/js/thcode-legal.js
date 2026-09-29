/* ============================================================
   THCODE LEGAL — cookies (consentimento real), Termos de Uso (aceite
   registrado) e analytics com consentimento. Nada de banner falso:
   cada escolha é gravada com data/hora e a IA/telemetria respeita.
   ============================================================ */
(() => {
  'use strict';
  if (window.__thcode_legal_initialized) return;
  window.__thcode_legal_initialized = true;
  const W = window.ThcodeTest;
  const LS = 'thcode.legal.v1';
  const TERMS_VERSION = '2026-09-29';
  const REPO_DOCS = 'https://github.com/rlkbiloga-coder/Thcode/blob/main/docs';

  const Legal = {
    state: null,
    load() {
      try { this.state = JSON.parse(localStorage.getItem(LS)); } catch (e) { this.state = null; }
      return this.state;
    },
    save(s) { this.state = s; localStorage.setItem(LS, JSON.stringify(s)); },
    acceptedTerms() { return !!(this.state && this.state.terms === TERMS_VERSION); },
    consentAnalytics() { return !!(this.state && this.state.cookies === 'all'); },

    /* ---------- TERMINAL DE EVENTOS (analytics) ---------- */
    events: [],
    track(event, data) {
      if (!this.consentAnalytics()) return false;            // sem consentimento, zero coleta
      const e = { event, data: data || {}, ts: new Date().toISOString() };
      this.events.push(e);
      if (this.events.length > 400) this.events.shift();
      localStorage.setItem('thcode.analytics.queue', JSON.stringify(this.events.slice(-200)));
      this.flush();
      return true;
    },
    async flush() {
      const srv = window.ThcodeServer;
      if (!srv || !srv.isUp() || !this.events.length) return;
      const batch = this.events.splice(0, 50);
      try { await srv.api('POST', '/api/analytics', { events: batch }); } catch (e) { this.events.unshift(...batch); }
    }
  };

  /* ---------- hooka o Metrics real do app ---------- */
  if (W && W.Metrics) {
    const _count = W.Metrics.count.bind(W.Metrics);
    W.Metrics.count = function (k) { _count(k); Legal.track('metric', { k }); };
  }

  /* ---------- UI: aceite de termos ---------- */
  function termsGate() {
    if (Legal.acceptedTerms()) return false;
    const ov = document.createElement('div');
    ov.id = 'legalGate';
    ov.innerHTML = `
      <div class="lg-card">
        <div class="lg-title">Thcode — Termos & Privacidade</div>
        <div class="lg-body">
          O Thcode funciona no <b>seu navegador</b>: arquivos e tokens ficam no seu
          dispositivo (localStorage/Vault AES-256). Não enviamos seus dados a
          terceiros sem seu consentimento explícito.
          <br><br>
          Cookies/telemetria: <i>essenciais</i> sempre (preferências); <i>analíticos</i>
          só se você aceitar (métricas de uso anônimas, event-count).
          <br><br>
          <a href="${REPO_DOCS}/TERMS.md" target="_blank" rel="noopener">Termos de Uso</a> ·
          <a href="${REPO_DOCS}/PRIVACY.md" target="_blank" rel="noopener">Privacidade</a>
        </div>
        <div class="lg-btns">
          <button class="lg-btn" id="lgAccept">Aceito os termos</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#lgAccept').onclick = () => {
      Legal.save({ ...(Legal.state || {}), terms: TERMS_VERSION, termsTs: new Date().toISOString() });
      ov.remove();
      cookieBanner(); // depois dos termos, o consentimento de cookies
    };
    return true;
  }

  /* ---------- UI: banner de cookies ---------- */
  function cookieBanner() {
    const st = Legal.state || {};
    if (st.cookies) return;                       // já decidiu — não enche de novo
    const b = document.createElement('div');
    b.id = 'cookieBar';
    b.innerHTML = `
      <div class="cb-txt"><b>Cookies:</b> essenciais (preferências) sempre; analíticos só com seu OK.
      <span id="cbCfg"></span></div>
      <div class="cb-btns">
        <button class="cb-min" id="cbEss">Só essenciais</button>
        <button class="cb-ok" id="cbAll">Aceitar tudo</button>
      </div>`;
    document.body.appendChild(b);
    b.querySelector('#cbAll').onclick = () => decide('all');
    b.querySelector('#cbEss').onclick = () => decide('essential');
    function decide(choice) {
      Legal.save({ ...(Legal.state || {}), cookies: choice, cookiesTs: new Date().toISOString() });
      b.remove();
      if (choice === 'all') Legal.track('consent', { choice });
      else console.log('[legal] modo somente-essenciais: analytics desativado');
    }
  }

  /* painel Configurações → Privacidade mostra o registro real */
  window.ThcodeLegal = Legal;

  /* boot */
  Legal.load();
  if (!termsGate()) cookieBanner();
  console.log('[legal] termos:', Legal.acceptedTerms() ? 'aceitos ' + (Legal.state.termsTs || '') : 'pendentes');
})();

/* ---------- Stripe: ativação REAL do PRO após pagamento ---------- */
(() => {
  const q = new URLSearchParams(location.search);
  if (q.get('stripe') !== 'success' || !q.get('session_id')) return;
  const srv = window.ThcodeServer;
  const tryVerify = () => {
    if (!srv || !srv.isUp()) return setTimeout(tryVerify, 1200);
    srv.api('GET', '/api/billing/verify?session_id=' + encodeURIComponent(q.get('session_id')))
      .then(r => {
        if (r.paid) {
          const W = window.ThcodeTest;
          if (W && W.State) { W.State.pro = true; W.Store.save(); }
          localStorage.setItem('thcode.pro.v1', JSON.stringify({ via: 'stripe', ts: new Date().toISOString() }));
          alert('Thcode PRO ativado! Pagamento confirmado pelo Stripe.');
        } else alert('Pagamento ainda ' + r.status + ' — tente de novo em instantes.');
        history.replaceState(null, '', location.pathname);
      })
      .catch(e => { alert('Erro real na verificação: ' + e.message.slice(0, 80)); history.replaceState(null, '', location.pathname); });
  };
  setTimeout(tryVerify, 800);
})();

/* First-run hint waits for consent instead of stacking dialogs. */
(() => {
  if (localStorage.getItem('thcode.tour.v1')) return;
  const show = () => {
    if (document.querySelector('#legalGate, #cookieBar, #splash')) return;
    observer.disconnect();
    localStorage.setItem('thcode.tour.v1', new Date().toISOString());
    window.ThcodeTest?.toast('Menu: ferramentas e configurações. Ctrl+Shift+P: comandos.', 'info');
  };
  const observer = new MutationObserver(show);
  observer.observe(document.body, {childList: true, subtree: true});
  show();
})();
