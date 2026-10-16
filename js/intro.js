// loading intro: tetris pieces rain down, shatter into pixels and stack up.
// every pixel that lands punches a hole in the cover, so the site gets "built" bottom-up.
// once per session. skip with any key / click.
import { isPotato, reducedMotion } from './settings.js';

const PIECES = [
  [[0, 0], [1, 0], [2, 0], [3, 0]], // I
  [[0, 0], [1, 0], [0, 1], [1, 1]], // O
  [[0, 0], [1, 0], [2, 0], [1, 1]], // T
  [[1, 0], [2, 0], [0, 1], [1, 1]], // S
  [[0, 0], [1, 0], [1, 1], [2, 1]], // Z
  [[0, 0], [0, 1], [1, 1], [2, 1]], // J
  [[2, 0], [0, 1], [1, 1], [2, 1]], // L
];
const COLORS = ['#f26822', '#ff8a4c', '#c4501a', '#4c4c4c', '#6a6a70', '#ffb07a', '#8f3a10'];
const BG = '#0a0a0b';
const GLYPHS = '01<>[]{}#$%&*+=/|XMR'.split('');

export function playIntro({ force = false } = {}) {
  return new Promise((resolve) => {
    let seen = false;
    try {
      seen = sessionStorage.getItem('mnr:intro') === '1';
    } catch {}
    if ((seen && !force) || isPotato() || reducedMotion()) return resolve();
    try {
      sessionStorage.setItem('mnr:intro', '1');
    } catch {}

    const root = document.documentElement;
    root.classList.add('intro-running');
    const wrap = document.createElement('div');
    wrap.className = 'intro';
    const mask = document.createElement('canvas');
    const fx = document.createElement('canvas');
    const skip = document.createElement('button');
    skip.className = 'intro-skip';
    skip.textContent = 'skip ›';
    wrap.append(mask, fx, skip);
    document.body.append(wrap);

    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    const cell = Math.max(18, Math.round(Math.min(W, H) / 26));
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    for (const c of [mask, fx]) {
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    }
    const m = mask.getContext('2d');
    const f = fx.getContext('2d');
    m.scale(dpr, dpr);
    f.scale(dpr, dpr);
    m.fillStyle = BG;
    m.fillRect(0, 0, W, H);

    // matrix glyph columns behind everything while loading
    const drops = Array.from({ length: Math.ceil(W / 16) }, () => Math.random() * -40);

    const height = new Array(cols).fill(0); // reserved cells per column
    const total = cols * rows;
    let reserved = 0, landed = 0;
    const falling = []; // pixels
    const flashes = [];
    let last = performance.now();
    let spawnAcc = 0;
    let done = false;
    const start = performance.now();
    const DURATION = 2.4; // seconds, roughly

    function spawnPiece() {
      const shape = PIECES[(Math.random() * PIECES.length) | 0];
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      // aim at the lowest columns so the stack stays even
      let best = 0, bestH = Infinity;
      for (let t = 0; t < 4; t++) {
        const c = (Math.random() * cols) | 0;
        if (height[c] < bestH) (best = c), (bestH = height[c]);
      }
      const x0 = Math.min(Math.max(0, best - 1), cols - 3);
      const vy = 900 + Math.random() * 600;
      // bottom cells of the shape reserve first
      const cellsSorted = [...shape].sort((a, b) => b[1] - a[1]);
      for (const [dx, dy] of cellsSorted) {
        const col = Math.min(cols - 1, x0 + dx);
        if (height[col] >= rows) continue;
        const row = rows - 1 - height[col]++;
        reserved++;
        falling.push({ col, row, x: col * cell, y: -cell * (3 - dy) - Math.random() * 20, vy, color });
      }
    }

    function finish() {
      if (done) return;
      done = true;
      wrap.classList.add('out');
      root.classList.remove('intro-running');
      setTimeout(() => {
        wrap.remove();
        resolve();
      }, 450);
    }

    function frame(now) {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;

      // spawn rate ramps up so it finishes in ~DURATION
      if (reserved < total) {
        const perSec = (total / 4) / DURATION * (0.6 + Math.min(1.6, t));
        spawnAcc += perSec * dt;
        while (spawnAcc >= 1 && reserved < total) {
          spawnPiece();
          spawnAcc--;
        }
      }

      f.clearRect(0, 0, W, H);

      // glyph rain, only over still-covered area (drawn under the pixels)
      f.font = '14px ui-monospace, monospace';
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * 16;
        f.fillStyle = 'rgba(242,104,34,0.35)';
        f.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * 16, y);
        drops[i] += dt * 30;
        if (y > H && Math.random() > 0.97) drops[i] = 0;
      }
      // keep glyphs only where the cover is still there
      f.globalCompositeOperation = 'destination-in';
      f.drawImage(mask, 0, 0, W, H);
      f.globalCompositeOperation = 'source-over';

      for (let i = falling.length - 1; i >= 0; i--) {
        const p = falling[i];
        p.vy += 2600 * dt;
        p.y += p.vy * dt;
        const ty = p.row * cell;
        if (p.y >= ty) {
          // landed: reveal the site under this cell
          m.clearRect(p.col * cell, ty, cell, cell);
          flashes.push({ x: p.col * cell, y: ty, life: 0.35, color: p.color });
          falling.splice(i, 1);
          landed++;
          continue;
        }
        f.fillStyle = p.color;
        f.fillRect(p.x + 1, p.y + 1, cell - 2, cell - 2);
        f.fillStyle = 'rgba(255,255,255,0.18)';
        f.fillRect(p.x + 1, p.y + 1, cell - 2, 3);
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const fl = flashes[i];
        fl.life -= dt;
        if (fl.life <= 0) {
          flashes.splice(i, 1);
          continue;
        }
        f.globalAlpha = fl.life / 0.35;
        f.fillStyle = fl.color;
        f.fillRect(fl.x + 1, fl.y + 1, cell - 2, cell - 2);
        f.globalAlpha = 1;
      }

      // progress readout
      const pct = Math.floor((landed / total) * 100);
      f.font = `600 ${Math.max(12, cell * 0.6)}px ui-monospace, monospace`;
      f.fillStyle = '#f26822';
      f.textAlign = 'left';
      f.fillText(`> building moneroism ... ${String(pct).padStart(3)}%`, 20, 34);

      if (landed >= total && !flashes.length) return finish();
      if (t > 8) return finish(); // safety net
      requestAnimationFrame(frame);
    }

    const bail = () => finish();
    skip.addEventListener('click', bail);
    addEventListener('keydown', bail, { once: true });
    wrap.addEventListener('click', bail);
    requestAnimationFrame(frame);
  });
}
