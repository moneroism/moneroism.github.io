// flashlight, liquid glass, and physics mode (the page falls apart and you can throw it around)
import { settings, isPotato, toast } from './settings.js';

const root = document.documentElement;

export function initMore(fx, eggs, sfx) {
  initFlashlight(eggs);
  initGlass(eggs);
  return { physics: initPhysics(fx, eggs, sfx) };
}

// ---------------------------------------------------------------- flashlight
function initFlashlight(eggs) {
  const el = document.createElement('div');
  el.className = 'flashlight';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0;
  const move = (cx, cy) => {
    tx = cx;
    ty = cy;
    if (!raf && settings.get('light')) raf = requestAnimationFrame(loop);
  };
  const loop = () => {
    x += (tx - x) * 0.25;
    y += (ty - y) * 0.25;
    el.style.setProperty('--lx', `${x}px`);
    el.style.setProperty('--ly', `${y}px`);
    raf = Math.hypot(tx - x, ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  addEventListener('pointermove', (e) => move(e.clientX, e.clientY), { passive: true });
  // flicker every now and then, batteries are cheap
  setInterval(() => {
    if (!settings.get('light') || Math.random() > 0.3) return;
    el.classList.add('flicker');
    setTimeout(() => el.classList.remove('flicker'), 400);
  }, 4000);
  const apply = () => root.classList.toggle('light', !!settings.get('light') && !isPotato());
  settings.on((k, v) => {
    apply();
    if (k === 'light' && v) {
      move(tx, ty);
      eggs.unlock('light');
    }
  });
  apply();
}

// ---------------------------------------------------------------- liquid glass
function initGlass(eggs) {
  const lens = document.createElement('div');
  lens.className = 'glass-lens';
  lens.setAttribute('aria-hidden', 'true');
  const blobs = document.createElement('div');
  blobs.className = 'blobs';
  blobs.setAttribute('aria-hidden', 'true');
  blobs.innerHTML = '<i></i><i></i><i></i>';
  document.body.append(blobs, lens);

  let x = -200, y = -200, tx = -200, ty = -200, vx = 0, vy = 0;
  addEventListener('pointermove', (e) => ((tx = e.clientX), (ty = e.clientY)), { passive: true });
  const loop = () => {
    if (root.classList.contains('glass')) {
      // springy follow, so it wobbles
      vx = (vx + (tx - x) * 0.08) * 0.78;
      vy = (vy + (ty - y) * 0.08) * 0.78;
      x += vx;
      y += vy;
      const speed = Math.min(0.35, Math.hypot(vx, vy) / 120);
      const ang = Math.atan2(vy, vx);
      lens.style.translate = `${x}px ${y}px`;
      lens.style.transform = `rotate(${ang}rad) scale(${1 + speed}, ${1 - speed * 0.6})`;
    }
    requestAnimationFrame(loop);
  };
  loop();

  const apply = () => root.classList.toggle('glass', !!settings.get('glass') && !isPotato());
  settings.on((k, v) => {
    apply();
    if (k === 'glass' && v) eggs.unlock('glass');
  });
  apply();
}

// ---------------------------------------------------------------- physics
const SEL = [
  '.nav-logo', '.nav nav > *', '.hero-logo', '.hero-title span', '.hero-sub', '.hero-cta .btn', '.scroll-hint',
  '.section-title', '.about-text p', '.card', '.contact-box', '.ticker', '.footer p', '.visitor',
].join(',');
const G = 2200;

function initPhysics(fx, eggs, sfx) {
  let active = false;
  let bodies = [];
  let raf = 0, last = 0;
  let dragging = null;
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'physics-reset';
  reset.textContent = '↺ put it back';
  reset.hidden = true;
  reset.addEventListener('click', () => stop());
  document.body.append(reset);

  function start() {
    if (active || isPotato()) return;
    active = true;
    root.classList.add('physics');
    reset.hidden = false;
    const H = innerHeight, W = innerWidth;
    bodies = [...document.querySelectorAll(SEL)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < H && r.left < W && r.right > 0)
      // skip things nested in other bodies (they'd double-move)
      .filter(({ el }, _, all) => !all.some((o) => o.el !== el && o.el.contains(el)))
      .map(({ el, r }) => ({
        el,
        ox: r.left + r.width / 2,
        oy: r.top + r.height / 2,
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        w: r.width,
        h: r.height,
        m: Math.max(1, (r.width * r.height) / 4000),
        vx: (Math.random() - 0.5) * 300,
        vy: -Math.random() * 400,
        a: 0,
        va: (Math.random() - 0.5) * 3,
      }));
    bodies.forEach((b) => {
      b.el.classList.add('phys');
      b.el.style.willChange = 'transform';
    });
    fx.shake(10);
    eggs.unlock('physics');
    last = performance.now();
    raf = requestAnimationFrame(step);
  }

  function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    reset.hidden = true;
    for (const b of bodies) {
      b.el.style.transition = 'transform 0.9s cubic-bezier(.2,.9,.2,1)';
      b.el.style.transform = '';
    }
    setTimeout(() => {
      for (const b of bodies) {
        b.el.classList.remove('phys');
        b.el.style.transition = '';
        b.el.style.willChange = '';
      }
      bodies = [];
      root.classList.remove('physics');
    }, 950);
  }

  function step(now) {
    if (!active) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    const W = innerWidth, H = innerHeight;

    for (const b of bodies) {
      if (b === dragging) continue;
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      b.va *= 0.995;
      const hw = b.w / 2, hh = b.h / 2;
      if (b.y + hh > H) {
        if (b.vy > 600) sfx?.blip(90 + 4000 / (b.m + 10), 0.05, 'triangle', Math.min(0.06, b.vy / 40000));
        b.y = H - hh;
        b.vy *= -0.3;
        b.vx *= 0.9;
        b.va *= 0.7;
        b.a *= 0.92; // settle flat-ish
        if (Math.abs(b.vy) < 30) b.vy = 0;
      }
      if (b.y - hh < 0) (b.y = hh), (b.vy *= -0.4);
      if (b.x - hw < 0) (b.x = hw), (b.vx *= -0.5);
      if (b.x + hw > W) (b.x = W - hw), (b.vx *= -0.5);
    }

    // aabb collisions, a few passes
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i], b = bodies[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const ox = (a.w + b.w) / 2 - Math.abs(dx);
          const oy = (a.h + b.h) / 2 - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          const ia = a === dragging ? 0 : 1 / a.m;
          const ib = b === dragging ? 0 : 1 / b.m;
          const sum = ia + ib || 1;
          if (ox < oy) {
            const s = Math.sign(dx) || 1;
            a.x -= s * ox * (ia / sum);
            b.x += s * ox * (ib / sum);
            const rv = b.vx - a.vx;
            if (rv * s < 0) {
              const imp = (-(1.2) * rv) / sum;
              a.vx -= imp * ia;
              b.vx += imp * ib;
            }
          } else {
            const s = Math.sign(dy) || 1;
            a.y -= s * oy * (ia / sum);
            b.y += s * oy * (ib / sum);
            const rv = b.vy - a.vy;
            if (rv * s < 0) {
              const imp = (-(1.25) * rv) / sum;
              a.vy -= imp * ia;
              b.vy += imp * ib;
              // friction + a bit of spin so stacks look less rigid
              const fr = (b.vx - a.vx) * 0.1;
              a.vx += fr * ia * a.m;
              b.vx -= fr * ib * b.m;
              a.va += (Math.random() - 0.5) * 0.2;
              b.va += (Math.random() - 0.5) * 0.2;
            }
          }
        }
      }
    }

    for (const b of bodies) {
      b.a = Math.max(-0.6, Math.min(0.6, b.a));
      b.el.style.transform = `translate(${b.x - b.ox}px, ${b.y - b.oy}px) rotate(${b.a}rad)`;
    }
    raf = requestAnimationFrame(step);
  }

  // grab and throw
  let px = 0, py = 0, pt = 0, gx = 0, gy = 0;
  addEventListener('pointerdown', (e) => {
    if (!active) return;
    const b = bodies.find((b) => b.el.contains(e.target));
    if (!b) return;
    e.preventDefault();
    dragging = b;
    gx = e.clientX - b.x;
    gy = e.clientY - b.y;
    px = e.clientX;
    py = e.clientY;
    pt = performance.now();
    b.vx = b.vy = 0;
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - pt) / 1000;
    dragging.vx = dragging.vx * 0.5 + ((e.clientX - px) / dt) * 0.5;
    dragging.vy = dragging.vy * 0.5 + ((e.clientY - py) / dt) * 0.5;
    px = e.clientX;
    py = e.clientY;
    pt = now;
    dragging.x = e.clientX - gx;
    dragging.y = e.clientY - gy;
    dragging.va = dragging.vx / 800;
  });
  addEventListener('pointerup', () => {
    if (!dragging) return;
    const b = dragging;
    b.vx = Math.max(-5000, Math.min(5000, b.vx));
    b.vy = Math.max(-5000, Math.min(5000, b.vy));
    if (Math.hypot(b.vx, b.vy) > 2800) {
      eggs.unlock('yeet');
      fx.shake(8);
    }
    dragging = null;
  });
  // don't follow links while things are flying around
  addEventListener('click', (e) => active && e.target.closest('.phys') && e.preventDefault(), true);
  addEventListener('keydown', (e) => e.key === 'Escape' && stop());
  document.querySelector('[data-physics]')?.addEventListener('click', () => (active ? stop() : start()));

  return { start, stop, toggle: () => (active ? stop() : start()), active: () => active };
}
