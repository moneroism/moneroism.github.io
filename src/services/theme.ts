import type { Module } from '@core/kernel';
import { PREFS } from './storage';

export const THEMES = ['cig', 'phosphor', 'amber', 'gruvbox', 'c64', 'paper'] as const;
export type ThemeName = (typeof THEMES)[number];

export const isTheme = (s: unknown): s is ThemeName => THEMES.includes(s as ThemeName);

// must match --bg in styles/base/_themes.scss. yes it's duplicated. no i won't generate it
const THEME_BG: Record<ThemeName, string> = {
  cig: '#0b0b0c',
  phosphor: '#050a05',
  amber: '#0d0800',
  gruvbox: '#1d2021',
  c64: '#352879',
  paper: '#f4f1ea',
};

export function initialTheme(saved: unknown): ThemeName {
  if (isTheme(saved)) return saved;
  try {
    if (matchMedia('(prefers-color-scheme: light)').matches) return 'paper';
  } catch {
    /* */
  }
  return 'cig';
}

export function applyTheme(name: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = name;
  root.style.colorScheme = name === 'paper' ? 'light' : 'dark';
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = THEME_BG[name];
}

export const themeModule: Module = {
  name: 'themed',
  description: 'applies the colour scheme',
  deps: ['prefsd'],
  init({ kernel, log }) {
    const prefs = kernel.get(PREFS);
    applyTheme(kernel.store.get().theme);
    const offTheme = kernel.store.select(
      (s) => s.theme,
      (t) => {
        applyTheme(t);
        prefs.set('theme', t);
        log.info(`theme -> ${t}`);
      },
    );
    const offCrt = kernel.store.select(
      (s) => s.crt,
      (on) => {
        document.documentElement.classList.toggle('crt', on);
        prefs.set('crt', on);
      },
    );
    document.documentElement.classList.toggle('crt', kernel.store.get().crt);
    return () => {
      offTheme();
      offCrt();
    };
  },
};
