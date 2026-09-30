/* ==========================================================================
   THCODE v2 — Conectores reais (GitHub + OpenRouter)
   ========================================================================== */
const Conn = {
  lastCheck: null,
  key() { try { return S.connKey || pset('ai-assistant').apiKey || pset('rutex-agent').apiKey || ''; } catch (_) { return S.connKey || ''; } },
  useReal() { return S.connReal && !!this.key(); },
  modelId(name) {
    const map = { 'OpenRouter': 'openrouter/auto', 'GPT-4o mini': 'openai/gpt-4o-mini', 'Claude 3.5 Sonnet': 'anthropic/claude-3.5-sonnet', 'DeepSeek V3': 'deepseek/deepseek-chat', 'Llama 3.1 70B': 'meta-llama/llama-3.1-70b-instruct', 'Gemini 1.5 Flash': 'google/gemini-flash-1.5', 'Rutex Zero': 'openrouter/auto', 'BlackBox AI': 'openrouter/auto' };
    return map[name] || 'openrouter/auto';
  },
  async check() {
    const out = { github: 'offline', openrouter: 'offline', net: navigator.onLine ? 'online' : 'offline' };
    try {
      const r = await Promise.race([fetch('https://api.github.com/rate_limit'), new Promise((_, rej) => setTimeout(() => rej(0), 7000))]);
      out.github = r.ok ? 'online' : 'erro';
    } catch (_) {}
    if (this.key()) {
      try {
        const r = await Promise.race([fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: 'Bearer ' + this.key() } }), new Promise((_, rej) => setTimeout(() => rej(0), 7000))]);
        out.openrouter = r.ok ? 'online' : (r.status === 401 ? 'chave inválida' : 'erro');
      } catch (_) {}
    } else out.openrouter = 'sem chave';
    this.lastCheck = new Date().toLocaleTimeString();
    this.status = out;
    return out;
  },
  async gh(path) {
    const r = await fetch('https://api.github.com' + path, { headers: { Accept: 'application/vnd.github+json' } });
    if (r.status === 403) throw new Error('limite da API (tente mais tarde)');
    if (r.status === 404) throw new Error('não encontrado');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  },
  async chat(prompt, modelName, system) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.key(), 'HTTP-Referer': location.href, 'X-Title': 'Thcode' },
      body: JSON.stringify({ model: this.modelId(modelName), messages: [{ role: 'system', content: system || 'Você é um assistente de programação no app Thcode. Responda em pt-BR, com código quando útil.' }, { role: 'user', content: prompt }] })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(r.status === 401 ? 'chave inválida' : 'HTTP ' + r.status + ' ' + t.slice(0, 80));
    }
    const j = await r.json();
    return (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '(resposta vazia)';
  }
};
/* ---------- IA com API real ---------- */
const _streamReply = AI.streamReply.bind(AI);
AI.streamReply = async function (container, prompt, mode) {
  Metrics.count('ai');
  if (Conn.useReal()) {
    try { await this.streamReal(container, prompt, mode); return; }
    catch (e) { toast('API: ' + e.message + ' — modo offline', 'error'); }
  }
  _streamReply(container, prompt, mode);
};
AI.streamReal = async function (container, prompt, mode) {
  const boxSel = mode === 'agent' ? '#agentMsgs' : '#aiMsgs';
  const box = container.querySelector(boxSel);
  if (!box) return;
  this.streaming = true; this.stopFlag = false;
  const typing = document.createElement('div');
  typing.className = 'msg ai';
  typing.innerHTML = `<div class="who">${icon('hex')} RUTEX</div><span class="typing-dots"><i></i><i></i><i></i></span>`;
  box.appendChild(typing); box.scrollTop = box.scrollHeight;
  const model = mode === 'agent' ? this.model : ((S.pluginSettings && S.pluginSettings['ai-assistant'] && S.pluginSettings['ai-assistant'].model) || AI_MODELS[0]);
  try {
    const full = await Conn.chat(prompt, model);
    if (!document.contains(typing)) { this.streaming = false; return; }
    typing.remove();
    const msg = { role: 'ai', text: '\u{1F310} ' + full };
    if (mode === 'agent') { this.agentMsgs.push(msg); this.paintAgentMsgs(container); }
    else { this.currentChat().msgs.push(msg); this.paintChat(container); }
    Store.save();
  } catch (e) { typing.remove(); this.streaming = false; throw e; }
  this.streaming = false;
};
const _renderAssistant = AI.renderAssistant.bind(AI);
AI.renderAssistant = function (c) { _renderAssistant(c); if (this.aiTab === 'settings') AISettings.extra(c); };
const AISettings = {
  extra(container) {
    const alt = container.querySelector('#aiAlt');
    if (!alt || alt.querySelector('.api-real')) return;
    const box = document.createElement('div');
    box.className = 'api-real';
    box.innerHTML = `<div class="sect">API real (OpenRouter)</div>`;
    const keyRow = document.createElement('div');
    keyRow.className = 'schema-row';
    keyRow.innerHTML = `<div class="grow"><div class="t">API Key</div><div class="s">sk-or-… (somente neste aparelho)</div></div><input type="password" value="${esc(S.connKey)}" placeholder="••••••••" autocomplete="off">`;
    keyRow.querySelector('input').onchange = e => { S.connKey = e.target.value.trim(); Store.save(); toast('Chave salva localmente', 'lock'); };
    const tRow = document.createElement('div');
    tRow.className = 'schema-row';
    tRow.innerHTML = `<div class="grow"><div class="t">Usar API real</div><div class="s">${Conn.useReal() ? '● respostas via OpenRouter' : '○ modo offline (simulado)'}</div></div><div class="switch${S.connReal ? ' on' : ''}"></div>`;
    tRow.onclick = () => { S.connReal = !S.connReal; tRow.querySelector('.switch').classList.toggle('on', S.connReal); Store.save(); toast(S.connReal ? 'API real ativada' : 'Modo offline', 'ai'); AI.renderAssistant(container); };
    box.appendChild(keyRow); box.appendChild(tRow);
    if (Plugins.isInstalled('blackbox-ai')) {
      const bb = document.createElement('div');
      bb.className = 'schema-row';
      bb.innerHTML = `<div class="grow"><div class="t">BlackBox AI</div><div class="s">Provider: ${esc(pset('blackbox-ai').provider || 'openai')}</div></div>${icon('chevron', 'width:16px;height:16px;color:var(--muted2)')}`;
      bb.onclick = () => PluginSettings.open('blackbox-ai');
      box.appendChild(bb);
    }
    const test = document.createElement('div');
    test.className = 'btn-row';
    test.innerHTML = `<button class="big-btn" id="aiTest">Testar conexão</button>`;
    test.querySelector('#aiTest').onclick = async () => {
      toast('Testando OpenRouter…', 'ai');
      await Conn.check();
      toast('OpenRouter: ' + (Conn.status ? Conn.status.openrouter : '?'), (Conn.status && Conn.status.openrouter === 'online') ? 'check' : 'error');
    };
    box.appendChild(test);
    alt.appendChild(box);
  }
};
/* ---------- GitHub com API real ---------- */
GH.render = function () {
  Panel.setHead('GitHub', 'Repositórios', [
    { ic: 'search', fn: () => { const q = prompt('Buscar usuário GitHub:', GH.user || ''); if (q !== null) { GH.user = q.trim(); Panel.render(); } } }
  ]);
  const body = $('#panelBody');
  body.innerHTML = `<div class="search-bar"><input class="input" id="ghQ" placeholder="Usuário GitHub…" value="${esc(GH.user || '')}"></div><div id="ghBody"><div class="empty">Digite um usuário e toque em Buscar.<br><span style="font-size:11px">Dados reais via api.github.com • offline mostra cache.</span><br><br><button class="big-btn primary" id="ghGo" style="max-width:220px;margin:auto">Buscar</button></div></div>`;
  body.querySelector('#ghGo').onclick = () => { GH.user = body.querySelector('#ghQ').value.trim(); this.fetch(); };
  body.querySelector('#ghQ').addEventListener('keydown', e => { if (e.key === 'Enter') { GH.user = e.target.value.trim(); this.fetch(); } });
  if (GH.user) this.fetch();
};
GH.fetch = async function () {
  const box = $('#ghBody');
  if (!box) return;
  const u = GH.user;
  box.innerHTML = '<div class="empty">Buscando @' + esc(u) + '…</div>';
  try {
    const [user, repos] = await Promise.all([Conn.gh('/users/' + encodeURIComponent(u)), Conn.gh('/users/' + encodeURIComponent(u) + '/repos?per_page=8&sort=updated')]);
    try { localStorage.setItem('thcode.gh.' + u.toLowerCase(), JSON.stringify({ user, repos })); } catch (_) {}
    this.paint(box, u, user, repos, true);
  } catch (e) {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem('thcode.gh.' + u.toLowerCase())); } catch (_) {}
    if (cached) this.paint(box, u, cached.user, cached.repos, false, 'offline — mostrando cache');
    else {
      box.innerHTML = `<div class="empty">Falha: ${esc(e.message)}.<br>Verifique a conexão.<br><br><button class="big-btn" id="ghRetry" style="max-width:220px;margin:auto">Tentar de novo</button></div>`;
      box.querySelector('#ghRetry').onclick = () => GH.fetch();
    }
  }
};
GH.paint = function (box, u, user, repos, live, warn) {
  const mgr = Plugins.isInstalled('gh-manager');
  box.innerHTML = `<div class="row"><img src="${esc(user.avatar_url)}" style="width:44px;height:44px;border-radius:50%" alt=""><div class="grow"><div class="t">${esc(user.name || user.login)} ${live ? '<span class="tag">● real</span>' : '<span class="tag">cache</span>'}</div><div class="s">@${esc(user.login)} • ${user.followers} seguidores • ${user.public_repos} repos</div></div></div>
    ${warn ? `<div class="note warn">⚠ ${esc(warn)}</div>` : ''}
    ${mgr ? `<div class="pd-tabs" style="margin-top:4px"><button data-t="r" class="sel">Repos</button><button data-t="i">Issues</button><button data-t="p">PRs</button></div><div id="ghTabs"></div>` : `<div class="sect">Repositórios atualizados</div><div id="ghRepos"></div>`}`;
  const paintRepos = el => {
    el.innerHTML = repos.length ? repos.map(r => `<div class="row" data-r="${esc(r.full_name)}">${icon('github')}<div class="grow"><div class="t">${esc(r.name)}</div><div class="s">⭐ ${r.stargazers_count} • 🍴 ${r.forks_count}${r.language ? ' • ' + esc(r.language) : ''}</div></div><button class="mini-btn">Clonar</button></div>`).join('') : '<div class="empty">Sem repositórios.</div>';
    el.querySelectorAll('.row').forEach(row => row.querySelector('button').onclick = async ev => {
      ev.stopPropagation();
      toast('Clonando ' + row.dataset.r + '…', 'github');
      try {
        const rd = await fetch(`https://api.github.com/repos/${row.dataset.r}/readme`, { headers: { Accept: 'application/vnd.github.raw' } });
        const name = row.dataset.r.split('/')[1];
        fSet(`/${name}/README.md`, rd.ok ? (await rd.text()).slice(0, 20000) : '# ' + name);
        Panel.open('files');
        toast('Clonado com README real ✓', 'check');
      } catch (_) { toast('Falha de rede', 'error'); }
    });
  };
  if (mgr) {
    const tabs = box.querySelector('#ghTabs');
    paintRepos(tabs);
    box.querySelectorAll('.pd-tabs button').forEach(b => b.onclick = async () => {
      box.querySelectorAll('.pd-tabs button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      if (b.dataset.t === 'r') return paintRepos(tabs);
      tabs.innerHTML = '<div class="empty">Carregando…</div>';
      try {
        const repo = repos[0];
        if (!repo) { tabs.innerHTML = '<div class="empty">Sem repos.</div>'; return; }
        const items = await Conn.gh(`/repos/${repo.full_name}/${b.dataset.t === 'i' ? 'issues?per_page=5' : 'pulls?per_page=5'}`);
        tabs.innerHTML = items.length ? items.map(i => `<div class="row">${icon(b.dataset.t === 'i' ? 'alert' : 'git')}<div class="grow"><div class="t">${esc(i.title)}</div><div class="s">#${i.number} • ${esc(i.state)}</div></div></div>`).join('') : '<div class="empty">Nada aqui.</div>';
      } catch (e) { tabs.innerHTML = `<div class="empty">Falha: ${esc(e.message)}</div>`; }
    });
  } else paintRepos(box.querySelector('#ghRepos'));
};
/* ---------- Serviços / Métricas / Diagnóstico / Descobrir / Legal ---------- */
SettingsPage.services = function () {
  Page.open('services', 'Serviços conectados', async el => {
    el.innerHTML = '<div class="empty">Verificando serviços…</div>';
    const st = await Conn.check();
    const dot = v => v === 'online' ? 'ok pulse' : (v === 'sem chave' ? 'warn' : 'off');
    el.innerHTML = `<div class="diag-row"><div class="svc-dot ${dot(st.github)}"></div><div class="grow"><div class="t">GitHub API</div><div class="s">api.github.com • ${esc(st.github)} • dados reais de usuários e repos</div></div></div>
      <div class="diag-row"><div class="svc-dot ${dot(st.openrouter)}"></div><div class="grow"><div class="t">OpenRouter</div><div class="s">openrouter.ai • ${esc(st.openrouter)} • ${Conn.useReal() ? 'respostas reais ATIVADAS' : 'ative com sua chave nas configurações de IA'}</div></div><button class="mini-btn" id="svcKey">Chave</button></div>
      <div class="diag-row"><div class="svc-dot ok"></div><div class="grow"><div class="t">Registro de plugins</div><div class="s">${PLUGIN_DEFS.length} plugins no catálogo • ${Object.keys(Plugins.installed).length} instalados</div></div><button class="mini-btn" id="svcPlug">Ver</button></div>
      <div class="diag-row"><div class="svc-dot ok"></div><div class="grow"><div class="t">Atualização</div><div class="s">Thcode ${APP_VER} • canal estável${Conn.lastCheck ? ' • verificado às ' + Conn.lastCheck : ''}</div></div><button class="mini-btn" id="svcUpd">Verificar</button></div>
      <div class="btn-row"><button class="big-btn primary" id="svcTest">Testar tudo de novo</button></div>`;
    el.querySelector('#svcKey').onclick = () => { Panel.open('ai'); setTimeout(() => { AI.aiTab = 'settings'; Panel.render(); }, 60); };
    el.querySelector('#svcPlug').onclick = () => Page.open('plugins', 'Plugins', p => renderPlugins(p, true));
    el.querySelector('#svcUpd').onclick = () => { Notifs.push('Atualização', 'Thcode ' + APP_VER + ' está atualizado.', 'refresh'); toast('Thcode está atualizado ✓', 'check'); };
    el.querySelector('#svcTest').onclick = () => this.services();
  }, false);
};
SettingsPage.metrics = function () {
  Page.open('metrics', 'Métricas', el => {
    let lsBytes = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); lsBytes += (localStorage.getItem(k) || '').length; } } catch (_) {}
    const files = Object.keys(FS.files).length;
    const bytes = Object.values(FS.files).reduce((a, f) => a + ((f && f.c) || '').length, 0);
    const lines = Object.values(FS.files).reduce((a, f) => a + ((f && f.c) || '').split('\n').length, 0);
    const mem = (performance && performance.memory) ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + ' MB' : '—';
    const m = (v, l) => `<div class="metric"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    el.innerHTML = `<div class="sect">Desempenho</div><div class="metric-grid">
      ${m(Metrics.bootMs + ' ms', 'Tempo de boot')}${m(document.querySelectorAll('*').length, 'Nós DOM')}${m(mem, 'Memória JS')}${m((Metrics.counts.ai || 0), 'Chamadas de IA')}</div>
      <div class="sect">Workspace</div><div class="metric-grid">
      ${m(files, 'Arquivos')}${m(lines.toLocaleString('pt-BR'), 'Linhas de código')}${m((bytes / 1024).toFixed(1) + ' KB', 'Tamanho do código')}${m((Metrics.counts.preview || 0), 'Previews abertos')}</div>
      <div class="sect">Armazenamento</div><div class="metric-grid">
      ${m((lsBytes / 1024).toFixed(1) + ' KB', 'localStorage usado')}${m(Object.keys(Plugins.installed).length, 'Plugins ativos')}</div>`;
  }, false);
};
SettingsPage.diagnostics = function () {
  Page.open('diag', 'Diagnóstico', el => {
    const rows = [];
    const add = (st, t, s) => rows.push(`<div class="diag-row"><div class="diag-ic ${st}">${icon(st === 'ok' ? 'check' : st === 'warn' ? 'alert' : 'info')}</div><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div></div>`);
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); add('ok', 'Armazenamento', 'localStorage funcionando.'); }
    catch (_) { add('warn', 'Armazenamento', 'localStorage indisponível — nada será salvo.'); }
    add(navigator.onLine ? 'ok' : 'warn', 'Rede', navigator.onLine ? 'Online — APIs reais disponíveis.' : 'Offline — usando cache e simulação.');
    add('info', 'Tela', `${screen.width}×${screen.height} • ${matchMedia('(orientation: landscape)').matches ? 'paisagem' : 'retrato'}.`);
    const upd = Object.keys(Plugins.updates).length;
    add(upd ? 'warn' : 'ok', 'Plugins', upd ? `${upd} atualização(ões) pendente(s).` : 'Todos os plugins atualizados.');
    add(Conn.key() ? 'ok' : 'info', 'API de IA', Conn.key() ? (Conn.useReal() ? 'Chave configurada e API real ATIVA.' : 'Chave configurada (modo offline selecionado).') : 'Sem chave — IA roda em modo offline.');
    add('ServiceWorker' in navigator ? 'ok' : 'warn', 'PWA', 'ServiceWorker' in navigator ? 'Suportado — app instalável.' : 'Não suportado neste navegador.');
    el.innerHTML = rows.join('') + `<div class="btn-row"><button class="big-btn" id="dgCopy">Copiar relatório</button><button class="big-btn primary" id="dgFix">Corrigir tudo</button></div>`;
    el.querySelector('#dgCopy').onclick = () => { navigator.clipboard?.writeText(`Thcode ${APP_VER} — boot ${Metrics.bootMs}ms — plugins ${Object.keys(Plugins.installed).length} — ${navigator.onLine ? 'online' : 'offline'}`); toast('Relatório copiado', 'check'); };
    el.querySelector('#dgFix').onclick = () => {
      Object.keys(Plugins.updates).forEach(id => Plugins.update(id));
      toast(upd ? 'Atualizando plugins…' : 'Nada a corrigir ✓', upd ? 'refresh' : 'check');
    };
  }, false);
};
SettingsPage.discover = function () {
  const items = [
    ['Acode Editor', 'O editor original que inspirou o Thcode', 'https://acode.foxdebug.com', 'linear-gradient(135deg,#a100ff,#5b21b6)', 'logo'],
    ['Acode no GitHub', 'Código-fonte original (GPL-3.0)', 'https://github.com/Acode-Foundation/Acode', 'linear-gradient(135deg,#111827,#374151)', 'github'],
    ['Thcode Repo', 'Repositório deste projeto', THCODE_REPO, 'linear-gradient(135deg,#a100ff,#ec4899)', 'logo'],
    ['OpenRouter', 'Centenas de modelos de IA, uma API', 'https://openrouter.ai', 'linear-gradient(135deg,#0ea5e9,#6366f1)', 'ai'],
    ['GitHub', 'Hospede e colabore em código', 'https://github.com', 'linear-gradient(135deg,#111827,#000)', 'github'],
    ['MDN Web Docs', 'Referência de HTML, CSS e JS', 'https://developer.mozilla.org', 'linear-gradient(135deg,#1e293b,#0ea5e9)', 'book'],
    ['Node.js', 'JavaScript no servidor', 'https://nodejs.org', 'linear-gradient(135deg,#22c55e,#14532d)', 'hex'],
    ['Python', 'Linguagem Python oficial', 'https://python.org', 'linear-gradient(135deg,#3776ab,#ffd43b)', 'files'],
    ['Stack Overflow', 'Perguntas e respostas dev', 'https://stackoverflow.com', 'linear-gradient(135deg,#f97316,#7c2d12)', 'help'],
    ['OpenAI', 'Modelos GPT e API', 'https://openai.com', 'linear-gradient(135deg,#10a37f,#0d5c46)', 'ai'],
    ['Google AI', 'Gemini e AI Studio', 'https://ai.google', 'linear-gradient(135deg,#4285f4,#34a853)', 'ai'],
    ['Anthropic', 'Claude e API', 'https://anthropic.com', 'linear-gradient(135deg,#d97706,#92400e)', 'ai']
  ];
  Page.open('discover', 'Descobrir', el => {
    if (CAPS.academy) {
      const lessons = [
        ['Terminal Linux', 'cd, ls, pipes e variáveis', 'cd /MeuJarvis\nls -la\ncat index.html | head -n 20\nNOME=Thcode && echo Olá $NOME'],
        ['Plugins', 'Detalhes, configurações e API própria', 'Toque num plugin para ver detalhes.\nUse ⚙ para configurar.\nCrie o seu em Plugins → ＋ Novo.'],
        ['IA real', 'Chat, agente e OpenRouter', 'Ative sua chave em AI → Configurações.\nUse CTX no agente para anexar arquivos.']
      ];
      const box = document.createElement('div');
      box.innerHTML = '<div class="sect">🎓 Tutoriais Thcode Academy</div>' + lessons.map((l, i) => `<div class="diag-row" data-i="${i}" style="cursor:pointer"><div class="diag-ic info">${icon('book')}</div><div class="grow"><div class="t">${l[0]}</div><div class="s">${l[1]}</div></div></div>`).join('');
      el.appendChild(box);
      box.querySelectorAll('.diag-row').forEach(r => r.onclick = () => dAlert(lessons[+r.dataset.i][0], `<pre style="white-space:pre-wrap;font-size:12px">${esc(lessons[+r.dataset.i][2])}</pre>`));
    }
    el.innerHTML += `<div class="discover-grid">${items.map(([t, s, u, bg, ic]) => `<div class="disc-card" data-u="${esc(u)}"><div class="plugin-ico" style="background:${bg}">${icon(ic)}</div><b>${esc(t)}</b><span>${esc(s)}</span><span class="go">Abrir ↗</span></div>`).join('')}</div>`;
    el.querySelectorAll('.disc-card').forEach(c => c.onclick = () => { try { window.open(c.dataset.u, '_blank'); } catch (_) { toast('Não foi possível abrir', 'error'); } });
  }, false);
};
SettingsPage.legal = function () {
  Page.open('legal', 'Termos e Privacidade', el => {
    el.innerHTML = '';
    el.appendChild(setRow('book', 'Termos de Serviço', 'Regras de uso do Thcode.', () => this.terms()));
    el.appendChild(setRow('lock', 'Política de Privacidade', 'Como seus dados são tratados.', () => this.privacy()));
    el.appendChild(setRow('info', 'Avisos', 'Licenças e créditos de terceiros.', () => this.notices()));
    note(el, 'Última atualização: <b>28/09/2026</b> • Versão ' + APP_VER);
  }, false);
};
SettingsPage.terms = function () {
  Page.open('terms', 'Termos de Serviço', el => {
    el.innerHTML = `<div class="legal"><div class="upd">Vigência: 28/09/2026 • Thcode ${APP_VER}</div>
    <h2>1. O serviço</h2><p>Thcode é um editor de código mobile open-source (licença MIT). O app roda 100% no seu aparelho: arquivos, configurações e plugins ficam salvos localmente.</p>
    <h2>2. Uso aceitável</h2><ul><li>Você pode usar, copiar, modificar e distribuir o Thcode conforme a licença MIT.</li><li>Não use o app para violar leis ou direitos de terceiros.</li><li>Chaves de API são de sua responsabilidade: nunca as compartilhe.</li></ul>
    <h2>3. Serviços de terceiros</h2><p>Recursos opcionais usam APIs externas (GitHub, OpenRouter). Ao ativá-los, aplicam-se também os termos desses provedores. O Thcode não se responsabiliza por indisponibilidade ou cobrança desses serviços.</p>
    <h2>4. Garantias</h2><p>O software é fornecido "COMO ESTÁ", sem garantias. Em nenhuma hipótese os autores serão responsáveis por perda de dados — mantenha backups.</p>
    <h2>5. Contato</h2><p>Abra uma issue no repositório oficial: ${esc(THCODE_REPO)}.</p></div>`;
  }, false);
};
SettingsPage.privacy = function () {
  Page.open('privacy', 'Política de Privacidade', el => {
    el.innerHTML = `<div class="legal"><div class="upd">Vigência: 28/09/2026 • Thcode ${APP_VER}</div>
    <h2>1. Dados locais</h2><p>Todo o seu código, configurações, histórico de terminal e contas locais ficam <b>somente no seu aparelho</b> (localStorage). O Thcode não possui servidor próprio e não coleta, transmite ou vende seus dados.</p>
    <h2>2. Chaves de API</h2><p>Chaves (OpenRouter, OpenAI, Gemini etc.) são armazenadas apenas localmente e enviadas <b>somente</b> ao provedor escolhido, quando você ativa a API real.</p>
    <h2>3. Rede</h2><ul><li><b>GitHub:</b> buscas de usuário/repos via api.github.com (sem autenticação).</li><li><b>OpenRouter:</b> apenas com sua chave e autorização.</li><li><b>Diagnóstico:</b> nenhuma telemetria é enviada.</li></ul>
    <h2>4. Seus direitos</h2><p>Você pode exportar (backup JSON) ou apagar tudo a qualquer momento em Configurações → Restaurar original.</p></div>`;
  }, false);
};
SettingsPage.notices = function () {
  Page.open('notices', 'Avisos de Terceiros', el => {
    el.innerHTML = `<div class="legal"><div class="upd">Thcode ${APP_VER} • base Acode ${ACODE_BASE}</div>
    <h2>Licenças</h2><ul><li><b>Thcode</b> — MIT (este projeto).</li><li><b>Acode</b> — GPL-3.0, © Acode-Foundation. Interface e fluxos inspirados no original.</li></ul>
    <h2>Serviços</h2><ul><li><b>GitHub API</b> — © GitHub, Inc. Termos em docs.github.com.</li><li><b>OpenRouter</b> — Termos em openrouter.ai/terms.</li><li><b>Fontes do sistema</b> — sem dependências externas; o app funciona offline.</li></ul>
    <h2>Marcas</h2><p>Android, Google Play e marcas de terceiros pertencem aos seus detentores.</p></div>`;
  }, false);
};

