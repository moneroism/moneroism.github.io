// more unnecessary features: idle clicker, sfx, crt, cookie banner, visitor counter, ticker,
// scroll skew, comets, extra typed words. all local, nothing leaves the browser.
import { settings, isPotato, toast } from './settings.js';
import { hooks } from './fx.js';

const $ = (s) => document.querySelector(s);
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};

export function initSlop(fx, eggs) {
  const sfx = initSfx(eggs);
  initCrt(eggs);
  const clicker = initClicker(fx, eggs, sfx);
  initCookieBanner(eggs);
  initVisitor(eggs, sfx);
  initTicker();
  initSkew();
  initComets(fx);
  initWords(fx, eggs);
  return { sfx, clicker };
}

// ---------------------------------------------------------------- sfx
function initSfx(eggs) {
  let ac = null;
  const ctx = () => {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return null;
      }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const on = () => settings.get('sfx') && !isPotato();

  function blip(freq = 440, dur = 0.08, type = 'square', vol = 0.04, slide = 0) {
    if (!on()) return;
    const a = ctx();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur);
  }
  const api = {
    blip,
    tick: () => blip(1800, 0.02, 'square', 0.015),
    click: () => blip(600, 0.06, 'square', 0.04, -300),
    coin: () => (blip(988, 0.07, 'square', 0.035), setTimeout(() => blip(1319, 0.18, 'square', 0.035), 70)),
    jingle: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'triangle', 0.05), i * 90)),
    boom: () => blip(120, 0.6, 'sawtooth', 0.08, -90),
  };

  let lastBounce = 0;
  hooks.bounce = (r, vy) => {
    const now = performance.now();
    if (now - lastBounce < 40) return;
    lastBounce = now;
    blip(300 + (40 - r) * 25, 0.05, 'triangle', Math.min(0.05, vy / 30000));
  };

  addEventListener('pointerover', (e) => e.target.closest?.('a, button') && api.tick());
  addEventListener('pointerdown', (e) => e.target.closest?.('a, button, .coin') && api.click());
  // achievement popups get a jingle
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('achievement')) api.jingle();
  }).observe(document.body, { childList: true });

  settings.on((k, v) => {
    if (k === 'sfx' && v) {
      ctx();
      api.jingle();
      eggs.unlock('sfx');
    }
  });
  return api;
}

// ---------------------------------------------------------------- crt
function initCrt(eggs) {
  const overlay = document.createElement('div');
  overlay.className = 'crt-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.append(overlay);
  settings.on((k, v) => k === 'crt' && v && eggs.unlock('crt'));
}

// ---------------------------------------------------------------- idle clicker
const UPGRADES = [
  { id: 'usb', name: 'usb stick miner', rate: 1, cost: 15 },
  { id: 'thinkpad', name: 'old thinkpad', rate: 6, cost: 120 },
  { id: 'gaming', name: 'gaming pc', rate: 45, cost: 1300 },
  { id: 'rack', name: 'server rack', rate: 320, cost: 15000 },
  { id: 'datacenter', name: 'basement datacenter', rate: 2500, cost: 180000 },
  { id: 'asic', name: 'ASIC', rate: 0, cost: 1, asic: true },
];

