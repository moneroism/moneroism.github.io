// reset button, achievements viewer, stats for nerds, background switcher, confetti,
// viewer count, hidden coin hunt, and seasonal events.
import { settings, toast, isPotato } from './settings.js';
import { modal, notify } from './bloat.js';
import { BG_MODES } from './bg.js';

const $ = (s) => document.querySelector(s);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

export function initExtra({ fx, eggs }) {
  initReset(eggs);
  initAchievementsViewer(eggs);
  initNerdStats(fx, eggs);
  initBgSwitcher(eggs);
  initConfetti(fx);
  initViewers();
  initCoinHunt(fx, eggs);
  initSeasonal(fx, eggs);
}

// ---------------------------------------------------------------- reset everything
const storageKeys = () => {
  const out = [];
  for (const s of [localStorage, sessionStorage]) {
    try {
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (k?.startsWith('mnr:')) out.push([s, k]);
      }
    } catch {}
  }
  return out;
};
const storageBytes = () => storageKeys().reduce((a, [s, k]) => a + k.length + (s.getItem(k)?.length ?? 0), 0);

export function resetEverything() {
  const keys = storageKeys();
  const kb = (storageBytes() / 1024).toFixed(1);
  const log = h('pre', { class: 'reset-log' });
  const go = h('button', { type: 'button', class: 'danger', text: 'clear cache & cookies' });
  const close = modal('reset the website?', h('div', { class: 'reset' },
    h('p', { text: `this deletes everything this site stored in your browser: settings, achievements, clicker progress, comments, streak, reactions, mining balance. ${keys.length} entries, ${kb} KB. there are 0 cookies, but we'll pretend to delete them too.` }),
    h('p', { class: 'muted', text: 'nothing is stored anywhere else, so after this the site forgets you completely.' }),
    log,
    h('div', { class: 'reset-btns' }, h('button', { type: 'button', text: 'cancel', onclick: () => close() }), go),
  ));
  go.addEventListener('click', () => {
    go.disabled = true;
    const steps = [
      'clearing cache...',
      'deleting 0 cookies... done (that was quick)',
      `removing ${keys.length} localStorage entries...`,
      'forgetting your achievements...',
      'selling your clicker rigs for scrap...',
      'telling the assistant to forget you...',
      'forgetting you (we never really knew you)...',
      'done. rebooting.',
    ];
    steps.forEach((s, i) =>
      setTimeout(() => {
        log.textContent += s + '\n';
        if (i === steps.length - 1) {
          for (const [st, k] of storageKeys()) st.removeItem(k);
          setTimeout(() => location.reload(), 600);
        }
      }, i * 380),
    );
  });
}

function initReset() {
  document.querySelector('[data-reset]')?.addEventListener('click', resetEverything);
  // footer link
  $('.footer').append(h('p', {}, h('button', { type: 'button', class: 'linkbtn', text: '🧹 clear cache & cookies (reset the site)', onclick: resetEverything })));
}

// ---------------------------------------------------------------- achievements viewer
function initAchievementsViewer(eggs) {
  $('[data-trophies]')?.addEventListener('click', () => {
    const list = eggs.list();
    const got = list.filter((x) => x.got).length;
    modal(`achievements · ${got}/${list.length}`, h('div', { class: 'trophies' },
      h('div', { class: 'trophy-bar' }, h('i', { class: 'fill' })),
      h('ul', {}, list.map((x) => h('li', { class: x.got ? 'got' : '' },
        h('span', { class: 'trophy-icon', text: x.got ? '🏆' : '🔒' }),
        h('div', {}, h('strong', { text: x.got ? x.name : '???' }), h('small', { text: x.got ? x.desc : 'keep poking around' })),
      ))),
    ), { wide: true });
    requestAnimationFrame(() => document.querySelector('.trophy-bar .fill')?.style.setProperty('width', `${(got / list.length) * 100}%`));
  });
}

