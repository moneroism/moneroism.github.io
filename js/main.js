import { profile, projects, contact, donate, github } from './data.js';
import { startBackground } from './bg.js';
import { initTerminal } from './terminal.js';
import { initFx } from './fx.js';
import { playIntro } from './intro.js';
import { settings, isPotato } from './settings.js';
import { initEggs } from './eggs.js';
import { initSlop } from './slop.js';
import { initMore } from './more.js';
import { initBloat } from './bloat.js';

const $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, cls, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}

function link(href, text, cls) {
  const a = el('a', cls, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

// `code` -> <code>
function rich(text) {
  return text.split(/(`[^`]+`)/).map((p) => (p.startsWith('`') ? el('code', null, p.slice(1, -1)) : p));
}

function renderAbout() {
  $('#bio').append(...profile.bio.map((p) => el('p', null, p)));
}

function renderProjects() {
  const arrow = '↗';
  for (const p of projects) {
    const card = link(p.url, null, 'card' + (p.featured ? ' card-featured' : ''));
    card.append(
      el('div', 'card-top', el('span', 'badge', p.status), el('span', 'card-lang', p.lang)),
      el('h3', null, p.name, el('span', 'card-arrow', arrow)),
      el('p', 'card-tag', p.tagline),
      el('ul', 'card-points', p.points.map((pt) => el('li', null, rich(pt)))),
    );
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
      card.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`);
      card.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
    $('#cards').append(card);
  }
}

function renderContact() {
  const body = $('#contact-body');
  const box = (title, content) => el('div', 'contact-box', el('h3', null, title), content);
  body.append(
    box(
      'contact',
      contact.length
        ? el('ul', null, contact.map((c) => el('li', null, el('span', 'muted', c.label + ' '), c.href ? link(c.href, c.value) : c.value)))
        : el('p', 'muted', 'for now, ', link(github, 'github'), '.'),
    ),
    box(
      'donate (xmr)',
      donate.xmr ? el('code', 'addr', donate.xmr) : el('p', 'muted', 'soon.'),
    ),
  );
}

function splitTitle() {
  const h = $('[data-split]');
  const text = h.textContent;
  h.textContent = '';
  h.setAttribute('aria-label', text);
  [...text].forEach((ch, i) => {
    const s = el('span', null, ch);
    s.setAttribute('aria-hidden', 'true');
    s.style.animationDelay = `${0.35 + i * 0.05}s`;
    h.append(s);
  });
}

function typeLoop() {
  const out = $('#typed');
  const lines = profile.taglines;
  if (reduce) return void (out.textContent = lines[0]);
  let li = 0, ci = 0, del = false;
  const tick = () => {
    const line = lines[li];
    ci += del ? -1 : 1;
    out.textContent = line.slice(0, ci);
    let wait = del ? 35 : 75;
    if (!del && ci === line.length && lines.length === 1) return; // type once, stop
    if (!del && ci === line.length) (del = true), (wait = 1800);
    else if (del && ci === 0) (del = false), (li = (li + 1) % lines.length), (wait = 400);
    setTimeout(tick, wait);
  };
  setTimeout(tick, 1200);
}

function reveal() {
  const items = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) return items.forEach((i) => i.classList.add('in'));
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
        const t = e.target.querySelector('.section-title .t');
        if (t) scramble(t, 1600);
        e.target.querySelectorAll('.card h3, .contact-box h3').forEach((h, i) => setTimeout(() => scramble(h, 1200), 300 + i * 200));
      }),
    { threshold: 0.12 },
  );
  items.forEach((i) => io.observe(i));
}

function heroParallax() {
  if (reduce) return;
  const logo = $('.hero-logo');
  addEventListener('pointermove', (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    logo.style.setProperty('--rx', `${-y * 14}deg`);
    logo.style.setProperty('--ry', `${x * 14}deg`);
  }, { passive: true });
  addEventListener('scroll', () => {
    const p = Math.min(scrollY / innerHeight, 1);
    logo.style.setProperty('--spin', `${p * 360}deg`);
    document.documentElement.style.setProperty('--hero-fade', String(1 - p * 0.9));
  }, { passive: true });
}

function navShadow() {
  const nav = $('.nav');
  const f = () => nav.classList.toggle('scrolled', scrollY > 20);
  addEventListener('scroll', f, { passive: true });
  f();
}

// "decrypt" text from random glyphs. each char locks in at its own random time
const GLYPHS = '01#$%&*+=?<>[]{}/\\|XMR';
const scrambling = new WeakSet();
export function scramble(el, duration = 1500) {
  const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
  if (!node || scrambling.has(node) || isPotato() || reduce) return;
  scrambling.add(node);
  const final = node.textContent;
  const lockAt = [...final].map((_, i) => duration * (0.25 + 0.75 * (i / final.length) * (0.6 + Math.random() * 0.4)));
  const t0 = performance.now();
  let lastSwap = 0;
  const tick = (now) => {
    const t = now - t0;
    if (now - lastSwap > 55) {
      lastSwap = now;
      node.textContent = [...final]
        .map((ch, i) => (ch === ' ' || t >= lockAt[i] ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join('');
    }
    if (t < duration) requestAnimationFrame(tick);
    else {
      node.textContent = final;
      scrambling.delete(node);
    }
  };
  requestAnimationFrame(tick);
}

function hoverScramble() {
  document.querySelectorAll('.nav nav a, .card h3, .section-title .t, .nav-logo span').forEach((el) =>
    el.addEventListener('pointerenter', () => scramble(el, 700)),
  );
}

// buttons lean toward the cursor
function magnetic() {
  document.querySelectorAll('.btn, .term-btn, .dock button').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      if (isPotato()) return;
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.25}px ${(e.clientY - r.top - r.height / 2) * 0.35}px`;
    });
    b.addEventListener('pointerleave', () => (b.style.translate = ''));
  });
}

function progressBar() {
  const bar = $('.progress');
  const f = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.scale = `${max > 0 ? scrollY / max : 0} 1`;
  };
  addEventListener('scroll', f, { passive: true });
  f();
}

function dock() {
  const btns = document.querySelectorAll('[data-toggle]');
  const sync = () => btns.forEach((b) => b.classList.toggle('on', !!settings.get(b.dataset.toggle)));
  btns.forEach((b) => b.addEventListener('click', () => settings.toggle(b.dataset.toggle)));
  settings.on(sync);
  sync();
}

// up up down down left right left right b a
function konami(fx, eggs) {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let i = 0;
  addEventListener('keydown', (e) => {
    i = e.key === seq[i] ? i + 1 : e.key === seq[0] ? 1 : 0;
    if (i === seq.length) {
      i = 0;
      fx.storm(8000);
      eggs.unlock('konami');
    }
  });
}

renderAbout();
renderProjects();
renderContact();
splitTitle();
navShadow();
progressBar();
dock();
magnetic();
startBackground($('#bg'));
const fx = initFx();
const eggs = initEggs(fx, { replayIntro: () => playIntro({ force: true }) });
konami(fx, eggs);
hoverScramble();
const slop = initSlop(fx, eggs);
slop.more = initMore(fx, eggs, slop.sfx);
initBloat({ fx, eggs, replayIntro: () => playIntro({ force: true }) });
initTerminal(fx, eggs, slop);

playIntro().then(() => {
  document.documentElement.classList.add('ready');
  typeLoop();
  reveal();
  heroParallax();
});
