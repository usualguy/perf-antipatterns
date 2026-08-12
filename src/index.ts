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
    <canvas id="fps-canvas"></canvas>
    <span class="fps-badge"><span id="fps-value">60</span> FPS &mdash; main thread</span>
  </div>
`;

const content = document.getElementById('content')!;
const links = Array.from(app.querySelectorAll<HTMLAnchorElement>('#case-list a'));

startRouter(content, (active) => {
  for (const link of links) {
    link.classList.toggle('active', link.dataset.id === active.id);
  }
});

startFpsGraph(
  document.getElementById('fps-canvas') as HTMLCanvasElement,
  document.getElementById('fps-value')!,
);

interface GraphColors {
  fg: string;
  dim: string;
}

function readColors(): GraphColors {
  const cs = getComputedStyle(document.documentElement);
  return {
    fg: cs.getPropertyValue('--text-color').trim() || '#000',
    dim: cs.getPropertyValue('--text-color-alt').trim() || '#666',
  };
}

// A global scrolling FPS graph drawn on a fixed <canvas>. It samples the frame
// rate on every requestAnimationFrame, so a blocked main thread shows up as a
// gap/dip (frames lost) and jank as a lower, noisier line — a live FPS gauge.
function startFpsGraph(canvas: HTMLCanvasElement, fpsEl: HTMLElement): void {
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

  const MAX_FPS = 65; // top of the graph's y-scale (just above 60)
  const BAD_FPS = 30; // below this the line/badge turn red
  const RED = '#ff5b5b';
  const PAD = 4; // vertical padding
  const samples: number[] = []; // one instantaneous FPS per frame, newest last
  let last = performance.now();
  let ema = 60;

  const yFor = (fps: number) => {
    const clamped = Math.max(0, Math.min(MAX_FPS, fps));
    return cssH - PAD - (clamped / MAX_FPS) * (cssH - PAD * 2);
  };

  const frame = (now: number) => {
    const dt = now - last;
    last = now;
    const inst = dt > 0 ? 1000 / dt : 60;
    ema = ema * 0.9 + inst * 0.1;

    samples.push(inst);
    const cols = Math.max(2, Math.floor(cssW));
    while (samples.length > cols) samples.shift();
    const n = samples.length;
    const x0 = cssW - n; // newest on the right, oldest on the left

    ctx.clearRect(0, 0, cssW, cssH);

    // Reference gridlines at 30 and 60 fps.
    ctx.strokeStyle = colors.dim;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    for (const g of [30, 60]) {
      const y = Math.round(yFor(g)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssW, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (n > 1) {
      // Filled area under the curve.
      ctx.beginPath();
      ctx.moveTo(x0, cssH);
      for (let i = 0; i < n; i++) ctx.lineTo(x0 + i, yFor(samples[i]));
      ctx.lineTo(x0 + n - 1, cssH);
      ctx.closePath();
      ctx.fillStyle = colors.dim;
      ctx.globalAlpha = 0.18;
      ctx.fill();
      ctx.globalAlpha = 1;

      // The FPS line, drawn per-segment so dips below 30 fps turn red.
      ctx.lineWidth = 2;
      for (let i = 1; i < n; i++) {
        const bad = samples[i] < BAD_FPS || samples[i - 1] < BAD_FPS;
        ctx.strokeStyle = bad ? RED : colors.fg;
        ctx.beginPath();
        ctx.moveTo(x0 + i - 1, yFor(samples[i - 1]));
        ctx.lineTo(x0 + i, yFor(samples[i]));
        ctx.stroke();
      }

      // Current-value dot on the right edge.
      const cur = samples[n - 1];
      ctx.fillStyle = cur < BAD_FPS ? RED : colors.fg;
      ctx.beginPath();
      ctx.arc(cssW - 1, yFor(cur), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    fpsEl.textContent = String(Math.round(ema));
    fpsEl.style.color = ema < BAD_FPS ? RED : '';
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