function initClicker(fx, eggs, sfx) {
  const st = load('mnr:clicker', { pico: 0, total: 0, owned: {}, t: Date.now() });
  const rate = () => UPGRADES.reduce((a, u) => a + u.rate * (st.owned[u.id] || 0), 0);
  const cost = (u) => Math.ceil(u.cost * Math.pow(1.15, st.owned[u.id] || 0));
  const power = () => 1 + Math.floor(rate() / 15);
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.floor(n).toString());

  // offline progress, capped at 8h
  const away = Math.min(8 * 3600, (Date.now() - st.t) / 1000);
  if (rate() > 0 && away > 30) {
    const gained = rate() * away;
    st.pico += gained;
    st.total += gained;
    setTimeout(() => toast(`while you were gone: +${fmt(gained)} piconero`), 3500);
  }

  const panel = document.createElement('div');
  panel.className = 'clicker';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="clicker-head"><strong>xmr clicker</strong><button type="button" class="clicker-x" aria-label="close">×</button></div>
    <div class="clicker-bal"><span data-bal>0</span> <small>piconero</small></div>
    <div class="clicker-rate"><span data-rate>0</span>/s · click: +<span data-power>1</span> · <small>click the big coin</small></div>
    <ul class="clicker-shop"></ul>
    <p class="clicker-foot">1 xmr = 10<sup>12</sup> piconero. you are not getting there.</p>`;
  document.body.append(panel);
  const shop = panel.querySelector('.clicker-shop');
  const rows = UPGRADES.map((u) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', () => buy(u));
    li.append(b);
    shop.append(li);
    return { u, b };
  });

  function buy(u) {
    if (u.asic) {
      toast('monero is ASIC resistant. nice try');
      eggs.unlock('asic');
      fx.shake(8);
      return;
    }
    const c = cost(u);
    if (st.pico < c) {
      sfx.blip(150, 0.12, 'square', 0.04);
      return;
    }
    st.pico -= c;
    st.owned[u.id] = (st.owned[u.id] || 0) + 1;
    sfx.coin();
    eggs.unlock('game');
    render();
  }

  function render() {
    panel.querySelector('[data-bal]').textContent = fmt(st.pico);
    panel.querySelector('[data-rate]').textContent = fmt(rate());
    panel.querySelector('[data-power]').textContent = fmt(power());
    for (const { u, b } of rows) {
      b.textContent = '';
      const n = document.createElement('span');
      n.textContent = `${u.name}${st.owned[u.id] ? ' ×' + st.owned[u.id] : ''}`;
      const c = document.createElement('small');
      c.textContent = u.asic ? 'resistant' : `${fmt(cost(u))} · +${fmt(u.rate)}/s`;
      b.append(n, c);
      b.classList.toggle('poor', !u.asic && st.pico < cost(u));
    }
  }

  // earn from the big coin
  $('.coin').addEventListener('click', () => {
    st.pico += power();
    st.total += power();
    if (!panel.hidden) render();
  });

  setInterval(() => {
    const r = rate();
    st.pico += r / 4;
    st.total += r / 4;
    st.t = Date.now();
    if (st.total >= 1e6) eggs.unlock('pico');
    if (!panel.hidden) render();
  }, 250);
  setInterval(() => save('mnr:clicker', st), 3000);
  addEventListener('pagehide', () => save('mnr:clicker', { ...st, t: Date.now() }));

  const toggle = (v = panel.hidden) => {
    panel.hidden = !v;
    if (v) render();
    document.querySelector('[data-clicker]')?.classList.toggle('on', v);
  };
  panel.querySelector('.clicker-x').addEventListener('click', () => toggle(false));
  document.querySelector('[data-clicker]')?.addEventListener('click', () => toggle());
  return { toggle, stats: () => ({ pico: fmt(st.pico), rate: fmt(rate()), total: fmt(st.total) }) };
}

// ---------------------------------------------------------------- cookie banner
function initCookieBanner(eggs) {
  if (load('mnr:cookiebanner', false)) return;
  const el = document.createElement('div');
  el.className = 'cookies';
  el.innerHTML = `
    <p><strong>🍪 this site uses 0 cookies.</strong> we value your privacy so much we didn't even bake any.</p>
    <div class="cookies-custom" hidden>
      <label><input type="checkbox" disabled> necessary cookies <small>(0)</small></label>
      <label><input type="checkbox" disabled> analytics cookies <small>(0)</small></label>
      <label><input type="checkbox" disabled> marketing cookies <small>(0)</small></label>
      <label><input type="checkbox" disabled> chocolate chip <small>(0, sorry)</small></label>
    </div>
    <div class="cookies-btns">
      <button type="button" data-c="none" class="primary">accept none</button>
      <button type="button" data-c="reject">reject all 0</button>
      <button type="button" data-c="custom">customize</button>
    </div>`;
  document.body.append(el);
  setTimeout(() => el.classList.add('show'), 4500);
  const close = (msg) => {
    save('mnr:cookiebanner', true);
    el.classList.remove('show');
    setTimeout(() => el.remove(), 500);
    if (msg) toast(msg);
  };
  el.addEventListener('click', (e) => {
    const c = e.target.closest('button')?.dataset.c;
    if (c === 'none') close('preferences saved: 0 cookies accepted');
    if (c === 'reject') close('rejected 0 cookies. very brave');
    if (c === 'custom') {
      el.querySelector('.cookies-custom').hidden = false;
      e.target.textContent = 'save 0 preferences';
      e.target.dataset.c = 'save';
      eggs.unlock('cookies');
    } else if (c === 'save') close('saved. (in localStorage, which is not a cookie. technically.)');
  });
}

// ---------------------------------------------------------------- visitor counter
function initVisitor(eggs, sfx) {
  const el = document.createElement('p');
  el.className = 'visitor';
  el.title = 'click me';
  el.innerHTML = 'you are visitor <span class="odo"></span>';
  const odo = el.querySelector('.odo');
  '000001'.split('').forEach((d) => {
    const s = document.createElement('span');
    s.textContent = d;
    odo.append(s);
  });
  $('.footer').prepend(el);
  let n = 0;
  const lines = ['everyone is visitor #1. we don\'t count.', 'still #1.', 'counting would require tracking you.', 'stop it.', 'fine. you win.'];
  el.addEventListener('click', () => {
    toast(lines[Math.min(n, lines.length - 1)]);
    sfx.coin();
    // spin the digits for show
    odo.querySelectorAll('span').forEach((s, i) => {
      s.classList.remove('roll');
      void s.offsetWidth;
      s.style.animationDelay = `${i * 60}ms`;
      s.classList.add('roll');
    });
    if (++n === 5) eggs.unlock('visitor');
  });
}

// ---------------------------------------------------------------- ticker
function initTicker() {
  const items = () => [
    'XMR',
    'ring size 16',
    'block time ~2 min',
    'ASIC resistant',
    'your ip: not logged',
    'weather: probably fine (we don\'t know where you are)',
    'cookies: 0',
    'trackers: 0',
    `local time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    `tab open: ${Math.floor(performance.now() / 60000)} min`,
    'privacy is not a crime',
    'fake mining rig status: idle',
    'press ` for a terminal',
  ];
  const bar = document.createElement('div');
  bar.className = 'ticker';
  bar.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div');
  track.className = 'ticker-track';
  bar.append(track);
  $('.hero').after(bar);
  const fill = () => {
    const text = items().join('   ◆   ') + '   ◆   ';
    track.textContent = text + text;
  };
  fill();
  setInterval(fill, 60000);
}

