// easter eggs, achievements and assorted useless features. none of it is necessary.
import { settings, isPotato, toast } from './settings.js';

export const ACHIEVEMENTS = {
  konami: ['old school', 'entered the konami code'],
  clicker: ['coin clicker', 'clicked the big coin 10 times'],
  whale: ['whale', 'clicked the big coin 50 times'],
  corner: ['it hit the corner', 'waited for the screensaver to hit a corner'],
  idle: ['afk', 'let the screensaver start'],
  miner: ['totally not cryptojacking', 'started the (fake) miner'],
  rich: ['0.0000001 xmr', 'mined a whole 0.0000001 fake xmr'],
  xmr: ['typist', 'typed xmr'],
  btc: ['wrong chain', 'typed bitcoin'],
  barrel: ['do a barrel roll', 'did a barrel roll'],
  gravity: ['newton', 'turned on gravity'],
  spud: ['spud', 'made it rain potatoes'],
  potato: ['potato pc', 'enabled potato mode'],
  footer: ['scrolled all the way', 'triple-clicked the footer'],
  boom: ['self destruct', 'blew up the website'],
  magnet: ['magnetic personality', "held m to pull coins"],
  logo: ['dizzy', 'hovered the nav logo 5 times'],
  shake: ['shaker', 'shook your phone'],
  terminal: ['hacker', 'opened the terminal'],
  hack: ['in the mainframe', "ran 'hack'"],
  sudo: ['nice try', 'tried sudo'],
  matrix: ['red pill', 'typed matrix'],
  all: ['completionist', 'found every achievement'],
};

const KEY = 'mnr:ach';
let got = {};
try {
  got = JSON.parse(localStorage.getItem(KEY) || '{}');
} catch {}

