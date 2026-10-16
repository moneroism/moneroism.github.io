// bloat. features nobody asked for, in the grand tradition of modern software.
// everything is local: no accounts, no server, no network. the jokes need that to be true.
import { toast, isPotato } from './settings.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) {
    try {
      return JSON.parse(localStorage.getItem('mnr:' + k)) ?? d;
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('mnr:' + k, JSON.stringify(v));
    } catch {}
  },
};
const once = (k) => {
  try {
    if (sessionStorage.getItem('mnr:' + k)) return false;
    sessionStorage.setItem('mnr:' + k, '1');
  } catch {}
  return true;
};
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

export function initBloat({ fx, eggs, replayIntro }) {
  const ctx = { fx, eggs, replayIntro };
  initNotify();
  initNavBloat(ctx);
  initSectionBloat(ctx);
  initComments(ctx);
  initAds(ctx);
  initCountdown();
  initRocket(ctx);
  initAssistant(ctx);
  initPopups(ctx);
  initUpdates(ctx);
}

// ---------------------------------------------------------------- notifications
let notifyRoot;
export function notify(title, body, actions = []) {
  const card = h('div', { class: 'notif' },
    h('div', { class: 'notif-head' }, h('span', { class: 'notif-app', text: 'moneroism' }), h('button', { type: 'button', class: 'notif-x', 'aria-label': 'dismiss', text: '✕', onclick: () => close() })),
    h('strong', { text: title }),
    h('p', { text: body }),
    actions.length ? h('div', { class: 'notif-actions' }, actions.map((a) => h('button', { type: 'button', text: a.label, onclick: () => (close(), a.run?.()) }))) : null,
  );
  notifyRoot.append(card);
  requestAnimationFrame(() => card.classList.add('show'));
  const t = setTimeout(() => close(), 9000);
  function close() {
    clearTimeout(t);
    card.classList.remove('show');
    setTimeout(() => card.remove(), 400);
  }
}
function initNotify() {
  notifyRoot = h('div', { class: 'notif-stack', 'aria-live': 'polite' });
  document.body.append(notifyRoot);
  const tips = [
    ['tip', 'you can press ` to open a terminal. or not. your call.'],
    ['did you know?', 'this website weighs more than some operating systems from 1995.'],
    ['reminder', 'you have 0 unread messages. we would know, but we don\'t.'],
    ['storage', 'you are using 0 B of ∞ cloud storage. there is no cloud.'],
    ['security', 'your password is safe. you never gave us one.'],
    ['tip', 'try the clicker. it is the most productive thing on this page.'],
    ['wellness', 'you\'ve been staring at a website for a while. blink.'],
  ];
  let i = (Math.random() * tips.length) | 0;
  setInterval(() => {
    if (document.hidden) return;
    const [t, b] = tips[i++ % tips.length];
    notify(t, b);
  }, 75000);
}

// ---------------------------------------------------------------- nav: language, streak, pro, sign in
const LANGS = {
  english: (s) => s,
  pirate: (s) =>
    s
      .replace(/\bmy\b/gi, 'me').replace(/\byou\b/gi, 'ye').replace(/\byour\b/gi, 'yer').replace(/\bis\b/gi, 'be')
      .replace(/\bare\b/gi, 'be').replace(/\bthe\b/gi, "th'").replace(/\band\b/gi, "an'").replace(/ing\b/g, "in'")
      .replace(/\bsoftware\b/gi, 'booty').replace(/\.\s*$/, ', arr.'),
  uwu: (s) => s.replace(/[rl]/g, 'w').replace(/[RL]/g, 'W').replace(/n([aeiou])/g, 'ny$1').replace(/\.\s*$/, ' uwu.'),
  l33t: (s) => s.replace(/a/gi, '4').replace(/e/gi, '3').replace(/i/gi, '1').replace(/o/gi, '0').replace(/s/gi, '5').replace(/t/gi, '7'),
  corporate: (s) =>
    s.replace(/\bi\b/g, 'we').replace(/\bmy\b/g, 'our').replace(/\bsoftware\b/g, 'solutions').replace(/\bstuff\b/g, 'deliverables')
      .replace(/\bcode\b/g, 'value').replace(/\bfree\b/g, 'synergistic').replace(/^(\s*)([a-z])/, (_, w, c) => `${w}Leveraging AI, ${c}`),
};
const originals = new WeakMap();
function translate(lang) {
  const walker = document.createTreeWalker($('main'), NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent.trim().length > 1 && !n.parentElement.closest('.hero-title, code, .bloat-ui, .ticker') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    if (!originals.has(n)) originals.set(n, n.textContent);
    n.textContent = LANGS[lang](originals.get(n));
  }
}

