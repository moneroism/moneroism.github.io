// user toggles (rain, trail, potato). saved in localStorage, never leaves the browser.
const KEY = 'mnr:settings';
const defaults = { rain: true, trail: true, potato: false, sfx: false, crt: false };
const listeners = new Set();

let state = { ...defaults };
try {
  state = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {}

const apply = () => {
  document.documentElement.classList.toggle('potato', state.potato);
  document.documentElement.classList.toggle('crt', state.crt);
};
apply();

export const settings = {
  get: (k) => state[k],
  set(k, v) {
    state[k] = v;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
    apply();
    listeners.forEach((fn) => fn(k, v));
  },
  toggle(k) {
    this.set(k, !state[k]);
    return state[k];
  },
  on: (fn) => listeners.add(fn),
};

export const isPotato = () => state.potato;
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 2600);
}
