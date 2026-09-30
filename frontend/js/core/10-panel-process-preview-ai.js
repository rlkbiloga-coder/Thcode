/* ============================== RUNNING PROCESSES ============================== */
const Procs = {
  list: [
    { pid: 101, name: 'Web Server', status: 'running', cpu: 4.2, mem: 38, started: '10:30:12' },
    { pid: 102, name: 'Terminal', status: 'running', cpu: 1.1, mem: 21, started: '10:30:12' },
    { pid: 103, name: 'AI Assistant', status: 'running', cpu: 12.8, mem: 96, started: '10:30:14' },
    { pid: 104, name: 'Plugin Manager', status: 'paused', cpu: 0, mem: 12, started: '10:30:14' },
    { pid: 105, name: 'File Watcher', status: 'running', cpu: 0.6, mem: 9, started: '10:30:15' },
    { pid: 106, name: 'Preview Server', status: 'stopped', cpu: 0, mem: 0, started: '—' }
  ],
  open() { Page.open('procs', 'Running processes', el => this.render(el)); },
  render(el) {
    el.innerHTML = '<div class="proc-grid" id="procGrid"></div>';
    const grid = el.querySelector('#procGrid');
    this.list.forEach(p => {
      const c = document.createElement('div');
      c.className = 'proc-card'; c.dataset.pid = p.pid;
      c.innerHTML = `<div class="proc-head"><span class="proc-dot ${p.status}"></span><span class="proc-name">${esc(p.name)}</span><span class="proc-pid">PID ${p.pid}</span></div>
        <div class="proc-stats"><span>CPU <b>${p.cpu.toFixed(1)}%</b></span><span>MEM <b>${p.mem} MB</b></span><span>START <b>${esc(p.started)}</b></span></div>
        <div class="proc-btns">
          <button class="go" data-a="start">Start</button><button class="warn" data-a="pause">Pause</button>
          <button data-a="restart">Restart</button><button class="stop" data-a="stop">Stop</button>
        </div>`;
      c.querySelectorAll('button').forEach(b => b.onclick = () => this.action(p.pid, b.dataset.a));
      grid.appendChild(c);
    });
  },
  action(pid, a) {
    const p = this.list.find(x => x.pid === pid);
    if (!p) return;
    if (a === 'start') { p.status = 'running'; p.started = fmtTime(); p.cpu = +(Math.random() * 8 + 1).toFixed(1); p.mem = Math.round(Math.random() * 60 + 10); toast(`${p.name} iniciado`, 'play'); }
    else if (a === 'pause') { p.status = 'paused'; p.cpu = 0; toast(`${p.name} pausado`, 'pause'); }
    else if (a === 'stop') { p.status = 'stopped'; p.cpu = 0; p.mem = 0; toast(`${p.name} parado`, 'stop'); }
    else if (a === 'restart') { p.status = 'running'; p.started = fmtTime(); p.cpu = +(Math.random() * 8 + 1).toFixed(1); toast(`${p.name} reiniciado`, 'refresh'); }
    clog(p.status === 'running' ? 'INFO' : 'WARN', `Process ${p.name} (${pid}): ${p.status}`);
    Store.save();
    if (Page.current === 'procs') Page.rerender();
  },
  tick() {
    let changed = false;
    this.list.forEach(p => {
      if (p.status === 'running') {
        p.cpu = +clamp(p.cpu + (Math.random() * 4 - 2), 0.2, 45).toFixed(1);
        p.mem = Math.max(4, Math.round(p.mem + (Math.random() * 6 - 3)));
        changed = true;
      }
    });
    if (changed && Page.current === 'procs') {
      this.list.forEach(p => {
        const card = document.querySelector(`.proc-card[data-pid="${p.pid}"] .proc-stats`);
        if (card) card.innerHTML = `<span>CPU <b>${p.cpu.toFixed(1)}%</b></span><span>MEM <b>${p.mem} MB</b></span><span>START <b>${esc(p.started)}</b></span>`;
      });
    }
  }
};