function initNavBloat({ eggs }) {
  const nav = $('.nav nav');

  // visit streak
  const today = new Date().toDateString();
  const s = store.get('streak', { last: null, n: 0, visits: 0 });
  if (s.last !== today) {
    const y = new Date(Date.now() - 864e5).toDateString();
    s.n = s.last === y ? s.n + 1 : 1;
    s.last = today;
  }
  s.visits++;
  store.set('streak', s);
  if (s.n >= 3) setTimeout(() => eggs.unlock('streak'), 3000);
  const streak = h('button', { type: 'button', class: 'nav-pill bloat-ui', title: `${s.n} day streak · ${s.visits} visits (stored only in your browser)`, text: `🔥 ${s.n}`,
    onclick: () => toast(`${s.n} day streak! ${s.visits} visits total. we only know because your browser told itself.`) });

  // language
  const sel = h('select', { class: 'nav-select bloat-ui', 'aria-label': 'language' }, Object.keys(LANGS).map((l) => h('option', { value: l, text: l })));
  sel.value = store.get('lang', 'english');
  sel.addEventListener('change', () => {
    store.set('lang', sel.value);
    translate(sel.value);
    if (sel.value !== 'english') eggs.unlock('lang');
  });

  // pro + sign in
  const pro = store.get('pro', false);
  const proBtn = h('button', { type: 'button', class: 'nav-pro bloat-ui', text: pro ? 'PRO' : 'get pro ✨', onclick: () => openPro(proBtn, eggs) });
  const signed = store.get('signedin', false);
  const signBtn = h('button', { type: 'button', class: 'nav-pill bloat-ui', text: signed ? '👤 guest' : 'sign in', onclick: () => openSignIn(signBtn, eggs) });

  nav.prepend(streak, sel);
  nav.append(signBtn, proBtn);
  // let the page render before mangling it
  if (sel.value !== 'english') setTimeout(() => translate(sel.value), 50);
}

function modal(title, content, { wide = false } = {}) {
  const box = h('div', { class: 'modal' + (wide ? ' wide' : '') },
    h('button', { type: 'button', class: 'modal-x', 'aria-label': 'close', text: '✕', onclick: () => close() }),
    h('h3', { text: title }),
    content,
  );
  const wrap = h('div', { class: 'modal-wrap bloat-ui', onclick: (e) => e.target === wrap && close() }, box);
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  function close() {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 300);
  }
  return close;
}

function openPro(btn, eggs) {
  const tier = (name, price, feats, cta, run) =>
    h('div', { class: 'tier' + (name === 'pro' ? ' best' : '') },
      name === 'pro' ? h('span', { class: 'tier-tag', text: 'most popular' }) : null,
      h('strong', { text: name }),
      h('div', { class: 'tier-price', text: price }),
      h('ul', {}, feats.map((f) => h('li', { text: f }))),
      h('button', { type: 'button', text: cta, onclick: run }),
    );
  const close = modal('upgrade to moneroism pro', h('div', { class: 'tiers' },
    tier('free', '0 xmr/mo', ['the whole website', 'every feature', 'no ads (except the fake ones)'], 'current plan', () => toast('you are already on this plan. it is also the best one.')),
    tier('pro', '0 xmr/mo', ['the whole website', 'every feature', 'a badge'], 'upgrade', () => {
      store.set('pro', true);
      btn.textContent = 'PRO';
      close();
      toast('welcome to pro. nothing changed. enjoy the badge.');
      eggs.unlock('pro');
    }),
    tier('enterprise', 'contact sales', ['the whole website', 'every feature', 'a meeting'], 'contact sales', () => toast('there is no sales team. there is barely a website.')),
  ), { wide: true });
}