export function initEggs(fx, { replayIntro }) {
  const root = document.documentElement;
  const $ = (s) => document.querySelector(s);

  const eggs = {
    unlock(id) {
      if (got[id] || !ACHIEVEMENTS[id]) return;
      got[id] = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(got));
      } catch {}
      const [name] = ACHIEVEMENTS[id];
      const n = Object.keys(got).length;
      const total = Object.keys(ACHIEVEMENTS).length;
      achievementPopup(name, `${n}/${total}`);
      if (n === total - 1 && !got.all) setTimeout(() => eggs.unlock('all'), 1200);
    },
    list: () => Object.entries(ACHIEVEMENTS).map(([id, [name, desc]]) => ({ id, name, desc, got: !!got[id] })),
    reset() {
      got = {};
      try {
        localStorage.removeItem(KEY);
      } catch {}
    },
    barrel() {
      document.body.classList.remove('barrel');
      void document.body.offsetWidth;
      document.body.classList.add('barrel');
      setTimeout(() => document.body.classList.remove('barrel'), 1300);
      eggs.unlock('barrel');
    },
    gravity() {
      const els = document.querySelectorAll('.card, .section-title, .about-text p, .contact-box, .hero-title span, .hero-cta, .hero-sub, .nav nav > *');
      els.forEach((el) => {
        el.style.setProperty('--fall-r', `${(Math.random() - 0.5) * 90}deg`);
        el.style.setProperty('--fall-d', `${Math.random() * 0.5}s`);
      });
      root.classList.add('gravity');
      fx.shake(6);
      setTimeout(() => root.classList.remove('gravity'), 3200);
      eggs.unlock('gravity');
    },
    selfDestruct() {
      let n = 3;
      const tick = () => {
        if (n > 0) {
          toast(`self destruct in ${n}...`);
          n--;
          setTimeout(tick, 900);
          return;
        }
        const els = document.querySelectorAll('.card, .section-title, .about-text p, .contact-box, .hero-logo, .hero-title span, .hero-cta, .hero-sub, .footer p');
        els.forEach((el) => {
          el.style.setProperty('--bx', `${(Math.random() - 0.5) * 2400}px`);
          el.style.setProperty('--by', `${(Math.random() - 0.5) * 2400}px`);
          el.style.setProperty('--br', `${(Math.random() - 0.5) * 1440}deg`);
        });
        root.classList.add('boom');
        fx.shake(24);
        fx.burst(innerWidth / 2, innerHeight / 2, 40);
        setTimeout(() => root.classList.remove('boom'), 2200);
        eggs.unlock('boom');
      };
      tick();
    },
    spud() {
      fx.rainOf('🥔', 4000);
      eggs.unlock('spud');
    },
    bitcoin() {
      root.classList.add('greyscale');
      toast('ew, a transparent ledger');
      setTimeout(() => root.classList.remove('greyscale'), 3000);
      eggs.unlock('btc');
    },
    matrix() {
      eggs.unlock('matrix');
      replayIntro();
    },
  };

  function achievementPopup(name, count) {
    const el = document.createElement('div');
    el.className = 'achievement';
    const icon = document.createElement('div');
    icon.className = 'achievement-icon';
    const txt = document.createElement('div');
    const a = document.createElement('small');
    a.textContent = `achievement unlocked · ${count}`;
    const b = document.createElement('strong');
    b.textContent = name;
    txt.append(a, b);
    el.append(icon, txt);
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 500);
    }, 3200);
  }

  // --- typed words (outside inputs) ---
  const words = {
    xmr: () => (fx.burst(innerWidth / 2, innerHeight / 3, 20), eggs.unlock('xmr')),
    monero: () => fx.storm(6000),
    bitcoin: eggs.bitcoin,
    btc: eggs.bitcoin,
    barrel: eggs.barrel,
    gravity: eggs.gravity,
    spud: eggs.spud,
    matrix: eggs.matrix,
    potato: () => settings.toggle('potato'),
    boom: eggs.selfDestruct,
  };
  let buf = '';
  addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-12);
    for (const [w, fn] of Object.entries(words)) {
      if (buf.endsWith(w)) {
        buf = '';
        fn();
        break;
      }
    }
  });

  // --- hold m: magnet ---
  addEventListener('keydown', (e) => {
    if (e.key === 'm' && !e.repeat && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) {
      fx.setMagnet(true);
      eggs.unlock('magnet');
    }
  });
  addEventListener('keyup', (e) => e.key === 'm' && fx.setMagnet(false));

  // --- big coin clicker ---
  let clicks = 0;
  $('.coin').addEventListener('click', (e) => {
    clicks++;
    fx.burst(e.clientX, e.clientY, 12 + Math.min(30, clicks));
    fx.shake(4 + Math.min(16, clicks / 2));
    const c = $('.coin');
    c.classList.remove('boing');
    void c.offsetWidth;
    c.classList.add('boing');
    if (clicks === 10) eggs.unlock('clicker');
    if (clicks === 25) toast('the coin is getting tired');
    if (clicks === 50) (eggs.unlock('whale'), fx.storm(10000));
  });

  // --- nav logo hover x5 ---
  let hovers = 0;
  $('.nav-logo').addEventListener('pointerenter', () => {
    if (++hovers % 5 === 0) {
      const l = $('.nav-logo svg');
      l.classList.add('dizzy');
      setTimeout(() => l.classList.remove('dizzy'), 2000);
      eggs.unlock('logo');
    }
  });

  // --- footer triple click ---
  $('.footer').addEventListener('click', (e) => {
    if (e.detail === 3) {
      toast('you found the footer. there is nothing here. or is there');
      fx.rainOf('🪙', 2500);
      eggs.unlock('footer');
    }
  });

  // --- button ripples ---
  addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn, .dock button, .term-btn');
    if (!b || isPotato()) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.left = e.clientX - r.left + 'px';
    s.style.top = e.clientY - r.top + 'px';
    b.append(s);
    setTimeout(() => s.remove(), 600);
  });

  // --- custom cursor ring ---
  if (matchMedia('(pointer: fine)').matches) {
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.append(ring);
    let x = -100, y = -100, tx = -100, ty = -100;
    addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      ring.classList.toggle('hover', !!e.target.closest('a, button, .coin, .card'));
    }, { passive: true });
    addEventListener('pointerdown', () => ring.classList.add('down'));
    addEventListener('pointerup', () => ring.classList.remove('down'));
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      ring.style.translate = `${x}px ${y}px`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  // --- glitch the hero title every now and then ---
  setInterval(() => {
    if (isPotato() || document.hidden) return;
    const t = $('.hero-title');
    t.classList.add('glitch');
    setTimeout(() => t.classList.remove('glitch'), 380);
  }, 5000 + Math.random() * 3000);

  // --- tab title when you leave ---
  const title = document.title;
  const away = ['come back...', 'your coins are falling', 'still mining (not really)', '🪙 hello?'];
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? away[(Math.random() * away.length) | 0] : title;
  });

  // --- shake phone ---
  addEventListener('devicemotion', (e) => {
    const a = e.accelerationIncludingGravity;
    if (a && Math.hypot(a.x || 0, a.y || 0, a.z || 0) > 30) {
      fx.storm(4000);
      eggs.unlock('shake');
    }
  });

  // --- fake miner ---
  const minerBtn = $('[data-miner]');
  let mining = null;
  let balance = Number(localStorage.getItem('mnr:bal') || 0) || 0;
  const fmt = (n) => n.toFixed(10);
  minerBtn?.addEventListener('click', () => {
    if (mining) {
      clearInterval(mining);
      mining = null;
      minerBtn.textContent = '⛏ mine';
      minerBtn.classList.remove('on');
      return;
    }
    toast("relax, it's fake. nothing runs on your cpu");
    eggs.unlock('miner');
    minerBtn.classList.add('on');
    let t = 0;
    mining = setInterval(() => {
      t++;
      minerBtn.textContent = `⛏ ${(8 + Math.random() * 6).toFixed(1)} kH/s`;
      if (t % 16 === 0) {
        balance += 0.00000001 * (1 + Math.random() * 3);
        try {
          localStorage.setItem('mnr:bal', String(balance));
        } catch {}
        toast(`block found! balance: ${fmt(balance)} xmr (fake)`);
        fx.coin(minerBtn.getBoundingClientRect().left + 30, innerHeight - 60, { vy: -700, r: 12 });
        if (balance >= 0.0000001) eggs.unlock('rich');
      }
    }, 500);
  });
  eggs.balance = () => fmt(balance);

  // --- screensaver: bouncing coin after 45s idle ---
  let idleT;
  let saver = null;
  const startSaver = () => {
    if (isPotato() || saver) return;
    eggs.unlock('idle');
    const el = document.createElement('div');
    el.className = 'saver';
    el.innerHTML = '<svg viewBox="0 0 100 100"><use href="#xmr"/></svg>';
    document.body.append(el);
    const size = 120;
    let x = Math.random() * (innerWidth - size), y = Math.random() * (innerHeight - size);
    let vx = 140, vy = 110, last = performance.now(), hue = 0;
    const step = (now) => {
      if (!saver) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      x += vx * dt;
      y += vy * dt;
      let hx = false, hy = false;
      if (x <= 0 || x >= innerWidth - size) (vx *= -1), (hx = true), (x = Math.max(0, Math.min(x, innerWidth - size)));
      if (y <= 0 || y >= innerHeight - size) (vy *= -1), (hy = true), (y = Math.max(0, Math.min(y, innerHeight - size)));
      if (hx || hy) el.style.setProperty('--shade', `${(hue = (hue + 1) % 4)}`);
      if (hx && hy) {
        toast('IT HIT THE CORNER');
        eggs.unlock('corner');
      }
      el.style.translate = `${x}px ${y}px`;
      requestAnimationFrame(step);
    };
    saver = el;
    requestAnimationFrame(step);
  };
  const resetIdle = () => {
    clearTimeout(idleT);
    if (saver) {
      saver.remove();
      saver = null;
    }
    idleT = setTimeout(startSaver, 45000);
  };
  ['pointermove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  settings.on((k, v) => k === 'potato' && v && eggs.unlock('potato'));

  // --- console ---
  console.log(
    '%c  ●  %c moneroism %c\n\nreading the console? respect.\ntry typing: xmr, monero, barrel, gravity, spud, matrix, boom\nor hold m. or the konami code.',
    'background:#f26822;color:#f26822;border-radius:50%;font-size:20px',
    'font:700 20px monospace;color:#f26822',
    'color:#888;font:12px monospace',
  );

  return eggs;
}