// ---------------------------------------------------------------- scroll skew
function initSkew() {
  let last = scrollY, skew = 0, raf = 0;
  const root = document.documentElement;
  const loop = () => {
    const v = scrollY - last;
    last = scrollY;
    const target = isPotato() ? 0 : Math.max(-6, Math.min(6, v * 0.15));
    skew += (target - skew) * 0.15;
    root.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
    raf = Math.abs(skew) > 0.01 || v ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('scroll', () => raf || (raf = requestAnimationFrame(loop)), { passive: true });
}

// ---------------------------------------------------------------- comets
function initComets(fx) {
  const go = () => {
    if (!isPotato() && !document.hidden && scrollY < innerHeight) {
      const left = Math.random() < 0.5;
      fx.coin(left ? -30 : innerWidth + 30, innerHeight * (0.1 + Math.random() * 0.3), {
        vx: (left ? 1 : -1) * (700 + Math.random() * 500),
        vy: -250,
        r: 10 + Math.random() * 6,
      });
    }
    setTimeout(go, 15000 + Math.random() * 20000);
  };
  setTimeout(go, 12000);
}

// ---------------------------------------------------------------- more typed words
function initWords(fx, eggs) {
  const root = document.documentElement;
  const words = {
    moon: () => {
      for (let i = 0; i < 25; i++) fx.coin(Math.random() * innerWidth, innerHeight + 20, { vy: -600 - Math.random() * 600 });
      fx.antigravity(4000);
      toast('🚀');
      eggs.unlock('moon');
    },
    gm: () => (toast('gm ser'), eggs.unlock('gm')),
    lambo: () => (toast('this is monero. we buy groceries, not lambos.'), eggs.unlock('lambo')),
    dvd: () => (eggs.saver?.(), eggs.unlock('dvd')),
    flip: () => {
      root.classList.add('flipped');
      setTimeout(() => root.classList.remove('flipped'), 3000);
      eggs.unlock('flip');
    },
    42: () => toast('the answer. but what was the question?'),
  };
  let buf = '';
  addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-8);
    for (const [w, fn] of Object.entries(words)) {
      if (buf.endsWith(w)) {
        buf = '';
        fn();
        break;
      }
    }
  });
}