function openSignIn(btn, eggs) {
  const user = h('input', { placeholder: 'email or username', autocomplete: 'off' });
  const pass = h('input', { type: 'password', placeholder: 'password', autocomplete: 'off' });
  const close = modal('sign in with your moneroism account', h('form', { class: 'signin', onsubmit: (e) => {
    e.preventDefault();
    user.value = pass.value = '';
    store.set('signedin', true);
    btn.textContent = '👤 guest';
    close();
    toast('there are no accounts. there is no server. you are now signed in to nothing.');
    eggs.unlock('signin');
  } }, user, pass, h('button', { type: 'submit', text: 'sign in' }), h('small', { text: "what you type here never leaves this page. it gets cleared immediately. don't type real passwords into random websites anyway." })));
}

// ---------------------------------------------------------------- per-section bloat
function initSectionBloat({ eggs }) {
  for (const sec of $$('main .section')) {
    const title = $('.section-title .t', sec)?.textContent ?? 'section';
    const words = sec.innerText.split(/\s+/).length;

    // breadcrumbs + reading time
    const meta = h('div', { class: 'sec-meta bloat-ui' },
      h('span', { text: `home › moneroism › ${title} › you are here` }),
      h('span', { text: `· ${Math.max(1, Math.round(words / 200))} min read (${words} words)` }),
      h('span', { text: '· last updated: just now' }),
    );

    // toolbar: summarize, read aloud, share
    const out = h('div', { class: 'ai-out', hidden: true });
    const tools = h('div', { class: 'sec-tools bloat-ui' },
      h('button', { type: 'button', text: '✨ summarize with AI', onclick: () => summarize(title, out, eggs) }),
      h('button', { type: 'button', text: '🔊 read aloud', onclick: (e) => readAloud(sec, e.currentTarget, eggs) }),
      h('button', { type: 'button', text: '🔗 share', onclick: () => share(sec.id) }),
      h('button', { type: 'button', text: '🖨 print', onclick: () => print() }),
    );
    $('.section-title', sec).after(meta, tools, out);

    // reactions
    const counts = store.get('react:' + sec.id, {});
    const row = h('div', { class: 'reactions bloat-ui' },
      ['❤️', '🔥', '🪙', '👀', '🥔'].map((e) => {
        const b = h('button', { type: 'button', class: counts[e] ? 'on' : '' }, `${e} ${counts[e] || 0}`);
        b.addEventListener('click', () => {
          counts[e] = (counts[e] || 0) + 1;
          store.set('react:' + sec.id, counts);
          b.textContent = `${e} ${counts[e]}`;
          b.classList.add('on', 'pop');
          setTimeout(() => b.classList.remove('pop'), 300);
          eggs.unlock('react');
        });
        return b;
      }),
      h('small', { text: 'reactions are stored in your browser. it\'s just you in here.' }),
    );
    sec.append(row);
  }
}

function summarize(title, out, eggs) {
  out.hidden = false;
  out.textContent = '';
  eggs.unlock('ai');
  const text = `✨ AI summary: this section is about "${title}". it contains words, arranged in sentences. key takeaways: (1) there is text here. (2) you are reading it. (3) you could have just read it. this summary was generated locally by a regex. it is wrong in a confident tone, like the real thing.`;
  let i = 0;
  const think = h('span', { class: 'ai-think', text: 'thinking' });
  out.append(think);
  setTimeout(() => {
    think.remove();
    const tick = () => {
      out.textContent = text.slice(0, (i += 3));
      if (i < text.length) setTimeout(tick, 16);
      else
        out.append(
          h('div', { class: 'ai-fb' }, 'was this helpful? ',
            h('button', { type: 'button', text: '👍', onclick: () => toast('feedback sent to /dev/null') }),
            h('button', { type: 'button', text: '👎', onclick: () => toast('feedback sent to /dev/null, angrily') })),
        );
    };
    tick();
  }, 1200);
}

