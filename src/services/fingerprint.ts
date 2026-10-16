/*
 * what any website can read about you without asking. displayed locally, never sent anywhere.
 * (this page can't send it anywhere even if it wanted to: CSP connect-src 'none')
 * deliberately skips canvas/webgl/audio fingerprinting. showing it would mean doing it.
 */

export interface FpRow {
  key: string;
  value: string;
  /** rough "how identifying" 0-3. vibes based, not science */
  weight: 0 | 1 | 2 | 3;
}

const mq = (q: string) => {
  try {
    return matchMedia(q).matches;
  } catch {
    return false;
  }
};

export function collect(): FpRow[] {
  const n = navigator;
  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'unknown';
    }
  })();
  const rows: FpRow[] = [
    { key: 'user agent', value: n.userAgent, weight: 2 },
    { key: 'languages', value: (n.languages ?? [n.language]).join(', '), weight: 2 },
    { key: 'timezone', value: `${tz} (UTC${fmtOffset(new Date().getTimezoneOffset())})`, weight: 2 },
    {
      key: 'screen',
      value: `${screen.width}x${screen.height} @${devicePixelRatio}x, ${screen.colorDepth}bit`,
      weight: 3,
    },
    { key: 'viewport', value: `${innerWidth}x${innerHeight}`, weight: 1 },
    { key: 'cpu threads', value: String(n.hardwareConcurrency ?? 'hidden'), weight: 1 },
    { key: 'device memory', value: n.deviceMemory ? `~${n.deviceMemory} GB` : 'hidden', weight: 1 },
    { key: 'touch points', value: String(n.maxTouchPoints ?? 0), weight: 1 },
    { key: 'cookies', value: n.cookieEnabled ? 'enabled' : 'disabled', weight: 0 },
    { key: 'do not track', value: n.doNotTrack === '1' ? 'on (everyone ignores it)' : 'off', weight: 1 },
    {
      key: 'global privacy ctl',
      value: n.globalPrivacyControl === undefined ? 'unsupported' : n.globalPrivacyControl ? 'on' : 'off',
      weight: 1,
    },
    { key: 'color scheme', value: mq('(prefers-color-scheme: dark)') ? 'dark' : 'light', weight: 0 },
    { key: 'reduced motion', value: mq('(prefers-reduced-motion: reduce)') ? 'yes' : 'no', weight: 0 },
    { key: 'pointer', value: mq('(pointer: coarse)') ? 'coarse (touch)' : 'fine (mouse)', weight: 0 },
    { key: 'pdf viewer', value: String(n.pdfViewerEnabled ?? 'unknown'), weight: 0 },
    { key: 'webdriver', value: String(n.webdriver ?? false), weight: 0 },
  ];
  return rows;
}

function fmtOffset(min: number) {
  const s = min <= 0 ? '+' : '-';
  const a = Math.abs(min);
  return `${s}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`;
}

/** made-up but monotonic score so the bar has something to show */
export const exposure = (rows: FpRow[]) => {
  const max = rows.length * 3;
  const got = rows.reduce((a, r) => a + (r.value === 'hidden' || r.value === 'unsupported' ? 0 : r.weight), 0);
  return Math.round((got / max) * 100);
};
