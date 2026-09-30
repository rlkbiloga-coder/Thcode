/* ============================== AUTOCOMPLETE ============================== */
const AC = {
  visible: false, items: [], sel: 0, prefix: '', start: 0,
  maybeShow() {
    if (!S.liveAutoCompletion || !T.active) return;
    const input = Ed.input, s = input.selectionStart, v = input.value;
    const m = v.slice(0, s).match(/[\w$]+$/);
    if (!m || m[0].length < 1) { this.hide(); return; }
    const prefix = m[0];
    if (prefix.length > 24) { this.hide(); return; }
    const lang = LANGS[detectLang(T.active)];
    const set = new Set();
    (lang.kw || []).forEach(k => { if (k.startsWith(prefix) && k !== prefix) set.add(k); });
    if (S.localWordCompletion) {
      const words = v.match(/[\w$]{3,32}/g) || [];
      for (const w of words) { if (w.startsWith(prefix) && w !== prefix) { set.add(w); if (set.size > 40) break; } }
    }
    if (typeof Snippets !== 'undefined') Snippets.add(prefix, set);
    if (typeof PathIntel !== 'undefined') PathIntel.add(prefix, set);
    this.items = [...set].slice(0, 8);
    if (!this.items.length) { this.hide(); return; }
    this.prefix = prefix; this.start = s - prefix.length; this.sel = 0;
    this.show();
  },
  show() {
    const box = $('#autocomplete');
    box.innerHTML = this.items.map((w, i) => `<div class="ac-item${i === this.sel ? ' sel' : ''}" data-i="${i}"><span class="k">${esc(w[0].toUpperCase())}</span><span>${esc(w)}</span></div>`).join('');
    $$('#autocomplete .ac-item').forEach(el => {
      el.addEventListener('pointerdown', e => { e.preventDefault(); this.sel = +el.dataset.i; this.accept(); });
    });
    // posição aproximada do cursor
    const c = Ed.cursorPos(), sc = $('#editorScroll');
    const lh = Ed.lineHeight(), cw = Ed.charWidth();
    const x = clamp(gutterWidth() + 14 + (c.col - 1) * cw - sc.scrollLeft, 8, sc.clientWidth - 180);
    const y = clamp(10 + c.line * lh - sc.scrollTop + 4, 8, sc.clientHeight - 160);
    const wrapR = $('#editorWrap').getBoundingClientRect(), scR = sc.getBoundingClientRect();
    box.style.left = (scR.left - wrapR.left + x) + 'px';
    box.style.top = (scR.top - wrapR.top + y) + 'px';
    box.classList.remove('hidden');
    this.visible = true;
  },
  hide() { $('#autocomplete').classList.add('hidden'); this.visible = false; },
  move(d) { this.sel = (this.sel + d + this.items.length) % this.items.length; this.show(); },
  accept() {
    if (!this.visible || !this.items.length) return;
    const w = this.items[this.sel], input = Ed.input, v = input.value;
    Ed.pushUndo(T.active, v);
    const en = input.selectionEnd;
    input.value = v.slice(0, this.start) + w + v.slice(en);
    input.selectionStart = input.selectionEnd = this.start + w.length;
    this.hide(); Ed.onEdit(false); input.focus();
  }
};

/* ============================== COLOR PREVIEW ============================== */
const ColorChip = {
  maybeShow: debounce(() => {
    const el = $('#colorPreview');
    if (!S.colorPreview || !T.active) { el.classList.add('hidden'); return; }
    const c = Ed.cursorPos(), v = Ed.value();
    const line = v.split('\n')[c.line - 1] || '';
    const m = line.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/);
    if (!m) { el.classList.add('hidden'); return; }
    el.innerHTML = `<i style="background:${esc(m[0])}"></i><span>${esc(m[0])}</span>`;
    const sc = $('#editorScroll'), lh = Ed.lineHeight();
    const wrapR = $('#editorWrap').getBoundingClientRect(), scR = sc.getBoundingClientRect();
    el.style.left = clamp(scR.left - wrapR.left + sc.clientWidth - 170, 8, sc.clientWidth - 160) + 'px';
    el.style.top = clamp(scR.top - wrapR.top + 10 + (c.line - 1) * lh - sc.scrollTop, 8, sc.clientHeight - 60) + 'px';
    el.classList.remove('hidden');
  }, 350)
};

