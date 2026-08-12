import './styles.css';
import { cases } from './registry';
import { startRouter } from './router';

const app = document.getElementById('app')!;

app.innerHTML = `
  <table class="header">
    <tbody>
      <tr>
        <td class="width-auto" rowspan="4">
          <h1 class="title">Perf Antipatterns</h1>
          <span class="subtitle">Interactive frontend performance antipatterns.</span>
        </td>
        <th class="width-min">Version</th>
        <td class="width-min">v0.1.0</td>
      </tr>
      <tr>
        <th class="width-min">Updated</th>
        <td class="width-min">2026-08-12</td>
      </tr>
      <tr>
        <th class="width-min">License</th>
        <td class="width-min">MIT</td>
      </tr>
      <tr>
        <th class="width-min">Source</th>
        <td class="width-min"><a href="https://github.com/usualguy/perf-antipatterns">GitHub</a></td>
      </tr>
    </tbody>
  </table>
  <nav class="nav" id="case-list">
    ${cases
      .map((c) => `<a href="#/${c.id}" data-id="${c.id}">${c.title}</a>`)
      .join('')}
  </nav>
  <hr />
  <main id="content"></main>
  <div class="fps-bar" aria-hidden="true">
    <canvas id="ball-canvas"></canvas>
    <span class="fps-badge"><span id="ball-fps">60</span> FPS &mdash; main-thread health</span>
  </div>
`;

const content = document.getElementById('content')!;
const links = Array.from(app.querySelectorAll<HTMLAnchorElement>('#case-list a'));

startRouter(content, (active) => {
  for (const link of links) {
    link.classList.toggle('active', link.dataset.id === active.id);
  }
});

startBall(
  document.getElementById('ball-canvas') as HTMLCanvasElement,
  document.getElementById('ball-fps')!,
);

interface BallColors {
  fg: string;
  dim: string;
}

function readColors(): BallColors {
  const cs = getComputedStyle(document.documentElement);
  return {
    fg: cs.getPropertyValue('--text-color').trim() || '#000',
    dim: cs.getPropertyValue('--text-color-alt').trim() || '#666',
  };
}

// A global bouncing-ball indicator drawn on a fixed <canvas>. It animates on
// requestAnimationFrame with wall-clock physics, so a blocked main thread makes
// it freeze then jump (frames lost) and jank makes it stutter — a live FPS gauge.
function startBall(canvas: HTMLCanvasElement, fpsEl: HTMLElement): void {
  const ctx = canvas.getContext('2d')!;
  let colors = readColors();
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => (colors = readColors()));

  let cssW = 0;
  let cssH = 0;
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    cssW = canvas.clientWidth;
    cssH = canvas.clientHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const start = performance.now();
  let last = start;
  let fps = 60;

  const frame = (now: number) => {
    const dt = now - last;
    last = now;
    if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1;

    const t = (now - start) / 1000;
    const r = Math.max(6, cssH * 0.16);
    const groundY = cssH - 5;
    const topY = r + 3;
    const restY = groundY - r;
    const bounce = Math.abs(Math.sin(t * 3.2)); // 0 on ground, 1 at apex
    const y = restY - (restY - topY) * bounce;
    const phase = (t % 6) / 6; // horizontal sweep, 6s there-and-back
    const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const x = r + (cssW - 2 * r) * tri;

    ctx.clearRect(0, 0, cssW, cssH);

    // Ground line.
    ctx.strokeStyle = colors.dim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 0.5);
    ctx.lineTo(cssW, groundY + 0.5);
    ctx.stroke();

    // Shadow: smaller and fainter as the ball rises.
    ctx.globalAlpha = 0.3 * (1 - bounce * 0.7);
    ctx.fillStyle = colors.dim;
    ctx.beginPath();
    ctx.ellipse(x, groundY, r * (1 - 0.4 * bounce), r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Ball.
    ctx.fillStyle = colors.fg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    fpsEl.textContent = String(Math.round(fps));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
