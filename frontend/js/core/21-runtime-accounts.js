/* ==========================================================================
   THCODE v2 — Contas locais (hash + sessão)
   ========================================================================== */
const Auth = {
  KEY: 'thcode.users.v1', SES: 'thcode.session.v1',
  users() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (_) { return []; } },
  saveU(u) { try { localStorage.setItem(this.KEY, JSON.stringify(u)); } catch (_) {} },
  hash(pw, salt) {
    let h1 = 0xdeadbeef ^ salt.length, h2 = 0x41c6ce57 ^ pw.length;
    const s = salt + '::' + pw;
    for (let i = 0; i < s.length; i++) { const ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
  },
  current() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SES));
      return s ? this.users().find(u => u.email === s.email) || null : null;
    } catch (_) { return null; }
  },
  register(name, email, pw) {
    email = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
    if (pw.length < 4) throw new Error('Senha muito curta (mín. 4).');
    const users = this.users();
    if (users.some(u => u.email === email)) throw new Error('Este e-mail já está cadastrado.');
    const salt = Math.random().toString(36).slice(2);
    users.push({ name: name.trim() || email.split('@')[0], email, salt, hash: this.hash(pw, salt), created: Date.now() });
    this.saveU(users);
    localStorage.setItem(this.SES, JSON.stringify({ email }));
  },
  login(email, pw) {
    email = email.trim().toLowerCase();
    const u = this.users().find(x => x.email === email);
    if (!u || u.hash !== this.hash(pw, u.salt)) throw new Error('E-mail ou senha incorretos.');
    localStorage.setItem(this.SES, JSON.stringify({ email }));
    return u;
  },
  logout() { try { localStorage.removeItem(this.SES); } catch (_) {} },
  dialog() {
    const me = this.current();
    if (me) return this.account(me);
    const ov = document.createElement('div');
    ov.className = 'install-ov';
    ov.innerHTML = `<div class="install-card"><h3>Conta Thcode</h3><div class="sub">local • sem servidor • seus dados ficam no aparelho</div>
      <div class="pd-tabs"><button data-t="in" class="sel">Entrar</button><button data-t="up">Criar conta</button></div>
      <div style="padding:14px 2px 4px;display:flex;flex-direction:column;gap:10px">
        <input class="input" id="auName" placeholder="Nome (só p/ criar conta)">
        <input class="input" id="auEmail" placeholder="E-mail" type="email" autocomplete="off">
        <input class="input" id="auPw" placeholder="Senha" type="password">
        <div id="auErr" style="color:var(--red);font-size:12px;min-height:16px"></div>
      </div>
      <div class="btn-row"><button class="big-btn" id="auCancel">Cancelar</button><button class="big-btn primary" id="auGo">Entrar</button></div></div>`;
    document.body.appendChild(ov);
    let mode = 'in';
    const paint = () => {
      ov.querySelectorAll('.pd-tabs button').forEach(b => b.classList.toggle('sel', b.dataset.t === mode));
      ov.querySelector('#auName').style.display = mode === 'up' ? '' : 'none';
      ov.querySelector('#auGo').textContent = mode === 'up' ? 'Criar conta' : 'Entrar';
    };
    ov.querySelectorAll('.pd-tabs button').forEach(b => b.onclick = () => { mode = b.dataset.t; paint(); });
    ov.querySelector('#auCancel').onclick = () => ov.remove();
    ov.onclick = e => { if (e.target === ov) ov.remove(); };
    paint();
    ov.querySelector('#auGo').onclick = () => {
      const err = ov.querySelector('#auErr');
      try {
        if (mode === 'up') { this.register(ov.querySelector('#auName').value, ov.querySelector('#auEmail').value, ov.querySelector('#auPw').value); toast('Conta criada! 🎉', 'check'); }
        else { this.login(ov.querySelector('#auEmail').value, ov.querySelector('#auPw').value); toast('Bem-vindo de volta!', 'check'); }
        Notifs.push('Conta', (mode === 'up' ? 'Conta criada: ' : 'Login: ') + ov.querySelector('#auEmail').value.trim(), 'user');
        ov.remove();
      } catch (e) { err.textContent = e.message; }
    };
  },
  account(me) {
    Page.open('account', 'Minha conta', el => {
      el.innerHTML = `<div class="pd-hero"><div class="avatar" style="width:76px;height:76px;font-size:30px;background:linear-gradient(135deg,var(--accent),var(--accent2))">${esc((me.name || 'U')[0].toUpperCase())}</div>
        <div class="pd-name">${esc(me.name)}</div><div class="pd-chips"><span class="pd-chip">✉ ${esc(me.email)}</span><span class="pd-chip">${State.pro ? '👑 Thcode PRO' : 'Plano gratuito'}</span></div></div>
        <div class="btn-row"><button class="big-btn" id="acOut">Sair</button><button class="big-btn primary" id="acPro">${State.pro ? 'Gerenciar PRO' : 'Assinar PRO'}</button></div>`;
      el.querySelector('#acOut').onclick = () => { this.logout(); Page.back(); toast('Sessão encerrada', 'info'); };
      el.querySelector('#acPro').onclick = () => {
        State.pro = !State.pro; Store.save(); refreshPro();
        Notifs.push('Thcode PRO', State.pro ? 'Acesso vitalício sem anúncios ativado.' : 'Assinatura cancelada.', 'star');
        Page.rerender();
      };
    }, false);
  }
};