let speaking = null;
function readAloud(sec, btn, eggs) {
  if (!('speechSynthesis' in window)) return toast('your browser has no voices. lucky.');
  if (speaking) {
    speechSynthesis.cancel();
    speaking.textContent = '🔊 read aloud';
    speaking = null;
    return;
  }
  const text = [...sec.querySelectorAll('h2 .t, p, h3, li')].filter((n) => !n.closest('.bloat-ui, .ai-out')).map((n) => n.textContent).join('. ');
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.onend = () => {
    btn.textContent = '🔊 read aloud';
    speaking = null;
  };
  speechSynthesis.speak(u);
  btn.textContent = '⏹ stop';
  speaking = btn;
  eggs.unlock('aloud');
}

function share(id) {
  const url = location.origin + location.pathname + '#' + id;
  navigator.clipboard?.writeText(url).then(
    () => toast('link copied. share it with your 0 followers.'),
    () => toast(url),
  );
}

// ---------------------------------------------------------------- comments (local only)
function initComments({ eggs }) {
  const list = h('ul', { class: 'comments-list' });
  const input = h('textarea', { placeholder: 'write a comment...', rows: 3, maxlength: 500 });
  const sec = h('section', { id: 'comments', class: 'section reveal in bloat-ui' },
    h('h2', { class: 'section-title' }, h('span', { text: '04' }), ' ', h('span', { class: 't', text: 'comments' })),
    h('form', { class: 'comment-form', onsubmit: (e) => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      const c = store.get('comments', []);
      c.unshift({ t, d: Date.now() });
      store.set('comments', c.slice(0, 50));
      input.value = '';
      render();
      eggs.unlock('comment');
    } }, input, h('div', {}, h('button', { type: 'submit', text: 'post comment' }), h('small', { text: ' comments are saved in your browser only. nobody else will ever see them. just like real comment sections.' }))),
    list,
  );
  $('#contact').after(sec);
  function render() {
    const c = store.get('comments', []);
    list.textContent = '';
    if (!c.length) list.append(h('li', { class: 'muted', text: '0 comments. be the first. you will also be the last.' }));
    c.forEach((x, i) =>
      list.append(
        h('li', {},
          h('div', { class: 'c-head' }, h('strong', { text: 'you' }), h('small', { text: ' · ' + new Date(x.d).toLocaleString() + ' · 1 like (yours)' }),
            h('button', { type: 'button', class: 'c-del', text: 'delete', onclick: () => {
              const all = store.get('comments', []);
              all.splice(i, 1);
              store.set('comments', all);
              render();
            } })),
          h('p', { text: x.t }),
        ),
      ),
    );
  }
  render();
}

