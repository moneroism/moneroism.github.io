// animated backgrounds. modes: network (default), stars, matrix, off. pauses when the tab is hidden.
import { settings } from './settings.js';

export const BG_MODES = ['network', 'stars', 'matrix', 'off'];

export function startBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, dpr, nodes, stars, drops, raf;
  const mouse = { x: -1e4, y: -1e4 };
  const mode = () => settings.get('bg') || 'network';

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25 * dpr,
      vy: (Math.random() - 0.5) * 0.25 * dpr,
      r: (Math.random() * 1.4 + 0.6) * dpr,
    }));
    stars = Array.from({ length: 220 }, () => ({ x: (Math.random() - 0.5) * w, y: (Math.random() - 0.5) * h, z: Math.random() * w }));
    drops = Array.from({ length: Math.ceil(w / (16 * dpr)) }, () => Math.random() * -50);
  }

  function network() {
    ctx.clearRect(0, 0, w, h);
    const link = 130 * dpr;
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 120 * dpr && d > 0) {
        n.x += (dx / d) * 0.6;
        n.y += (dy / d) * 0.6;
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          ctx.strokeStyle = `rgba(242,104,34,${(1 - d / link) * 0.22})`;
          ctx.lineWidth = dpr * 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,160,100,0.55)';
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // warp-speed starfield, steered a little by the mouse
  function starfield() {
    ctx.fillStyle = 'rgba(10,10,11,0.35)';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2 + (mouse.x > -1e3 ? (mouse.x - w / 2) * 0.15 : 0);
    const cy = h / 2 + (mouse.y > -1e3 ? (mouse.y - h / 2) * 0.15 : 0);
    for (const s of stars) {
      s.z -= 6 * dpr;
      if (s.z <= 1) (s.z = w), (s.x = (Math.random() - 0.5) * w), (s.y = (Math.random() - 0.5) * h);
      const k = (128 * dpr) / s.z;
      const x = cx + s.x * k, y = cy + s.y * k;
      const r = Math.max(0.4, (1 - s.z / w) * 2.4 * dpr);
      ctx.fillStyle = s.z < w / 3 ? '#ffb07a' : 'rgba(242,104,34,0.7)';
      ctx.fillRect(x, y, r, r);
    }
  }

  const GLYPHS = '01XMR<>[]{}#$%&*+=/|ɱ';
  function matrix() {
    ctx.fillStyle = 'rgba(10,10,11,0.12)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${14 * dpr}px ui-monospace, monospace`;
    for (let i = 0; i < drops.length; i++) {
      const y = drops[i] * 16 * dpr;
      ctx.fillStyle = Math.random() < 0.05 ? '#ffd2b0' : 'rgba(242,104,34,0.55)';
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * 16 * dpr, y);
      drops[i] += 0.5;
      if (y > h && Math.random() > 0.975) drops[i] = 0;
    }
  }

  let lastMode = null;
  function frame() {
    const m = document.documentElement.classList.contains('potato') ? 'off' : mode();
    if (m !== lastMode) {
      ctx.clearRect(0, 0, w, h);
      lastMode = m;
    }
    if (m === 'network') network();
    else if (m === 'stars') starfield();
    else if (m === 'matrix') matrix();
    raf = requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX * dpr;
    mouse.y = e.clientY * dpr;
  }, { passive: true });

  if (reduce) {
    network();
    return;
  }
  frame();
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
}
