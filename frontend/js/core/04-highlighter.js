/* ============================== HIGHLIGHTER ============================== */
function highlight(code, langId) {
  if (code.length > 120000) return esc(code);
  const L = LANGS[langId] || LANGS.txt;
  if (L.type === 'plain') return esc(code);
  if (L.type === 'html') return highlightHTML(code);
  if (L.type === 'css') return highlightCSS(code);
  if (L.type === 'md') return highlightMD(code);
  return (typeof CAPS !== 'undefined' && CAPS.rainbow) ? rainbowify(highlightCode(code, L)) : highlightCode(code, L);
}
function highlightCode(code, L) {
  const toks = [];
  let i = 0; const n = code.length; let buf = '';
  const flush = () => { if (buf) { toks.push({ t: 0, v: buf }); buf = ''; } };
  const starts = (s, p) => s && code.startsWith(s, p);
  while (i < n) {
    const ch = code[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      flush();
      let j = i + 1;
      if (ch === '`' || code[i - 1] !== '\\') {
        while (j < n && code[j] !== ch) { if (code[j] === '\\') j++; j++; if (ch !== '`' && code[j] === '\n') break; }
        if (j < n && code[j] === ch) j++;
        toks.push({ t: 1, v: code.slice(i, j) }); i = j; continue;
      }
      buf += ch; i++; continue;
    }
    if (L.preproc && (i === 0 || code[i - 1] === '\n') && ch === '#') {
      flush(); let j = code.indexOf('\n', i); if (j < 0) j = n;
      toks.push({ t: 4, v: code.slice(i, j) }); i = j; continue;
    }
    if (L.block && starts(L.block[0], i)) {
      flush(); const end = code.indexOf(L.block[1], i + L.block[0].length);
      const j = end < 0 ? n : end + L.block[1].length;
      toks.push({ t: 2, v: code.slice(i, j) }); i = j; continue;
    }
    if ((L.line && starts(L.line, i)) || (L.line2 && starts(L.line2, i))) {
      flush(); let j = code.indexOf('\n', i); if (j < 0) j = n;
      toks.push({ t: 2, v: code.slice(i, j) }); i = j; continue;
    }
    if ((L === LANGS.php || L === LANGS.sh) && ch === '$' && /[\w{]/.test(code[i + 1] || '')) {
      flush(); let j = i + 1;
      if (code[j] === '{') { j = code.indexOf('}', j); j = j < 0 ? n : j + 1; }
      else while (j < n && /[\w]/.test(code[j])) j++;
      toks.push({ t: 5, v: code.slice(i, j) }); i = j; continue;
    }
    buf += ch; i++;
  }
  flush();
  const kwRe = L.kw && L.kw.length ? new RegExp(`\\b(${L.kw.join('|')})\\b|\\b(\\d[\\w.]*|0x[\\da-fA-F]+)\\b|\\b([A-Za-z_]\\w*)(?=\\s*\\()`, 'g') : null;
  return toks.map(tk => {
    if (tk.t === 1) return `<span class="tok-s">${esc(tk.v)}</span>`;
    if (tk.t === 2) return `<span class="tok-c">${esc(tk.v)}</span>`;
    if (tk.t === 4) return `<span class="tok-o">${esc(tk.v)}</span>`;
    if (tk.t === 5) return `<span class="tok-v">${esc(tk.v)}</span>`;
    let e = esc(tk.v);
    if (kwRe) e = e.replace(kwRe, (m, kw, num, fn) => kw ? `<span class="tok-k">${m}</span>` : num ? `<span class="tok-n">${m}</span>` : `<span class="tok-f">${m}</span>`);
    return e;
  }).join('');
}
function highlightHTML(code) {
  let out = '', i = 0; const n = code.length;
  const escTag = tag => {
    const pattern = /(<\/?)([\w-]+)|([\w:-]+)(\s*=\s*)("[^"\n]*"|'[^'\n]*')|(\/?>)/g;
    let result = '', cursor = 0, match;
    while ((match = pattern.exec(tag))) {
      result += esc(tag.slice(cursor, match.index));
      if (match[1]) result += `<span class="tok-p">${esc(match[1])}</span><span class="tok-v">${esc(match[2])}</span>`;
      else if (match[3]) result += `<span class="tok-a">${esc(match[3])}</span>${esc(match[4])}<span class="tok-s">${esc(match[5])}</span>`;
      else result += `<span class="tok-p">${esc(match[6])}</span>`;
      cursor = pattern.lastIndex;
    }
    return `<span class="tok-o">${result + esc(tag.slice(cursor))}</span>`;
  };
  while (i < n) {
    if (code.startsWith('<!--', i)) { const j = code.indexOf('-->', i + 4); const k = j < 0 ? n : j + 3; out += `<span class="tok-c">${esc(code.slice(i, k))}</span>`; i = k; continue; }
    if (code[i] === '<' && /[a-zA-Z!/?]/.test(code[i + 1] || '')) {
      let j = i + 1, q = null;
      while (j < n) { const c = code[j]; if (q) { if (c === q) q = null; } else if (c === '"' || c === "'") q = c; else if (c === '>') { j++; break; } j++; }
      out += escTag(code.slice(i, j)); i = j; continue;
    }
    let j = i;
    while (j < n && !(code[j] === '<' && /[a-zA-Z!/?]/.test(code[j + 1] || '')) && !code.startsWith('<!--', j)) j++;
    out += esc(code.slice(i, j)).replace(/&amp;[\w#]+;/g, '<span class="tok-n">$&</span>');
    i = j;
  }
  return out;
}
function highlightCSS(code) {
  const toks = [];
  let i = 0; const n = code.length; let buf = '';
  const flush = () => { if (buf) { toks.push(buf); buf = ''; } };
  while (i < n) {
    if (code.startsWith('/*', i)) { flush(); const j = code.indexOf('*/', i + 2); const k = j < 0 ? n : j + 2; toks.push(`<span class="tok-c">${esc(code.slice(i, k))}</span>`); i = k; continue; }
    const ch = code[i];
    if (ch === '"' || ch === "'") { flush(); let j = i + 1; while (j < n && code[j] !== ch && code[j] !== '\n') { if (code[j] === '\\') j++; j++; } if (code[j] === ch) j++; toks.push(`<span class="tok-s">${esc(code.slice(i, j))}</span>`); i = j; continue; }
    buf += ch; i++;
  }
  flush();
  return toks.map(t => {
    if (t[0] === '<') return t;
    return esc(t)
      .replace(/(@[\w-]+)/g, '<span class="tok-k">$1</span>')
      .replace(/(#[0-9a-fA-F]{3,8}\b)/g, '<span class="tok-n">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|ms|s|deg)?)\b/g, '<span class="tok-n">$1</span>')
      .replace(/([\w-]+)(\s*:)/g, '<span class="tok-f">$1</span>$2')
      .replace(/([.#]?[\w-]+)(\s*{)/g, '<span class="tok-t">$1</span>$2')
      .replace(/(:{1,2}[\w-]+)/g, '<span class="tok-o">$1</span>');
  }).join('');
}
function highlightMD(code) {
  return esc(code).split('\n').map(line => {
    if (/^#{1,6}\s/.test(line)) return `<span class="tok-t"><b>${line}</b></span>`;
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) return `<span class="tok-o">${line}</span>`;
    if (/^&gt;/.test(line)) return `<span class="tok-c">${line}</span>`;
    if (/^(`{3,}|~{3,})/.test(line)) return `<span class="tok-p">${line}</span>`;
    return line.replace(/(`[^`]+`)/g, '<span class="tok-s">$1</span>').replace(/(\*\*[^*]+\*\*)/g, '<span class="tok-b">$1</span>').replace(/(\[[^\]]*\]\([^)]*\))/g, '<span class="tok-f">$1</span>');
  }).join('\n');
}