// ---------------------------------------------------------------- stats for nerds
function initNerdStats(fx, eggs) {
  const panel = h('pre', { class: 'nerd', hidden: true, 'aria-hidden': 'true' });
  document.body.append(panel);
  const t0 = performance.now();
  let frames = 0, fps = 0, last = performance.now(), maxScroll = 0;
  const loop = (now) => {
    frames++;
    if (now - last > 500) {
      fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  setInterval(() => {
    const docH = document.documentElement.scrollHeight - innerHeight;
    const depth = docH > 0 ? Math.round((scrollY / docH) * 100) : 0;
    maxScroll = Math.max(maxScroll, depth);
    if (panel.hidden) return;
    const s = fx.stats?.() ?? {};
    const ach = eggs.list();
    panel.textContent = [
      'stats for nerds',
      '---------------',
      `fps            ${fps}`,
      `coins          ${s.coins ?? '?'}`,
      `particles      ${s.parts ?? '?'}`,
      `dom nodes      ${document.getElementsByTagName('*').length}`,
      `viewport       ${innerWidth}x${innerHeight} @${devicePixelRatio}x`,
      `scroll         ${depth}% (max ${maxScroll}%)`,
      `time on page   ${Math.round((performance.now() - t0) / 1000)}s`,
      `storage        ${(storageBytes() / 1024).toFixed(1)} KB (local only)`,
      `achievements   ${ach.filter((x) => x.got).length}/${ach.length}`,
      `background     ${settings.get('bg')}`,
      `network reqs   0 after load`,
      `cookies        0`,
    ].join('\n');
  }, 250);
  $('[data-nerd]')?.addEventListener('click', (e) => {
    panel.hidden = !panel.hidden;
    e.currentTarget.classList.toggle('on', !panel.hidden);
    if (!panel.hidden) eggs.unlock('nerd');
  });
}

// ---------------------------------------------------------------- background switcher
function initBgSwitcher(eggs) {
  const btn = $('[data-bg]');
  const label = () => btn && (btn.textContent = `bg: ${settings.get('bg')}`);
  label();
  btn?.addEventListener('click', () => {
    const i = BG_MODES.indexOf(settings.get('bg'));
    settings.set('bg', BG_MODES[(i + 1) % BG_MODES.length]);
    label();
    if (settings.get('bg') === 'matrix') eggs.unlock('wallpaper');
  });
}

// ---------------------------------------------------------------- confetti on achievements
function initConfetti(fx) {
  new MutationObserver((ms) => {
    for (const m of ms)
      for (const n of m.addedNodes)
        if (n.classList?.contains('achievement') && !isPotato()) setTimeout(() => fx.burst(innerWidth - 120, 110, 16), 250);
  }).observe(document.body, { childList: true });
}

// ---------------------------------------------------------------- live viewers
function initViewers() {
  const el = h('p', { class: 'viewers' }, h('i'), h('span', { text: '1 person is viewing this page right now' }));
  $('.hero-cta').after(el);
  const lines = ['1 person is viewing this page right now', "that's you", 'nobody else. we checked. (we did not check)', '1 person is viewing this page right now'];
  let i = 0;
  setInterval(() => (el.lastChild.textContent = lines[++i % lines.length]), 6000);
}

// ---------------------------------------------------------------- hidden coins
function initCoinHunt(fx, eggs) {
  const found = new Set(JSON.parse((() => { try { return localStorage.getItem('mnr:hunt'); } catch { return null; } })() || '[]'));
  const spots = ['#about .about-text', '.card-featured .card-points', '#contact .contact', '.footer', '.ticker'];
  spots.forEach((sel, i) => {
    if (found.has(i)) return;
    const host = $(sel);
    if (!host) return;
    const c = h('button', { type: 'button', class: 'hidden-coin', 'aria-label': 'a tiny coin' });
    c.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#xmr"/></svg>';
    c.style.left = `${10 + Math.random() * 80}%`;
    c.style.top = `${10 + Math.random() * 70}%`;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.append(c);
    c.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      found.add(i);
      try {
        localStorage.setItem('mnr:hunt', JSON.stringify([...found]));
      } catch {}
      fx.burst(e.clientX, e.clientY, 8);
      c.remove();
      toast(`found a hidden coin! ${found.size}/${spots.length}`);
      if (found.size === spots.length) eggs.unlock('hunt');
    });
  });
}

// ---------------------------------------------------------------- seasonal
function initSeasonal(fx, eggs) {
  const m = new Date().getMonth();
  const d = new Date().getDate();
  let ev = null;
  if (m === 9) ev = { cls: 'spooky', emoji: '🎃', name: 'spooky season', extra: '🦇' };
  else if (m === 11 && d >= 10) ev = { cls: 'festive', emoji: '❄️', name: 'festive season', extra: '🎄' };
  else if (m === 3 && d === 1) ev = { cls: 'fools', emoji: '🐟', name: 'april fools', extra: '🤡' };
  if (!ev) return;
  document.documentElement.classList.add(ev.cls);
  setTimeout(() => notify(`${ev.emoji} ${ev.name} event is live`, `limited time event! it ends when the month does. nothing is different except a few ${ev.emoji}.`), 8000);
  // occasional themed rain + things flying across
  setInterval(() => {
    if (isPotato() || document.hidden) return;
    fx.rainOf(ev.emoji, 1200);
    const b = h('div', { class: 'flyer', text: ev.extra, 'aria-hidden': 'true' });
    b.style.top = `${10 + Math.random() * 50}vh`;
    document.body.append(b);
    setTimeout(() => b.remove(), 7000);
  }, 45000);
  eggs.unlock('season');
}
