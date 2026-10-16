// a small terminal that can be used instead of the page. press ` or click >_ to open.
import { profile, projects, contact, donate, github } from './data.js';

const $ = (s) => document.querySelector(s);

export function initTerminal() {
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
    clear: ['clear screen', () => (out.textContent = '')],
    exit: ['close terminal', () => close()],
    // hidden
    sudo: [null, () => print('no.', 'err')],
    ls: [null, () => print('about  projects  contact  donate')],
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
    if (cmd) cmd[1](args);
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