/* ============================== PREVIEW ============================== */
const Preview = {
  open(path = null) {
    const p = path || T.active;
    Page.open('preview', 'Preview', el => this.render(el, p));
  },
  render(el, p) {
    if (!p || detectLang(p) !== 'html') {
      el.innerHTML = `<div class="empty">${icon('preview')}<br>${p ? 'Preview disponível apenas para arquivos HTML.<br>Abra um .html para visualizar.' : 'Nenhum arquivo aberto.'}</div>
        <div class="btn-row"><button class="big-btn primary" id="pvOpen">Abrir index.html</button></div>`;
      el.querySelector('#pvOpen').onclick = () => { if (fExists('/MeuJarvis/index.html')) { openFile('/MeuJarvis/index.html'); this.open('/MeuJarvis/index.html'); } };
      if (p && fExists(p)) {
        const info = document.createElement('div');
        info.className = 'note';
        info.innerHTML = `<b>Execução simulada:</b> ${esc(baseName(p))} (${LANGS[detectLang(p)].name})<br>Use <b>Terminal → run</b> para simular a execução.`;
        el.appendChild(info);
      }
      return;
    }
    const url = S.previewMode === 'browser' ? `http://localhost:${S.previewPort}${p}` : `preview:${p}`;
    el.innerHTML = `<div class="preview-tabs"><button id="pvEdit">Editor</button><button class="sel" id="pvView">Preview</button></div>
      <div class="preview-bar"><div class="preview-url">${esc(url)}</div>
      <button class="icon-mini" id="pvReload" title="Recarregar">${icon('refresh')}</button>
      <button class="icon-mini" id="pvExt" title="Abrir no navegador">${icon('external')}</button></div>
      <div style="flex:1;display:flex;min-height:50vh"><iframe class="preview-frame" id="pvFrame" sandbox="allow-scripts" title="Preview"></iframe></div>`;
    const frame = el.querySelector('#pvFrame');
    const load = () => {
      const content = T.active === p ? Ed.value() : Ed.currentContent(p);
      frame.srcdoc = content;
      toast('Preview atualizado', 'refresh');
    };
    load();
    el.querySelector('#pvReload').onclick = load;
    el.querySelector('#pvExt').onclick = () => {
      const blob = new Blob([T.active === p ? Ed.value() : Ed.currentContent(p)], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    };
    el.querySelector('#pvEdit').onclick = () => { Page.close(); openFile(p); };
  }
};

/* ============================== AI (Rutex Agent + Assistant) ============================== */
const AI_MODELS = ['OpenRouter', 'GPT-4o mini', 'Claude 3.5 Sonnet', 'DeepSeek V3', 'Llama 3.1 70B', 'Gemini 1.5 Flash'];
const AI = {
  agentMsgs: [], chats: [], chatId: null, model: 'OpenRouter', ctx: [], streaming: false, stopFlag: false,
  currentChat() {
    let c = this.chats.find(x => x.id === this.chatId);
    if (!c) { c = { id: uid(), title: 'Nova conversa', msgs: [], ts: Date.now() }; this.chats.unshift(c); this.chatId = c.id; }
    return c;
  },
  /* ---------- RUTEX CODING AGENT ---------- */
  renderAgent(container) {
    Panel.setHead('Rutex Agent', 'Coding Agent • ' + this.model, [
      { ic: 'plus', t: 'Nova conversa', fn: () => { this.agentMsgs = []; this.ctx = []; Store.save(); Panel.render(); } },
      { ic: 'clock', t: 'Histórico', fn: () => toast(`${this.agentMsgs.length} mensagens nesta sessão`, 'clock') },
      { ic: 'settings', t: 'Configurar', fn: () => AI.agentSettings() }
    ]);
    container.innerHTML = `<div class="ai-wrap">
      <div class="ai-head">
        <div class="ai-brand"><span class="live"></span>RUTEX CODING <span style="color:var(--accent2)">AGENT</span><span class="sp"></span></div>
        <div class="ai-ctx" id="agentCtx"></div>
        <div class="ai-model-row"><span class="lab">MODEL</span><select class="ai-model" id="agentModel">${AI_MODELS.map(m => `<option${m === this.model ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
      </div>
      <div class="ai-msgs" id="agentMsgs"></div>
      <div class="ai-composer">
        <div class="ai-input-row"><textarea class="ai-input" id="agentIn" rows="1" placeholder="Instruct AI Agent..."></textarea><button class="ai-send" id="agentSend">${icon('send')}</button></div>
        <div class="ai-tools">
          <button class="icon-mini" id="agentAttach" title="Anexar arquivo">${icon('attach')}</button>
          <button class="icon-mini" id="agentCtxBtn" title="Adicionar contexto (arquivo aberto)">${icon('plus')}</button>
          <button class="icon-mini" id="agentClear" title="Limpar conversa">${icon('trash')}</button>
          <span class="ai-hint"><b>Shift + Enter</b> send • <b>Enter</b> newline</span>
        </div>
      </div>
    </div>`;
    const paintCtx = () => {
      const box = container.querySelector('#agentCtx');
      box.innerHTML = `<span class="ctx-chip" style="color:var(--muted2)">CTX</span>` +
        this.ctx.map((c, i) => `<span class="ctx-chip">${icon('file', 'width:13px;height:13px')}${esc(baseName(c))}<button data-i="${i}">✕</button></span>`).join('') +
        `<span class="ctx-chip ctx-add" id="ctxAdd">+ add file</span>`;
      box.querySelectorAll('.ctx-chip button').forEach(b => b.onclick = () => { this.ctx.splice(+b.dataset.i, 1); paintCtx(); });
      box.querySelector('#ctxAdd').onclick = () => this.pickCtx(paintCtx);
    };
    paintCtx();
    container.querySelector('#agentModel').onchange = e => { this.model = e.target.value; Panel.setHead('Rutex Agent', 'Coding Agent • ' + this.model, []); Panel.render(); };
    this.paintAgentMsgs(container);
    const inp = container.querySelector('#agentIn');
    inp.addEventListener('input', () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 110) + 'px'; });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); this.sendAgent(container); }
    });
    container.querySelector('#agentSend').onclick = () => this.sendAgent(container);
    container.querySelector('#agentAttach').onclick = () => this.pickCtx(paintCtx);
    container.querySelector('#agentCtxBtn').onclick = () => { if (T.active && !this.ctx.includes(T.active)) { this.ctx.push(T.active); paintCtx(); toast('Contexto adicionado', 'plus'); } else toast('Nenhum arquivo aberto', 'info'); };
    container.querySelector('#agentClear').onclick = () => { this.agentMsgs = []; Store.save(); this.paintAgentMsgs(container); };
  },
  pickCtx(cb) {
    const files = Object.keys(FS.files).filter(f => baseName(f) !== '.keep');
    if (!files.length) { toast('Nenhum arquivo', 'info'); return; }
    dList('Adicionar ao contexto', files.slice(0, 30).map(f => ({ label: baseName(f), hint: dirName(f), value: f }))).then(v => {
      if (v && !this.ctx.includes(v)) { this.ctx.push(v); cb && cb(); toast('Arquivo anexado', 'attach'); }
    });
  },
  paintAgentMsgs(container) {
    const box = (container || document).querySelector('#agentMsgs');
    if (!box) return;
    box.innerHTML = this.agentMsgs.length ? '' : '<div class="ai-welcome"><h3>Rutex Coding Agent</h3><p>Anexe arquivos em CTX e peça explicações, correções ou novo código.</p></div>';
    this.agentMsgs.forEach(m => box.appendChild(this.msgEl(m)));
    box.scrollTop = box.scrollHeight;
  },
  msgEl(m) {
    const d = document.createElement('div');
    d.className = 'msg ' + m.role;
    const who = m.role === 'you' ? `${icon('ai')} YOU` : `${icon('hex')} RUTEX`;
    let body = esc(m.text);
    if (m.role === 'ai') {
      body = body.replace(/```(\w*)\n([\s\S]*?)```/g, (mm, l, code) => `<pre><code>${code.replace(/\n$/, '')}</code></pre>`)
        .replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    }
    d.innerHTML = `<div class="who">${who}</div><div>${body}</div>`;
    return d;
  },
  sendAgent(container) {
    if (this.streaming) { this.stopFlag = true; toast('Resposta interrompida', 'stop'); return; }
    const inp = container.querySelector('#agentIn');
    const text = inp.value.trim();
    if (!text) return;
    this.agentMsgs.push({ role: 'you', text });
    inp.value = ''; inp.style.height = 'auto';
    this.paintAgentMsgs(container);
    this.streamReply(container, text, 'agent');
    Store.save();
  },
  streamReply(container, prompt, mode) {
    const boxSel = mode === 'agent' ? '#agentMsgs' : '#aiMsgs';
    const box = container.querySelector(boxSel);
    if (!box) return;
    this.streaming = true;
    this.stopFlag = false;
    const typing = document.createElement('div');
    typing.className = 'msg ai';
    typing.innerHTML = `<div class="who">${icon('hex')} RUTEX</div><span class="typing-dots"><i></i><i></i><i></i></span>`;
    box.appendChild(typing);
    box.scrollTop = box.scrollHeight;
    const full = this.generate(prompt);
    const words = full.split(' ');
    let i = 0, body = typing.querySelector('.typing-dots');
    const step = () => {
      if (!document.contains(typing)) { this.streaming = false; return; }
      if (this.stopFlag) { typing.remove(); this.streaming = false; this.stopFlag = false; return; }
      i += 3;
      const partial = words.slice(0, i).join(' ');
      const html = `<div class="stream">${esc(partial).replace(/\n/g, '<br>')}▍</div>`;
      if (body) { const d = document.createElement('div'); d.innerHTML = html; const nd = d.firstChild; body.replaceWith(nd); body = nd; }
      else if (typing.querySelector('.stream')) typing.querySelector('.stream').outerHTML = html;
      box.scrollTop = box.scrollHeight;
      if (i < words.length) setTimeout(step, 40);
      else {
        typing.remove();
        const msg = { role: 'ai', text: full };
        if (mode === 'agent') { this.agentMsgs.push(msg); this.paintAgentMsgs(container); }
        else { this.currentChat().msgs.push(msg); this.paintChat(container); }
        this.streaming = false;
        Store.save();
      }
    };
    setTimeout(step, 900);
  },
  generate(prompt) {
    const p = prompt.toLowerCase();
    const ctxFiles = this.ctx.filter(fExists);
    const sel = Ed.input && T.active ? Ed.input.value.slice(Ed.input.selectionStart, Ed.input.selectionEnd) : '';
    const codeRef = sel && sel.length > 4 && sel.length < 800 ? sel : (ctxFiles.length ? (fGet(ctxFiles[0]).c.split('\n').slice(0, 40).join('\n')) : '');
    const stats = f => { const c = fGet(f).c; return `${c.split('\n').length} linhas, ${c.length} caracteres (${LANGS[detectLang(f)].name})`; };
    if (/(explain|explic|analis|o que|que faz)/.test(p)) {
      if (!codeRef && !ctxFiles.length) return 'Anexe um arquivo em CTX ou selecione um trecho do código e peça novamente — assim posso explicar cada parte em detalhes.';
      let r = `Análise do código${ctxFiles.length ? ` de ${ctxFiles.map(baseName).join(', ')}` : ' selecionado'}:\n\n`;
      if (ctxFiles.length) r += ctxFiles.map(f => `• ${baseName(f)} — ${stats(f)}`).join('\n') + '\n\n';
      const lines = codeRef.split('\n');
      const fns = (codeRef.match(/function\s+\w+|const\s+\w+\s*=\s*\(|def\s+\w+|fn\s+\w+/g) || []).length;
      r += `Encontrei ${lines.length} linhas analisadas e ${fns} função(ões) declarada(s). `;
      r += 'A estrutura segue boas práticas: separação de responsabilidades, nomes descritivos e fluxo legível. ';
      r += 'Pontos de atenção: valide entradas externas, evite valores fixos duplicados e prefira funções pequenas e testáveis. Quer que eu otimize um trecho específico?';
      return r;
    }
    if (/(fix|corrig|erro|bug|debug)/.test(p)) {
      return 'Analisei o contexto em busca de falhas comuns:\n\n```js\n// antes (possível problema)\nbtn.addEventListener("click", () => {\n  falar(respostas[i]); // "i" pode estar fora do escopo\n});\n\n// depois (correção sugerida)\nbtn.addEventListener("click", () => {\n  const i = Math.floor(Math.random() * respostas.length);\n  falar(respostas[i]);\n});\n```\n\nVerifique também: elementos nulos (`getElementById` retornando null), erros de digitação em nomes e chaves não fechadas. Cole o erro do console para um diagnóstico exato.';
    }
    if (/(otimiz|melhor|refactor|refator|performance)/.test(p)) {
      return 'Sugestões de otimização:\n\n1. Evite consultas repetidas ao DOM — guarde referências em `const`.\n2. Use delegação de eventos em listas grandes.\n3. Prefira `DocumentFragment` ao inserir muitos nós.\n4. Debounce em eventos de `input`/`scroll`.\n\nExemplo:\n```js\nconst debounce = (fn, ms) => {\n  let t;\n  return (...a) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...a), ms);\n  };\n};\n```\nQuer que eu aplique alguma dessas mudanças no arquivo atual?';
    }
    if (/(cri|ger|novo|exemplo|snippet|função|funcao)/.test(p)) {
      return 'Aqui está um exemplo pronto para usar:\n\n```js\n// Toast simples estilo Acode\nfunction toast(msg) {\n  const t = document.createElement("div");\n  t.className = "toast";\n  t.textContent = msg;\n  document.body.appendChild(t);\n  setTimeout(() => t.remove(), 2200);\n}\n```\n\nDiga o que precisa — componente HTML, estilo CSS ou função JS — que eu gero o código completo.';
    }
    if (/(oi|olá|ola|hey|hello|bom dia|boa tarde|boa noite)\b/.test(p)) {
      return `Olá! Sou o Rutex, seu coding agent. Posso explicar código, corrigir bugs, otimizar e gerar snippets. ${T.active ? `Vejo que você está editando ${baseName(T.active)} — quer uma análise dele?` : 'Abra um arquivo para começarmos.'}`;
    }
    if (/(obrigado|valeu|thanks)/.test(p)) return 'Por nada! Continue codando — estou aqui quando precisar. Quer revisar mais algum arquivo?';
    return `Entendi: "${prompt.slice(0, 120)}". Com base no projeto /MeuJarvis, aqui vai minha recomendação:\n\n• Mantenha o código organizado por responsabilidade (HTML, CSS e JS separados).\n• Teste cada mudança no Preview antes de continuar.\n• Use o Terminal para inspecionar arquivos (ls, cat).\n\nSeja mais específico — por exemplo: "explique a função falar", "otimize o CSS" ou "crie um modal" — e eu respondo com código pronto.`;
  },
  agentSettings() {
    dList('Agent Settings', [
      { label: 'Modelo: ' + this.model, icon: 'ai', value: 'm' },
      { label: 'Limpar conversa', icon: 'trash', value: 'c' }
    ]).then(r => {
      if (r === 'm') dList('Escolher modelo', AI_MODELS.map(m => ({ label: m, value: m }))).then(v => { if (v) { this.model = v; Panel.render(); toast('Modelo: ' + v, 'ai'); } });
      if (r === 'c') { this.agentMsgs = []; Store.save(); Panel.render(); }
    });
  },
  /* ---------- AI ASSISTANT BETA ---------- */
  aiTab: 'chat',
  renderAssistant(container) {
    Panel.setHead('AI Assistant', 'Beta • ' + this.model, [
      { ic: 'plus', t: 'Nova conversa', fn: () => { this.chatId = null; this.currentChat(); Store.save(); Panel.render(); } }
    ]);
    container.innerHTML = `<div class="ai-wrap">
      <div class="ai-tabs"><button data-t="chat" class="${this.aiTab === 'chat' ? 'sel' : ''}">Chat</button><button data-t="history" class="${this.aiTab === 'history' ? 'sel' : ''}">History</button><button data-t="settings" class="${this.aiTab === 'settings' ? 'sel' : ''}">Settings</button></div>
      <div class="ai-msgs" id="aiMsgs" style="${this.aiTab === 'chat' ? '' : 'display:none'}"></div>
      <div id="aiAlt" style="flex:1;overflow-y:auto;${this.aiTab === 'chat' ? 'display:none' : ''}"></div>
      <div class="ai-composer" id="aiComposer" style="${this.aiTab === 'chat' ? '' : 'display:none'}">
        <div class="ai-input-row"><input class="ai-input" id="aiIn" placeholder="Type your message..." autocomplete="off"><button class="ai-send" id="aiSend">${icon('send')}</button></div>
      </div>
    </div>`;
    container.querySelectorAll('.ai-tabs button').forEach(b => b.onclick = () => { this.aiTab = b.dataset.t; Panel.render(); });
    if (this.aiTab === 'chat') {
      this.paintChat(container);
      const inp = container.querySelector('#aiIn');
      const send = () => {
        if (this.streaming) { this.stopFlag = true; return; }
        const t = inp.value.trim();
        if (!t) return;
        inp.value = '';
        if (!this.currentChat().msgs.length) this.currentChat().title = t.slice(0, 34);
        this.currentChat().msgs.push({ role: 'you', text: t });
        this.paintChat(container);
        this.streamReply(container, t, 'chat');
        Store.save();
      };
      container.querySelector('#aiSend').onclick = send;
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    } else if (this.aiTab === 'history') {
      const alt = container.querySelector('#aiAlt');
      alt.innerHTML = this.chats.length ? '' : '<div class="empty">Nenhuma conversa ainda</div>';
      this.chats.forEach(c => {
        const r = document.createElement('div');
        r.className = 'row' + (c.id === this.chatId ? ' selected' : '');
        r.innerHTML = `${icon('clock')}<div class="grow"><div class="t">${esc(c.title)}</div><div class="s">${c.msgs.length} mensagens</div></div>`;
        r.onclick = () => { this.chatId = c.id; this.aiTab = 'chat'; Panel.render(); };
        alt.appendChild(r);
      });
    } else {
      const alt = container.querySelector('#aiAlt');
      alt.innerHTML = `<div class="sect">Modelo</div><div class="opt-list">${AI_MODELS.map(m => `<div class="opt-row${m === this.model ? ' sel' : ''}" data-m="${esc(m)}"><span class="radio"></span>${esc(m)}</div>`).join('')}</div>
        <div class="note"><b>Modo simulado:</b> as respostas são geradas localmente para demonstração, sem backend.</div>`;
      alt.querySelectorAll('.opt-row').forEach(o => o.onclick = () => { this.model = o.dataset.m; Store.save(); Panel.render(); toast('Modelo: ' + this.model, 'ai'); });
    }
  },
  paintChat(container) {
    const box = (container || document).querySelector('#aiMsgs');
    if (!box) return;
    const c = this.currentChat();
    box.innerHTML = c.msgs.length ? '' : '<div class="ai-welcome"><h3>Welcome to AI Assistant</h3><p>Start a conversation by typing your message below.</p></div>';
    c.msgs.forEach(m => box.appendChild(this.msgEl(m)));
    box.scrollTop = box.scrollHeight;
  }
};

