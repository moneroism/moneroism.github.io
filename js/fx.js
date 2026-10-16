// foreground effects: monero rain (squash + bounce), cursor pixel trail, click bursts, storm.
import { coinSprite } from './coin.js';
import { settings, isPotato, reducedMotion, toast } from './settings.js';

const ORANGES = ['#f26822', '#ff8a4c', '#c4501a', '#ffb07a', '#8a8a8f'];
const G = 1800; // px/s^2
const MAX_COINS = 70;
const MAX_PARTS = 500;

// other modules can listen in (sfx)
export const hooks = { bounce: null };
let gScale = 1;

export function initFx() {
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  const sprite = coinSprite(128);
  const main = document.querySelector('main');
  const coins = [];
  const parts = [];
  let W = 0, H = 0, dpr = 1;
  let last = performance.now();
  let rainTimer = 0;
  let stormUntil = 0;
  let shake = 0;
  let mx = -1e4, my = -1e4;
  let magnet = false;
  let emojiUntil = 0, emojiChar = '', emojiTimer = 0;
  addEventListener('pointermove', (e) => ((mx = e.clientX), (my = e.clientY)), { passive: true });

  // fps probe for auto potato
  let probeStart = 0, probeFrames = 0, probed = false;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }

  function coin(x, y, opts = {}) {
    if (coins.length >= MAX_COINS) coins.shift();
    const r = opts.r ?? 10 + Math.random() * 16;
    coins.push({
      x, y, r,
      vx: opts.vx ?? (Math.random() - 0.5) * 60,
      vy: opts.vy ?? 80 + Math.random() * 200,
      spin: Math.random() * Math.PI * 2,
      vs: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 6),
      tilt: (Math.random() - 0.5) * 0.6,
      squash: 0,
      bounces: 0,
      resting: 0,
      alpha: 1,
    });
  }

  function spark(x, y, n = 6, speed = 260, up = true) {
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAX_PARTS) parts.shift();
      const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random());
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 0.5 + Math.random() * 0.5,
        max: 1,
        size: 2 + Math.random() * 3,
        color: ORANGES[(Math.random() * ORANGES.length) | 0],
        g: 900,
      });
    }
  }

  function update(dt) {
    // spawn rain
    const storm = performance.now() < stormUntil;
    if ((settings.get('rain') || storm) && !document.hidden) {
      rainTimer -= dt;
      if (rainTimer <= 0) {
        coin(Math.random() * W, -40);
        rainTimer = storm ? 0.03 + Math.random() * 0.05 : 0.7 + Math.random() * 1.1;
      }
    }

    if (performance.now() < emojiUntil) {
      emojiTimer -= dt;
      if (emojiTimer <= 0) {
        emojiTimer = 0.04;
        parts.push({ x: Math.random() * W, y: -30, vx: (Math.random() - 0.5) * 40, vy: 100, life: 3, max: 3, size: 22 + Math.random() * 18, ch: emojiChar, g: 500 });
      }
    }

    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (magnet) {
        const dx = mx - c.x, dy = my - c.y, d = Math.max(30, Math.hypot(dx, dy));
        c.vx += (dx / d) * 4000 * dt;
        c.vy += (dy / d) * 4000 * dt - G * dt * 0.9;
        c.vx *= 0.97;
        c.vy *= 0.97;
        c.resting = 0;
      }
      c.vy += G * gScale * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.spin += c.vs * dt;
      c.squash *= Math.pow(0.0005, dt); // decays fast
      const floor = H - c.r;
      if (c.y > floor) {
        c.y = floor;
        if (c.vy > 220 && c.bounces < 3) {
          // splat
          c.squash = Math.min(0.65, c.vy / 1400);
          hooks.bounce?.(c.r, c.vy);
          spark(c.x, H - 2, 3 + ((c.vy / 300) | 0), c.vy * 0.35);
          c.vy = -c.vy * 0.42;
          c.vx *= 0.7;
          c.vs *= 0.5;
          c.bounces++;
        } else {
          c.vy = 0;
          c.vx *= 0.9;
          c.resting += dt;
        }
      }
      if (c.x < c.r || c.x > W - c.r) c.vx *= -1;
      if (c.resting > 0.4 || c.bounces >= 3) c.alpha -= dt * 1.6;
      if (c.alpha <= 0 || c.y < -300) coins.splice(i, 1);
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    shake *= Math.pow(0.02, dt);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (shake > 0.3) main.style.translate = `${(Math.random() - 0.5) * shake}px ${(Math.random() - 0.5) * shake}px`;
    else if (main.style.translate) main.style.translate = '';

    for (const c of coins) {
      // stretch while falling fast, squash on impact. anchored at the bottom of the coin
      const st = Math.min(0.3, Math.abs(c.vy) / 3500);
      const sx = (1 + c.squash) * (1 - st * 0.5);
      const sy = (1 - c.squash * 0.85) * (1 + st);
      const flip = Math.cos(c.spin);
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.alpha);
      ctx.translate(c.x, c.y + c.r);
      ctx.scale(sx, sy);
      ctx.translate(0, -c.r);
      ctx.rotate(c.tilt);
      // edge, visible when the coin is side-on
      ctx.fillStyle = '#9c3d0e';
      ctx.fillRect(-Math.max(1.5, c.r * 0.14 * (1 - Math.abs(flip))), -c.r * 0.96, Math.max(3, c.r * 0.28 * (1 - Math.abs(flip))), c.r * 1.92);
      ctx.scale(Math.max(0.06, Math.abs(flip)), 1);
      ctx.drawImage(sprite, -c.r, -c.r, c.r * 2, c.r * 2);
      ctx.restore();
    }

    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 2));
      if (p.ch) {
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.ch, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (isPotato() || reducedMotion()) {
      if (coins.length || parts.length) (coins.length = 0), (parts.length = 0), ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      update(dt);
      draw();
      probe(now);
    }
    requestAnimationFrame(frame);
  }

  function probe(now) {
    if (probed || document.hidden || document.documentElement.classList.contains('intro-running')) return;
    if (!probeStart) probeStart = now;
    probeFrames++;
    if (now - probeStart > 3000) {
      probed = true;
      const fps = (probeFrames * 1000) / (now - probeStart);
      if (fps < 28) {
        settings.set('potato', true);
        toast(`running at ${fps | 0}fps. potato mode enabled`);
      }
    }
  }

  // cursor pixel trail
  let lx = 0, ly = 0;
  addEventListener('pointermove', (e) => {
    if (!settings.get('trail') || isPotato() || e.pointerType === 'touch') return;
    if (Math.hypot(e.clientX - lx, e.clientY - ly) < 7) return;
    lx = e.clientX;
    ly = e.clientY;
    if (parts.length >= MAX_PARTS) parts.shift();
    parts.push({
      x: e.clientX, y: e.clientY,
      vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30,
      life: 0.6, max: 0.6, size: 2 + Math.random() * 3,
      color: ORANGES[(Math.random() * 4) | 0], g: 120,
    });
  }, { passive: true });

  // click: drop a coin where you click (not on links/buttons)
  addEventListener('click', (e) => {
    if (isPotato() || e.target.closest('a, button, input, .term')) return;
    coin(e.clientX, e.clientY, { vy: -300, r: 14 + Math.random() * 10 });
    spark(e.clientX, e.clientY, 8, 200, false);
  });

  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(frame);

  return {
    burst(x, y, n = 14) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const v = 500 + Math.random() * 500;
        coin(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v });
      }
      spark(x, y, 20, 400, false);
    },
    storm(ms = 6000) {
      stormUntil = performance.now() + ms;
      shake = 8;
    },
    shake(n = 10) {
      shake = n;
    },
    rainOf(ch, ms = 4000) {
      emojiChar = ch;
      emojiUntil = performance.now() + ms;
    },
    antigravity(ms = 4000) {
      gScale = -0.5;
      setTimeout(() => (gScale = 1), ms);
    },
    setMagnet(v) {
      magnet = v;
    },
    coin(x, y, opts) {
      coin(x, y, opts);
    },
  };
}