// ---------------------------------------------------------------- ads
const ADS = [
  ['download more RAM', 'your browser is using memory. get more, free, instantly.', 'download now', 'ram'],
  ['hot ISOs in your area', 'minimal, hardened, and built from source. they want to meet you.', 'see cig', 'cig'],
  ['1 weird trick to stop telemetry', 'tech companies hate it. (the trick is to not add telemetry.)', 'learn more', 'trick'],
  ['is your PC fine?', 'we scanned your computer and found nothing because we did not scan your computer.', 'scan again', 'scan'],
  ['XMR clicker pro™', 'the idle game that is exactly the same as the free one.', 'play now', 'clicker'],
];
function initAds({ eggs }) {
  let n = (Math.random() * ADS.length) | 0;
  for (const after of ['#about', '#projects']) {
    const [title, body, cta, kind] = ADS[n++ % ADS.length];
    const close = h('button', { type: 'button', class: 'ad-x', 'aria-label': 'close ad', text: '✕' });
    const ad = h('aside', { class: 'ad bloat-ui' },
      h('span', { class: 'ad-tag', text: 'sponsored' }),
      h('div', { class: 'ad-body' }, h('strong', { text: title }), h('p', { text: body })),
      h('button', { type: 'button', class: 'ad-cta', text: cta, onclick: () => adAction(kind, eggs) }),
      h('button', { type: 'button', class: 'ad-why', text: 'why am i seeing this?', onclick: () => toast('nobody is targeting you. everyone sees this ad. it is fake.') }),
      close,
    );
    // the close button runs away a few times
    let dodges = 0;
    close.addEventListener('pointerenter', () => {
      if (dodges++ >= 3 || isPotato()) return;
      close.style.translate = `${(Math.random() - 0.5) * 300}px ${(Math.random() - 0.5) * 60}px`;
    });
    close.addEventListener('click', () => {
      ad.classList.add('gone');
      setTimeout(() => ad.remove(), 400);
      eggs.unlock('adblock');
    });
    $(after).after(ad);
  }
}
function adAction(kind, eggs) {
  if (kind === 'ram') {
    let p = 0;
    const t = setInterval(() => {
      p += 7 + Math.random() * 20;
      if (p >= 100) {
        clearInterval(t);
        toast('download failed: the RAM did not fit through the CSP. you have the same amount as before.');
        eggs.unlock('ram');
      } else toast(`downloading RAM... ${p | 0}%`);
    }, 700);
  } else if (kind === 'cig') location.hash = '#projects';
  else if (kind === 'trick') toast("that's it. that's the trick. don't add telemetry.");
  else if (kind === 'scan') toast('scan complete. 0 threats. 0 files scanned. 100% accurate.');
  else document.querySelector('[data-clicker]')?.click();
}

// ---------------------------------------------------------------- countdown on the cig card
function initCountdown() {
  const card = $('.card-featured');
  if (!card) return;
  const el = h('div', { class: 'countdown bloat-ui' });
  card.append(el);
  let end = Date.now() + (3 + Math.random() * 5) * 60000;
  setInterval(() => {
    const left = end - Date.now();
    if (left <= 0) {
      el.textContent = '0.3.0: any minute now';
      if (left < -8000) end = Date.now() + (3 + Math.random() * 5) * 60000;
      return;
    }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    el.textContent = `next release in ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (estimate, unreliable)`;
  }, 1000);
}

// ---------------------------------------------------------------- back to top rocket
function initRocket({ fx }) {
  const b = h('button', { type: 'button', class: 'rocket bloat-ui', 'aria-label': 'back to top', text: '🚀' });
  document.body.append(b);
  addEventListener('scroll', () => b.classList.toggle('show', scrollY > innerHeight), { passive: true });
  b.addEventListener('click', () => {
    b.classList.add('launch');
    const r = b.getBoundingClientRect();
    fx.burst?.(r.left + r.width / 2, r.bottom, 6);
    scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => b.classList.remove('launch'), 1200);
  });
}