/* ============================== FIND / REPLACE ============================== */
const Find = {
  q: '', matches: [], idx: -1, open_: false,
  open(replace = false) {
    if (!T.active) { toast('Abra um arquivo primeiro', 'info'); return; }
    $('#findbar').classList.remove('hidden');
    $('#replaceRow').classList.toggle('hidden', !replace);
    this.open_ = true;
    const sel = Ed.input.value.slice(Ed.input.selectionStart, Ed.input.selectionEnd);
    if (sel && sel.length < 60 && !sel.includes('\n')) $('#findInput').value = sel;
    this.q = $('#findInput').value;
    this.compute();
    setTimeout(() => { $('#findInput').focus(); $('#findInput').select(); }, 60);
  },
  close() { $('#findbar').classList.add('hidden'); this.reset(); },
  reset() { this.q = ''; this.matches = []; this.idx = -1; this.open_ = false; if (T.active) renderEditor(); },
  onEdit() { if (this.open_) { this.q = $('#findInput').value; this.compute(true); } },
  compute(keep = false) {
    const v = Ed.value(), q = this.q;
    this.matches = [];
    if (q) {
      const vl = v.toLowerCase(), ql = q.toLowerCase();
      let i = -1;
      while ((i = vl.indexOf(ql, i + 1)) >= 0) { this.matches.push(i); if (this.matches.length > 2000) break; }
    }
    this.idx = this.matches.length ? (keep ? clamp(this.idx, 0, this.matches.length - 1) : 0) : -1;
    $('#findCount').textContent = this.matches.length ? `${this.idx + 1}/${this.matches.length}` : '0/0';
    renderEditor();
    if (this.idx >= 0 && !keep) this.goto(this.idx);
  },
  applyMarks(html) {
    if (!this.q || !this.matches.length) return html;
    if (/span|class|tok-|<|>/.test(this.q)) return html;
    const eq = esc(this.q);
    const parts = html.split(eq);
    if (parts.length < 2) return html;
    let n = 0;
    return parts.map((pt, i) => {
      if (i === parts.length - 1) return pt;
      const cls = n === this.idx ? 'tok-mark cur' : 'tok-mark';
      n++;
      return pt + `<span class="${cls}">${eq}</span>`;
    }).join('');
  },
  goto(i) {
    if (!this.matches.length) return;
    this.idx = (i + this.matches.length) % this.matches.length;
    const pos = this.matches[this.idx], len = this.q.length;
    Ed.input.selectionStart = pos; Ed.input.selectionEnd = pos + len;
    const line = Ed.value().slice(0, pos).split('\n').length;
    const lh = Ed.lineHeight(), sc = $('#editorScroll');
    sc.scrollTop = Math.max(0, 10 + (line - 1) * lh - sc.clientHeight / 2);
    $('#findCount').textContent = `${this.idx + 1}/${this.matches.length}`;
    renderEditor();
  },
  next(d) { if (!this.matches.length) return; this.goto(this.idx + d); },
  replaceOne() {
    if (this.idx < 0) return;
    const rep = $('#replaceInput').value, v = Ed.value(), pos = this.matches[this.idx];
    Ed.pushUndo(T.active, v);
    Ed.setValue(v.slice(0, pos) + rep + v.slice(pos + this.q.length));
    Ed.onEdit(false); this.compute(true); this.next(1);
    toast('Ocorrência substituída', 'edit');
  },
  replaceAll() {
    if (!this.matches.length) return;
    const rep = $('#replaceInput').value;
    Ed.pushUndo(T.active, Ed.value());
    Ed.setValue(Ed.value().split(this.q).join(rep));
    const n = this.matches.length;
    Ed.onEdit(false); this.compute(true);
    toast(`${n} ocorrência(s) substituída(s)`, 'edit');
  },
  init() {
    $('#findInput').addEventListener('input', () => { this.q = $('#findInput').value; this.compute(); });
    $('#findNext').onclick = () => this.next(1);
    $('#findPrev').onclick = () => this.next(-1);
    $('#findClose').onclick = () => this.close();
    $('#findReplaceToggle').onclick = () => $('#replaceRow').classList.toggle('hidden');
    $('#replaceOne').onclick = () => this.replaceOne();
    $('#replaceAll').onclick = () => this.replaceAll();
    $('#findInput').addEventListener('keydown', e => { if (e.key === 'Enter') this.next(e.shiftKey ? -1 : 1); if (e.key === 'Escape') this.close(); });
  }
};

