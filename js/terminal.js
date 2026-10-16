// a small terminal that can be used instead of the page. press ` or click >_ to open.
import { profile, projects, contact, donate, github } from './data.js';
import { settings } from './settings.js';
import { playIntro } from './intro.js';

const $ = (s) => document.querySelector(s);

export function initTerminal(fx, eggs, slop) {
  const term = $('#term');
  const out = $('#term-out');
  const input = $('#term-in');
  const body = $('#term-body');
  const history = [];
  let hi = 0;

  const print = (text = '', cls) => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    // linkify urls
    let last = 0;
    for (const m of text.matchAll(/https?:\/\/\S+/g)) {
      line.append(text.slice(last, m.index));
      const a = document.createElement('a');
      a.href = m[0];
      a.textContent = m[0];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      line.append(a);
      last = m.index + m[0].length;
    }
    line.append(text.slice(last));
    out.append(line);
  };

  const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));

  const toggle = (k, a) => {
    const v = a[0] === 'on' ? true : a[0] === 'off' ? false : !settings.get(k);
    settings.set(k, v);
    print(`${k} ${v ? 'on' : 'off'}`);
  };

  const go = (hash) => {
    close();
    location.hash = hash;
  };

  const commands = {
    help: ['list commands', () => {
      for (const [name, [desc]] of Object.entries(commands)) if (desc) print(`  ${pad(name, 12)}${desc}`);
    }],
    whoami: ['who is this', () => print(profile.handle)],
    about: ['about me', () => {
      profile.bio.forEach((p) => (print(p), print()));
    }],
    projects: ['list projects', () => {
      projects.forEach((p) => print(`  ${pad(p.id, 12)}${pad('[' + p.status + ']', 13)}${p.tagline}`));
      print();
      print("type a project's name for details, e.g. `cig`");
    }],
    contact: ['how to reach me', () => {
      if (!contact.length) print(github);
      contact.forEach((c) => print(`  ${pad(c.label, 10)}${c.value}`));
    }],
    donate: ['monero address', () => print(donate.xmr || 'soon.')],
    github: ['open github', () => (window.open(github, '_blank', 'noopener'), print(github))],
    goto: ['scroll the page: goto about|projects|contact', (a) => {
      if (['about', 'projects', 'contact', 'top'].includes(a[0])) go('#' + a[0]);
      else print('usage: goto about|projects|contact', 'err');
    }],
    rain: ['toggle monero rain', (a) => toggle('rain', a)],
    sfx: ['toggle sound effects', (a) => toggle('sfx', a)],
    crt: ['toggle crt mode', (a) => toggle('crt', a)],
    flashlight: ['toggle flashlight', (a) => toggle('light', a)],
    glass: ['toggle liquid glass', (a) => toggle('glass', a)],
    physics: ['let the page fall apart (esc to undo)', () => (close(), setTimeout(() => slop?.more?.physics.toggle(), 250))],
    clicker: ['open the xmr clicker', () => (close(), slop?.clicker.toggle(true))],
    stats: ['clicker stats', () => {
      const s = slop?.clicker.stats();
      if (s) print(`balance: ${s.pico} piconero · rate: ${s.rate}/s · all time: ${s.total}`);
    }],
    weather: ['local weather', () => print("probably fine. we don't know where you are, and that's the point.")],
    visitors: ['visitor count', () => print('1. it is always 1. counting would mean tracking.')],
    ping: ['ping something', () => print("ping: this page can't make network requests. 0 packets sent, 0 received, 100% private")],
    trail: ['toggle cursor trail', (a) => toggle('trail', a)],
    potato: ['turn off all effects', (a) => toggle('potato', a)],
    storm: ['make it rain', () => (close(), fx?.storm(8000))],
    intro: ['replay the loading intro', () => (close(), playIntro({ force: true }))],
    clear: ['clear screen', () => (out.textContent = '')],
    // hidden
    sudo: [null, () => (print('no.', 'err'), eggs?.unlock('sudo'))],
    ls: [null, (a) => print((a[0] === '-a' || a[0] === '-la' ? '.  ..  .secret  ' : '') + 'about  projects  contact  donate')],
    cat: [null, (a) => {
      if (a[0] === '.secret') {
        print('things to type on the page (not in here):', 'hl');
        print('  xmr  monero  barrel  gravity  spud  matrix  boom  bitcoin');
        print('also: hold m. click the big coin a lot. konami code. triple-click the footer. wait 45s.');
      } else print(`cat: ${a[0] ?? ''}: try 'about' or 'projects'`, 'err');
    }],
    echo: [null, (a) => print(a.join(' '))],
    date: [null, () => print(new Date().toString())],
    history: [null, () => history.forEach((h, i) => print(`${String(i + 1).padStart(4)}  ${h}`))],
    rm: [null, (a) => (a.includes('-rf') ? (print('ok :)', 'err'), close(), eggs?.selfDestruct()) : print('rm: missing operand', 'err'))],
    neofetch: ['system info, with a coin', () => {
      const logo = ['    .-----.    ', '  .\'       \'.  ', ' /  |\\_/|  \\ ', '|   | \\ |   |', ' \\  |   |  / ', '  \'._____.\'  '];
      const info = [
        'moneroism@xmr', '-------------', 'OS: the internet', `Uptime: ${Math.round(performance.now() / 1000)}s`,
        'Shell: this thing', `Resolution: ${innerWidth}x${innerHeight}`, `Achievements: ${eggs ? eggs.list().filter((x) => x.got).length : 0}/${eggs ? eggs.list().length : 0}`,
        `Balance: ${eggs?.balance() ?? 0} xmr (fake)`,
      ];
      for (let i = 0; i < Math.max(logo.length, info.length); i++) print(`${(logo[i] ?? '').padEnd(16)}  ${info[i] ?? ''}`);
    }],
    cowsay: ['moo', (a) => {
      const msg = a.join(' ') || 'privacy is not a crime';
      print(' ' + '_'.repeat(msg.length + 2));
      print(`< ${msg} >`);
      print(' ' + '-'.repeat(msg.length + 2));
      ['        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\  xmr  )\\/\\', '                ||----w |', '                ||     ||'].forEach((l) => print(l));
    }],
    fortune: ['a random line', () => {
      const f = ['privacy is not a crime.', "verify, don't trust.", 'free as in freedom, not as in beer.', "if you're not paying, you're the product.", 'read the source, luke.', 'there is no cloud, just someone else\'s computer.', 'rtfm.', 'it works on my machine.'];
      print(f[(Math.random() * f.length) | 0]);
    }],
    coinflip: ['heads or tails', () => print(Math.random() < 0.5 ? 'heads (the M side)' : 'tails (the grey side)')],
    price: ['current xmr price', () => print('priceless. (this page makes no network requests, so i genuinely cannot check)')],
    balance: ['fake mining balance', () => print(`${eggs?.balance() ?? 0} xmr. fake. worthless. yours.`)],
    hack: ['hack the mainframe', async () => {
      eggs?.unlock('hack');
      const lines = ['bypassing firewall...', 'decrypting ring signatures...', 'tracing stealth address...', 'ERROR: monero is private. there is nothing to trace.', 'access denied. good.'];
      for (const l of lines) {
        for (let i = 0; i < 3; i++) print(Array.from({ length: 48 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join(''), 'dim');
        print(l, l.startsWith('ERROR') ? 'err' : 'hl');
        body.scrollTop = body.scrollHeight;
        await new Promise((r) => setTimeout(r, 450));
      }
    }],
    barrel: ['do a barrel roll', () => (close(), setTimeout(() => eggs?.barrel(), 250))],
    gravity: ['turn on gravity', () => (close(), setTimeout(() => eggs?.gravity(), 250))],
    selfdestruct: ['do not run this', () => (close(), eggs?.selfDestruct())],
    spud: [null, () => (close(), eggs?.spud())],
    matrix: [null, () => (close(), eggs?.matrix())],
    achievements: ['what you have found', () => {
      const l = eggs?.list() ?? [];
      print(`${l.filter((x) => x.got).length}/${l.length} unlocked`, 'hl');
      l.forEach((x) => print(`  ${x.got ? '[x]' : '[ ]'} ${x.got ? x.name.padEnd(28) + x.desc : '???'}`, x.got ? '' : 'dim'));
    }],
    exit: ['close terminal', () => close()],
    sl: [null, async () => {
      const train = ['      ====        ________', '  _D _|  |_______/        \\__I_I_____', '   |(_)---  |   H\\________/ |   |', '   /     |  |   H  |  |     |   |', '  |      |  |   H  |__-----------------|', '  |______|=|___H__/__|_____________|'];
      const pre = document.createElement('div');
      out.append(pre);
      for (let x = 40; x > -50; x -= 2) {
        pre.textContent = train.map((l) => (x > 0 ? ' '.repeat(x) + l : l.slice(-x))).join('\n');
        await new Promise((r) => setTimeout(r, 30));
      }
      pre.remove();
    }],
  };
  for (const p of projects) {
    commands[p.id] = [null, () => {
      print(`${p.name} — ${p.tagline}`, 'hl');
      print(`${p.lang} · ${p.status}`);
      p.points.forEach((pt) => print('  - ' + pt.replace(/`/g, '')));
      print(p.url);
    }];
  }

  function run(line) {
    const echo = document.createElement('div');
    echo.innerHTML = '';
    const ps = document.createElement('span');
    ps.className = 'term-ps';
    ps.textContent = 'moneroism@xmr:~$ ';
    echo.append(ps, line);
    out.append(echo);
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return;
    history.push(line);
    hi = history.length;
    const cmd = commands[name.toLowerCase()];
    if (cmd) Promise.resolve(cmd[1](args)).then(() => (body.scrollTop = body.scrollHeight));
    else print(`${name}: command not found. try 'help'`, 'err');
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      run(input.value);
      input.value = '';
      body.scrollTop = body.scrollHeight;
    } else if (e.key === 'ArrowUp' && hi > 0) {
      input.value = history[--hi];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      hi = Math.min(history.length, hi + 1);
      input.value = history[hi] ?? '';
      e.preventDefault();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const hits = Object.keys(commands).filter((c) => c.startsWith(input.value) && commands[c][0] !== undefined);
      if (hits.length === 1) input.value = hits[0] + ' ';
    } else if (e.key === 'Escape') close();
  });

  let greeted = false;
  function open() {
    eggs?.unlock('terminal');
    term.hidden = false;
    requestAnimationFrame(() => term.classList.add('open'));
    if (!greeted) {
      greeted = true;
      print(`type 'help' for commands.`, 'hl');
      print();
    }
    input.focus();
  }
  function close() {
    term.classList.remove('open');
    setTimeout(() => (term.hidden = true), 200);
  }

  document.querySelectorAll('[data-open-term]').forEach((b) => b.addEventListener('click', open));
  $('.term-close').addEventListener('click', close);
  term.addEventListener('click', (e) => e.target === term && close());
  body.addEventListener('click', () => getSelection().isCollapsed && input.focus());
  addEventListener('keydown', (e) => {
    if (e.key === '`' && term.hidden && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault();
      open();
    }
  });
}