// ---------------------------------------------------------------- assistant
const TIPS = [
  "it looks like you're trying to read a website. would you like help?",
  "it looks like you're scrolling. have you tried scrolling faster?",
  'did you know the big coin is clickable? i did. i know everything.',
  "you seem lost. that's okay. so is the developer.",
  'i noticed you have not upgraded to pro yet. it is free. so is everything.',
  "fun fact: i am not powered by AI. i am powered by an array of strings.",
  'have you tried turning the website off and on again?',
  "i'm not tracking you. i just have a feeling.",
];
function initAssistant({ eggs }) {
  let dismissed = 0, i = (Math.random() * TIPS.length) | 0;
  const msg = h('p');
  const bubble = h('div', { class: 'asst-bubble' }, msg,
    h('div', { class: 'asst-btns' },
      h('button', { type: 'button', text: 'another tip', onclick: () => say() }),
      h('button', { type: 'button', text: 'go away', onclick: () => hide() })));
  const face = h('button', { type: 'button', class: 'asst-face', 'aria-label': 'assistant', onclick: () => say() },
    h('svg', {}), h('i', { class: 'eye l' }), h('i', { class: 'eye r' }));
  face.firstChild.outerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#xmr"/></svg>';
  const el = h('div', { class: 'asst bloat-ui', hidden: true }, bubble, face);
  document.body.append(el);
  function say(text) {
    msg.textContent = text ?? TIPS[i++ % TIPS.length];
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
  }
  function show(text) {
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('show'));
    say(text);
  }
  function hide() {
    el.classList.remove('show');
    setTimeout(() => (el.hidden = true), 400);
    if (++dismissed >= 3) eggs.unlock('clippy');
    // like any good assistant, it comes back
    setTimeout(() => show(dismissed > 1 ? "i'm back! did you miss me? (you can't get rid of me)" : "i'm back!"), 90000);
  }
  setTimeout(() => show(), 25000);
  // eyes follow the cursor
  addEventListener('pointermove', (e) => {
    if (el.hidden) return;
    const r = face.getBoundingClientRect();
    const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    face.style.setProperty('--ex', `${Math.cos(a) * 3}px`);
    face.style.setProperty('--ey', `${Math.sin(a) * 3}px`);
  }, { passive: true });
}

// ---------------------------------------------------------------- popups
function initPopups({ eggs }) {
  if (once('newsletter'))
    setTimeout(() => {
      const email = h('input', { type: 'email', placeholder: 'you@example.org', autocomplete: 'off' });
      const close = modal('subscribe to the newsletter 📬', h('form', { class: 'signin', onsubmit: (e) => {
        e.preventDefault();
        email.value = '';
        close();
        toast('subscribed! we have no server, so we will never email you. best newsletter ever.');
        eggs.unlock('spam');
      } },
        h('p', { text: 'get the latest updates, never. join 0 other subscribers.' }), email,
        h('button', { type: 'submit', text: 'subscribe' }),
        h('small', { text: 'your email is cleared on submit and never leaves this tab.' })));
    }, 45000);

  if (once('rating'))
    setTimeout(() => {
      const stars = h('div', { class: 'stars' }, [1, 2, 3, 4, 5].map((n) =>
        h('button', { type: 'button', text: '★', onclick: () => {
          close();
          toast(n === 5 ? 'thanks! your rating was saved to /dev/null' : `${n} stars? rounding up to 5. saved to /dev/null`);
          eggs.unlock('rated');
        } })));
      const close = modal('how are you enjoying moneroism?', h('div', {}, h('p', { text: 'your feedback helps us improve nothing.' }), stars));
    }, 150000);
}

// ---------------------------------------------------------------- fake updates
function initUpdates({ eggs, replayIntro }) {
  const nag = () =>
    notify('update available', 'a new version of moneroism is ready to install. it includes important bloat.', [
      { label: 'update now', run: () => runUpdate(eggs, replayIntro) },
      { label: 'remind me later', run: () => setTimeout(nag, 120000) },
    ]);
  setTimeout(nag, 100000);
  window.__mnrUpdate = () => runUpdate(eggs, replayIntro);
}
export function runUpdate(eggs, replayIntro) {
  const pct = h('div', { class: 'upd-pct', text: '0% complete' });
  const el = h('div', { class: 'update-screen bloat-ui' },
    h('div', { class: 'upd-dots' }, [1, 2, 3, 4, 5].map(() => h('i'))),
    h('p', { text: 'working on updates' }), pct,
    h('small', { text: "don't close this tab. it will take a while. (it won't.)" }));
  document.body.append(el);
  let p = 0;
  const t = setInterval(() => {
    p = Math.min(100, p + Math.random() * 9);
    // classic: stall at the end
    if (p > 90 && p < 100 && Math.random() < 0.6) p -= Math.random() * 3;
    pct.textContent = `${p | 0}% complete`;
    if (p >= 100) {
      clearInterval(t);
      el.remove();
      eggs.unlock('update');
      replayIntro();
    }
  }, 300);
}