/* ============================== QUICKTOOLS ============================== */
const QT = {
  shift: false, ctrl: false, alt: false,
  build() {
    const r1 = [
      { id: 'shift', t: 'SHFT', mod: 'shift' }, { k: 'Tab', t: '⇥' }, { act: 'find', ic: 'search' },
      { act: 'undo', ic: 'undo' }, { act: 'redo', ic: 'redo' }, { k: 'ArrowUp', t: '▲' },
      { act: 'save', ic: 'save' }, { act: 'esc', t: 'ESC' }
    ];
    const r2 = [
      { id: 'ctrl', t: 'CTRL', mod: 'ctrl' }, { id: 'alt', t: 'ALT', mod: 'alt' },
      { k: 'ArrowLeft', t: '◀' }, { k: 'ArrowDown', t: '▼' }, { k: 'ArrowRight', t: '▶' },
      { act: 'cut', ic: 'cut' }, { act: 'copy', ic: 'copy' }, { act: 'paste', ic: 'paste' }
    ];
    const mk = (defs, row) => {
      row.innerHTML = '';
      defs.forEach(d => {
        const b = document.createElement('button');
        b.className = 'qt-key' + (d.mod ? ' mod' : '');
        b.innerHTML = d.ic ? icon(d.ic) : esc(d.t);
        if (d.mod) b.dataset.mod = d.mod;
        b.onclick = () => this.press(d, b);
        row.appendChild(b);
      });
    };
    mk(r1, $('#qtRow1')); mk(r2, $('#qtRow2'));
  },
  press(d, btn) {
    vibrate(8);
    if (d.mod) {
      this[d.mod] = !this[d.mod];
      btn.classList.toggle('on', this[d.mod]);
      return;
    }
    const input = Ed.input;
    if (d.k) {
      if (!T.active) return;
      input.focus({ preventScroll: true });
      const v = input.value;
      let s = input.selectionStart, e = input.selectionEnd;
      const anchor = this.shift ? (this._anchor ?? s) : null;
      if (this.shift && this._anchor === undefined) this._anchor = s;
      const lines = v.split('\n');
      const lineOf = idx => v.slice(0, idx).split('\n').length - 1;
      const move = (pos, dir) => {
        if (d.k === 'ArrowLeft') return Math.max(0, pos - 1);
        if (d.k === 'ArrowRight') return Math.min(v.length, pos + 1);
        const li = lineOf(pos);
        const col = pos - (v.lastIndexOf('\n', pos - 1) + 1);
        if (d.k === 'ArrowUp' && li > 0) { const ps = v.lastIndexOf('\n', v.lastIndexOf('\n', pos - 1) - 1) + 1; return ps + Math.min(col, lines[li - 1].length); }
        if (d.k === 'ArrowDown' && li < lines.length - 1) { const ns = pos + (lines[li].length - col) + 1; return Math.min(ns + col, ns + lines[li + 1].length); }
        return pos;
      };
      if (d.k === 'Tab') { Ed.insertText(Ed.indentUnit()); Ed.onEdit(true); this.clearMods(); return; }
      if (this.ctrl && (d.k === 'ArrowLeft' || d.k === 'ArrowRight')) {
        const re = d.k === 'ArrowRight' ? /[\w$]+|\W/g : null;
        let pos = e;
        if (d.k === 'ArrowRight') { re.lastIndex = pos; const m = re.exec(v); pos = m ? re.lastIndex : v.length; }
        else { const left = v.slice(0, pos).match(/[\w$]+|[^\w$\s]+|\s+$/); pos = left ? pos - left[0].length : 0; }
        if (this.shift) { input.selectionStart = Math.min(this._anchor, pos); input.selectionEnd = Math.max(this._anchor, pos); }
        else input.selectionStart = input.selectionEnd = pos;
      } else if (d.k === 'ArrowLeft' || d.k === 'ArrowRight') {
        const pos = move(this.shift ? e : (s !== e && !this.shift ? (d.k === 'ArrowLeft' ? s : e) : s), d.k);
        if (this.shift) { input.selectionStart = Math.min(this._anchor, pos); input.selectionEnd = Math.max(this._anchor, pos); }
        else input.selectionStart = input.selectionEnd = pos;
      } else {
        const pos = move(e, d.k);
        if (this.shift) { input.selectionStart = Math.min(this._anchor, pos); input.selectionEnd = Math.max(this._anchor, pos); }
        else input.selectionStart = input.selectionEnd = pos;
        const ln = v.slice(0, pos).split('\n').length, lh = Ed.lineHeight(), sc = $('#editorScroll');
        const top = 10 + (ln - 1) * lh;
        if (top < sc.scrollTop + 40) sc.scrollTop = top - 60;
        else if (top > sc.scrollTop + sc.clientHeight - 60) sc.scrollTop = top - sc.clientHeight + 80;
      }
      updateCursorUI(); renderGutter(Ed.value());
      if (!this.shift) this._anchor = undefined;
      return;
    }
    if (d.act === 'find') Find.open(false);
    else if (d.act === 'undo') Ed.doUndo();
    else if (d.act === 'redo') Ed.doRedo();
    else if (d.act === 'save') saveFile();
    else if (d.act === 'esc') escCascade();
    else if (d.act === 'cut' || d.act === 'copy') {
      if (!T.active) return;
      input.focus({ preventScroll: true });
      try {
        if (input.selectionStart === input.selectionEnd) {
          const ln = Ed.value().slice(0, input.selectionStart).split('\n').length - 1;
          const lines = Ed.value().split('\n');
          let st = 0; for (let i = 0; i < ln; i++) st += lines[i].length + 1;
          input.selectionStart = st; input.selectionEnd = st + lines[ln].length;
        }
        document.execCommand(d.act);
        if (d.act === 'cut') Ed.onEdit(true);
        toast(d.act === 'cut' ? 'Recortado' : 'Copiado', d.act);
      } catch (_) { toast('Não suportado neste navegador', 'info'); }
    }
    else if (d.act === 'paste') {
      if (!T.active) return;
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(t => { Ed.insertText(t); Ed.onEdit(true); input.focus({ preventScroll: true }); }).catch(() => toast('Use colar do teclado do sistema', 'info'));
      } else toast('Use colar do teclado do sistema', 'info');
    }
    this.clearMods();
  },
  clearMods() {
    this.shift = this.ctrl = this.alt = false; this._anchor = undefined;
    $$('#quicktools .qt-key.mod').forEach(b => b.classList.remove('on'));
  }
};
function escCascade() {
  if (!$('#dialogRoot').classList.contains('hidden')) { $('#dialogRoot').click(); return; }
  if (!$('#paletteWrap').classList.contains('hidden')) { Palette.close(); return; }
  if (!$('#findbar').classList.contains('hidden')) { Find.close(); return; }
  if (AC.visible) { AC.hide(); return; }
  if (!$('#fileMenu').classList.contains('hidden')) { $('#fileMenu').classList.add('hidden'); return; }
  if (!$('#pageRoot').classList.contains('hidden')) { Page.back(); return; }
  if (Drawer.isOpen()) { Drawer.close(); return; }
  if (Panel.isOpen()) { Panel.close(); return; }
  QT.clearMods();
}

