/* ==========================================================================
   THCODE v2 — Bash real (variáveis, pipes, redirects, glob, $())
   ========================================================================== */
const rxEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function splitShell(str, seps) {
  const parts = [];
  let cur = '', q = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    let hit = null;
    for (const s of seps) if (str.startsWith(s, i)) { hit = s; break; }
    if (hit) { if (cur.trim()) parts.push({ t: 'cmd', v: cur }); cur = ''; parts.push({ t: 'sep', v: hit }); i += hit.length - 1; }
    else cur += ch;
  }
  if (cur.trim()) parts.push({ t: 'cmd', v: cur });
  return parts;
}
function tokenize(line) {
  const out = [];
  let cur = '', q = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === q) q = null; else cur += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === ' ' || ch === '\t') { if (cur) { out.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const fRead = p => { const f = fGet(p); return f ? f.c : undefined; };
const Bash = {
  async run(term, raw) {
    const line = (raw || '').trim();
    if (!term.env) term.env = { USER: 'root', HOST: 'localhost', HOME: '/MeuJarvis', SHELL: '/bin/sh' };
    term.print('g', term.promptStr() + ' ' + line);
    if (!line) return;
    term.hist.push(line);
    if (term.hist.length > (S.termHistory || 200)) term.hist.shift();
    term.histIdx = -1; Store.save();
    const asg = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (asg && !tokenize(line)[0].includes('=')) { term.env[asg[1]] = asg[2]; return; }
    let expanded = await this.subst(term, line);
    for (const k of Object.keys(term.env)) expanded = expanded.split('$' + k).join(term.env[k]);
    expanded = expanded.split('~').join(term.env.HOME);
    const chain = splitShell(expanded, ['&&', '||', ';']);
    let status = 0, gate = null;
    for (const part of chain) {
      if (part.t === 'sep') { gate = part.v; continue; }
      if (gate === '&&' && status !== 0) { gate = null; continue; }
      if (gate === '||' && status === 0) { gate = null; continue; }
      gate = null;
      status = await this.pipeline(term, part.v.trim());
    }
  },
  async subst(term, line) {
    const m = line.match(/\$\(([^()]+)\)/);
    if (!m) return line;
    const out = [];
    const fake = { capture: out, cwd: term.cwd, env: term.env, hist: [], resolve: p => Term.resolve.call({ cwd: term.cwd }, p) };
    await this.pipeline(fake, m[1]);
    return line.replace(m[0], out.join('\n'));
  },
  say(term, kind, text) {
    if (term.capture) { if (text) term.capture.push(text); return; }
    String(text).split('\n').forEach(l => term.print(kind, l));
  },
  glob(term, pat) {
    if (!pat.includes('*')) return [pat];
    const rx = new RegExp('^' + pat.split('*').map(rxEsc).join('.*') + '$');
    const L = listDir(term.cwd);
    const names = [...L.dirs, ...L.files].filter(n => rx.test(n));
    return names.length ? names.sort() : [pat];
  },
  async pipeline(term, seg) {
    const stages = splitShell(seg, ['|']).filter(p => p.t === 'cmd').map(p => p.v.trim());
    let input = '', status = 0;
    for (let i = 0; i < stages.length; i++) {
      let st = stages[i], redir = null, append = false;
      const rm = st.match(/^(.*?)\s*(>>|>)\s*(\S+)\s*$/);
      if (rm && !/^echo\s+["'].*[<>]/.test(st)) { st = rm[1]; redir = rm[3]; append = rm[2] === '>>'; }
      const toks = tokenize(st).flatMap(t => this.glob(term, t));
      if (!toks.length) continue;
      const r = await this.execCmd(term, toks[0], toks.slice(1), input);
      status = r.status;
      input = r.out;
      if (redir) {
        const p = term.resolve(redir);
        fSet(p, append ? (fRead(p) || '') + input : input);
        input = '';
      }
    }
    if (input) this.say(term, 'd', input.replace(/\n$/, ''));
    return status;
  },
  ok(out = '') { return { status: 0, out: out ? String(out).replace(/\n$/, '') + '\n' : '' }; },
  fail(msg, code = 1) { return { status: code, out: (msg || '') + (msg ? '\n' : '') }; },
  async execCmd(term, cmd, args, input) {
    const cdp = p => term.resolve(p);
    const err = m => this.say(term, 'r', m);
    switch (cmd) {
      case '': return this.ok();
      case 'help': return this.ok('Comandos: cd pwd ls cat head tail echo grep wc sort uniq find touch mkdir rm cp mv clear env export unset history\napk node python lua g++ git npm open run serve build acode rutex curl wget ping ps kill df du chmod sudo exit\nRecursos: VAR=x, $VAR, $(cmd), pipes |, redirects > >>, globs *, && || ;');
      case 'echo': {
        let a = args, nl = true;
        if (a[0] === '-n') { nl = false; a = a.slice(1); }
        if (a[0] === '-e') a = a.slice(1);
        return this.ok(a.join(' ').replace(/\\n/g, '\n') + (nl ? '' : ''));
      }
      case 'true': return this.ok();
      case 'false': return this.fail('', 1);
      case 'pwd': return this.ok(term.cwd);
      case 'whoami': return this.ok(term.env.USER);
      case 'hostname': return this.ok(term.env.HOST);
      case 'uname': return this.ok(args.includes('-a') ? 'Linux localhost 6.1.0-thcode #1 SMP aarch64 GNU/Linux' : 'Linux');
      case 'date': return this.ok(new Date().toString());
      case 'env': return this.ok(Object.entries(term.env).map(([k, v]) => `${k}=${v}`).join('\n'));
      case 'printenv': return args.length ? (term.env[args[0]] !== undefined ? this.ok(term.env[args[0]]) : this.fail('', 1)) : this.execCmd(term, 'env', [], input);
      case 'export': for (const a of args) { const eq = a.indexOf('='); if (eq > 0) term.env[a.slice(0, eq)] = a.slice(eq + 1); } return this.ok();
      case 'unset': args.forEach(a => delete term.env[a]); return this.ok();
      case 'history': return this.ok(term.hist.slice(-30).map((h, i) => `  ${i + 1}  ${h}`).join('\n'));
      case 'alias': return this.ok(`ll='ls -la'\n..='cd ..'`);
      case 'clear': if (term.lines) { term.lines = []; if (term.paint) term.paint(); } return { status: 0, out: '' };
      case 'exit': case 'logout': return this.ok('Use o botão ✕ do painel para fechar o terminal.');
      case 'cd': {
        const d = args[0] ? cdp(args[0]) : term.env.HOME;
        if (fExists(d)) { err(`cd: not a directory: ${args[0]}`); return { status: 1, out: '' }; }
        if (!dExists(d)) { err(`cd: ${args[0]}: No such file or directory`); return { status: 1, out: '' }; }
        term.cwd = d;
        if (term.updatePrompt) setTimeout(() => term.updatePrompt(document), 0);
        return this.ok();
      }
      case 'ls': {
        const a = args.filter(x => !x.startsWith('-') || x === '-'), flags = args.filter(x => x.startsWith('-')).join('');
        const paths = a.length ? a : [null];
        const outs = [];
        for (const ap of paths) {
          const d = ap === null ? term.cwd : cdp(ap);
          if (fExists(d)) { outs.push(baseName(d)); continue; }
          if (!dExists(d)) return this.fail(`ls: ${ap}: No such file or directory`);
          const L = listDir(d);
          if (flags.includes('l')) outs.push(L.dirs.map(n => `drwxr-xr-x  root  0  ${n}/`).concat(L.files.map(n => `-rw-r--r--  root  ${(fRead(d === '/' ? '/' + n : d + '/' + n) || '').length}  ${n}`)).join('\n'));
          else outs.push(L.dirs.map(n => n + '/').concat(L.files).join(flags.includes('1') ? '\n' : '  '));
        }
        return this.ok(outs.filter(Boolean).join('\n'));
      }
      case 'cat': {
        if (!args.length) return input ? this.ok(input.replace(/\n$/, '')) : this.fail('cat: missing operand');
        const t = fRead(cdp(args[0]));
        if (t === undefined) return this.fail(`cat: ${args[0]}: No such file or directory`);
        return this.ok(t.replace(/\n$/, ''));
      }
      case 'head': case 'tail': {
        let n = 10, f = null;
        const ni = args.indexOf('-n');
        if (ni >= 0) { n = parseInt(args[ni + 1]) || 10; f = args.filter((a, i) => i !== ni && i !== ni + 1 && a !== '-n')[0]; }
        else f = args[0];
        const txt = f ? fRead(cdp(f)) : input.replace(/\n$/, '');
        if (txt === undefined) return this.fail(`${cmd}: ${f}: No such file or directory`);
        const lines = txt.split('\n');
        return this.ok((cmd === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n'));
      }
      case 'wc': {
        const fs = args.filter(a => !a.startsWith('-'));
        const txt = fs.length ? fRead(cdp(fs[fs.length - 1])) : input;
        if (txt === undefined) return this.fail(`wc: ${fs[fs.length - 1]}: No such file or directory`);
        const l = txt.split('\n').length, w = txt.split(/\s+/).filter(Boolean).length, c = txt.length;
        const fl = args.join(' ');
        if (/\bl\b/.test(fl) && !/[wc]/.test(fl.replace('l', ''))) return this.ok(String(l));
        return this.ok(`${l} ${w} ${c}`);
      }
      case 'grep': {
        const a = args.filter(x => x !== '-i'), ci = args.includes('-i'), pat = a[0] || '', file = a[1];
        const txt = file ? fRead(cdp(file)) : input;
        if (txt === undefined) return this.fail(`grep: ${file}: No such file or directory`);
        let rx;
        try { rx = new RegExp(pat, ci ? 'i' : ''); } catch (_) { rx = new RegExp(rxEsc(pat), ci ? 'i' : ''); }
        const hits = txt.split('\n').filter(l => rx.test(l));
        return hits.length ? this.ok(hits.join('\n')) : this.fail('', 1);
      }
      case 'sort': {
        const txt = args.length ? fRead(cdp(args[0])) : input;
        if (txt === undefined) return this.fail(`sort: ${args[0]}: No such file or directory`);
        return this.ok(txt.split('\n').sort().join('\n'));
      }
      case 'uniq': {
        const txt = args.length ? fRead(cdp(args[0])) : input;
        if (txt === undefined) return this.fail(`uniq: ${args[0]}: No such file or directory`);
        return this.ok(txt.split('\n').filter((l, i, arr) => l !== arr[i - 1]).join('\n'));
      }
      case 'find': {
        const root = args[0] && !args[0].startsWith('-') ? cdp(args[0]) : term.cwd;
        const nm = args.includes('-name') ? args[args.indexOf('-name') + 1] : null;
        const rx = nm ? new RegExp('^' + nm.split('*').map(rxEsc).join('.*') + '$') : null;
        const hits = Object.keys(FS.files).filter(p => p.startsWith(root) && (!rx || rx.test(p.split('/').pop())));
        return this.ok(hits.join('\n'));
      }
      case 'touch': {
        if (!args.length) return this.fail('touch: missing operand');
        for (const a of args) { const p = cdp(a); if (!fExists(p)) fSet(p, ''); }
        return this.ok();
      }
      case 'mkdir': {
        if (!args.length) return this.fail('mkdir: missing operand');
        for (const a of args) ensureDir(cdp(a));
        Store.save(); return this.ok();
      }
      case 'rm': {
        const a = args.filter(x => !x.startsWith('-'));
        if (!a.length) return this.fail('rm: missing operand');
        for (const f of a) {
          const p = cdp(f);
          if (!fExists(p) && !dExists(p)) { err(`rm: ${f}: No such file or directory`); return { status: 1, out: '' }; }
          fDel(p);
          if (T.open.includes(p)) closeTab(p);
        }
        return this.ok();
      }
      case 'cp': {
        if (args.length < 2) return this.fail('cp: missing destination');
        const src = fRead(cdp(args[0]));
        if (src === undefined) return this.fail(`cp: ${args[0]}: No such file or directory`);
        fSet(cdp(args[1]), src); return this.ok();
      }
      case 'mv': {
        if (args.length < 2) return this.fail('mv: missing destination');
        const p = cdp(args[0]), src = fRead(p);
        if (src === undefined) return this.fail(`mv: ${args[0]}: No such file or directory`);
        fSet(cdp(args[1]), src); fDel(p);
        if (T.open.includes(p)) { T.open[T.open.indexOf(p)] = cdp(args[1]); if (T.active === p) T.active = cdp(args[1]); renderTabs(); }
        return this.ok();
      }
      case 'df': return this.ok('Filesystem      Size  Used Avail Use% Mounted on\ndata            12G   3.1G  8.9G  26% /data');
      case 'du': {
        const d = args[0] ? cdp(args[0]) : term.cwd;
        let bytes = 0;
        for (const [p, f] of Object.entries(FS.files)) if (p.startsWith(d)) bytes += (f.c || '').length;
        return this.ok(`${(bytes / 1024).toFixed(1)}K\t${args[0] || '.'}`);
      }
      case 'chmod': case 'chown': return this.ok();
      case 'sudo': return args[0] ? this.execCmd(term, args[0], args.slice(1), input) : this.fail('usage: sudo <command>');
      case 'ps': return this.ok('  PID TTY      COMMAND\n' + Procs.list.map(p => `${String(p.pid).padStart(5)} pts/0    ${p.name} (${p.status})`).join('\n'));
      case 'kill': {
        const p = Procs.list.find(x => x.pid === +args[0]);
        if (!p) return this.fail(`kill: (${args[0]}) - No such process`);
        p.status = 'stopped'; p.cpu = 0; Store.save(); return this.ok();
      }
      case 'sleep': await new Promise(r => setTimeout(r, Math.min(5, parseFloat(args[0]) || 0) * 1000)); return this.ok();
      case 'apk': {
        const sub = args[0], pkgs = args.filter(a => !a.startsWith('-')).slice(1);
        if (sub === 'add') return this.ok(pkgs.map(p => `(1/1) Installing ${p} — OK (simulado)`).join('\n') || 'OK');
        if (sub === 'del') return this.ok(pkgs.map(p => `(1/1) Purging ${p} (simulado)`).join('\n') || 'OK');
        if (sub === 'list' || sub === 'search') return this.ok(['nodejs', 'npm', 'python3', 'lua5.4', 'g++', 'git', 'curl', 'openssh'].filter(p => !pkgs[0] || p.includes(pkgs[0])).join('\n'));
        if (sub === 'update') return this.ok('fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main\nOK (simulado)');
        if (sub === 'upgrade') return this.ok('OK: 0 pacotes para atualizar (simulado)');
        return this.fail('apk: use add | del | list | search | update');
      }
      case 'node': {
        if (args[0] === '--version' || args[0] === '-v') return this.ok('v20.11.0 (simulado)');
        if (!args[0]) return this.ok('Welcome to Node.js v20 — use: node <arquivo>');
        const src = fRead(cdp(args[0]));
        if (src === undefined) return this.fail(`node: ${args[0]}: No such file or directory`);
        const logs = [...src.matchAll(/console\.log\(([^)]*)\)/g)].map(m => m[1].replace(/^['"]|['"]$/g, ''));
        return this.ok(logs.join('\n') || '(sem saída — console.log não encontrado)');
      }
      case 'python': case 'python3': {
        if (!CAPS.python) { err(`${cmd}: instale o plugin Python para executar`); PluginDetail.open('python'); return { status: 127, out: '' }; }
        if (args[0] === '--version') return this.ok('Python 3.12.0 (simulado)');
        const src = fRead(cdp(args[0] || ''));
        if (src === undefined) return this.fail(`${cmd}: can't open file '${args[0]}'`);
        const logs = [...src.matchAll(/print\(([^)]*)\)/g)].map(m => m[1].replace(/^['"]|['"]$/g, ''));
        return this.ok(logs.join('\n') || '(sem saída — print() não encontrado)');
      }
      case 'lua': {
        if (!CAPS.lua) { err('lua: instale o plugin Lua para executar'); PluginDetail.open('lua-support'); return { status: 127, out: '' }; }
        const src = fRead(cdp(args[0] || ''));
        if (src === undefined) return this.fail(`lua: cannot open ${args[0]}`);
        const logs = [...src.matchAll(/print\(([^)]*)\)/g)].map(m => m[1].replace(/^['"]|['"]$/g, ''));
        return this.ok(logs.join('\n') || '(sem saída)');
      }
      case 'g++': case 'gcc': {
        if (!CAPS.cpp) { err(`${cmd}: instale o plugin C/C++ para compilar`); PluginDetail.open('cpp'); return { status: 127, out: '' }; }
        const src = fRead(cdp(args[0] || ''));
        if (src === undefined) return this.fail(`${cmd}: ${args[0]}: No such file or directory`);
        return this.ok('a.out gerado (simulado)');
      }
      case 'git': return this.git(term, args);
      case 'npm': return this.npm(term, args);
      case 'acode': return this.ok(`Thcode ${APP_VER} (base Acode ${ACODE_BASE}) — Mobile IDE`);
      case 'rutex': Panel.open('agent'); return this.ok();
      case 'open': {
        if (!args[0]) return this.fail('open: missing operand');
        const p = cdp(args[0]);
        if (fRead(p) === undefined) return this.fail(`open: ${args[0]}: No such file or directory`);
        openFile(p); return this.ok();
      }
      case 'run': {
        if (!T.active) return this.fail('run: nenhum arquivo aberto');
        const lang = detectLang(T.active);
        if (lang === 'py') return this.execCmd(term, 'python', [T.active], input);
        if (lang === 'lua') return this.execCmd(term, 'lua', [T.active], input);
        if (lang === 'js') return this.execCmd(term, 'node', [T.active], input);
        if (lang === 'sh') return this.ok('Shell script executado (simulado).');
        Browser.open(T.active); return this.ok('Preview aberto.');
      }
      case 'serve': Browser.open(args[0] ? cdp(args[0]) : (T.active || '/index.html')); return this.ok(`Servindo em localhost:${S.previewPort} (simulado)`);
      case 'build': return CAPS.builder ? this.ok('Build APK… app-debug.apk gerado (simulado)') : this.fail('build: instale o plugin Android Builder', 127);
      case 'ping': return this.ok(`PING ${args[0] || '8.8.8.8'}: 4 pacotes transmitidos, 4 recebidos (simulado)`);
      case 'curl': case 'wget': {
        const url = args.filter(a => !a.startsWith('-')).pop();
        if (!url) return this.fail(`usage: ${cmd} <url>`);
        try {
          const r = await fetch(url.startsWith('http') ? url : 'https://' + url);
          const t = await r.text();
          return this.ok(`HTTP ${r.status} — ${t.length} bytes\n` + t.slice(0, 1200));
        } catch (e) { return this.fail(`${cmd}: falha de rede (offline?)`); }
      }
      default: {
        const custom = CustomCmds.find(cmd);
        if (custom) {
          try { const r = await custom.fn(args.join(' '), input); return this.ok(r || ''); }
          catch (e) { return this.fail('plugin ' + cmd + ': ' + e.message); }
        }
        err(`${cmd}: command not found — digite "help"`);
        return { status: 127, out: '' };
      }
    }
  },
  async git(term, args) {
    const sub = args[0];
    if (sub === 'status') return CAPS.gitx ? this.ok('On branch main\nnothing to commit (simulado)') : this.fail('git: instale o plugin Git SCM', 128);
    if (sub === 'log') return this.ok('a1b2c3d (HEAD) Initial commit (simulado)');
    if (sub === 'clone' && args[1]) {
      const m = args[1].match(/github\.com[/:]([^/]+\/[^/.]+)/);
      const name = m ? m[1].split('/')[1] : 'repo';
      try {
        const rd = await fetch(`https://api.github.com/repos/${m ? m[1] : 'x/y'}/readme`, { headers: { Accept: 'application/vnd.github.raw' } });
        const readme = rd.ok ? await rd.text() : '# ' + name;
        fSet(`/${name}/README.md`, readme.slice(0, 20000));
        return this.ok(`Cloning into '${name}'…\nREADME real baixado (${readme.length} bytes) ✓`);
      } catch (e) { return this.fail('git: falha de rede'); }
    }
    if (sub === 'add' || sub === 'commit') return CAPS.gitx ? this.ok(sub === 'add' ? 'staged (simulado)' : '[main abc1234] commit (simulado)') : this.fail('git: instale o plugin Git SCM', 128);
    if (sub === 'remote' || sub === 'pull' || sub === 'push') return this.ok('(simulado)');
    if (sub === '--version') return this.ok('git version 2.43.0 (simulado)');
    return this.fail('git: use status | log | clone | add | commit | pull | push');
  },
  async npm(term, args) {
    const sub = args[0];
    if (sub === 'install' || sub === 'i') {
      if (!CAPS.npm) return this.fail('npm: instale o plugin Add Package', 127);
      const pkg = args[1] || '';
      const p = term.resolve('package.json');
      let j = { name: 'thcode-app', dependencies: {} };
      try { const cur = fRead(p); if (cur) j = JSON.parse(cur); } catch (_) {}
      if (pkg) { j.dependencies = j.dependencies || {}; j.dependencies[pkg] = '^1.0.0'; fSet(p, JSON.stringify(j, null, 2)); }
      return this.ok(pkg ? `+ ${pkg}@1.0.0 (package.json atualizado ✓)` : 'up to date (simulado)');
    }
    if (sub === 'run' && args[1]) {
      try {
        const j = JSON.parse(fRead(term.resolve('package.json')) || '{}');
        if (j.scripts && j.scripts[args[1]]) return this.ok(`> ${j.scripts[args[1]]}\n(script executado — simulado)`);
        return this.fail(`npm: missing script: ${args[1]}`);
      } catch (_) { return this.fail('npm: package.json inválido'); }
    }
    if (sub === 'list') return this.ok('(nenhum pacote — simulado)');
    if (sub === '--version' || sub === '-v') return this.ok('10.2.0 (simulado)');
    return this.fail('npm: use install | run | list');
  }
};
Term.exec = function (raw) { Bash.run(this, raw); };

