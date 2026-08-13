// FPS graph renderer that runs OFF the main thread. The main thread transfers
// an OffscreenCanvas here and posts one `tick` (frame delta) per rAF. This
// worker owns its own render loop, so when the main thread is blocked it keeps
// drawing — and shows the frame rate falling in real time (1000 / time-since-
// last-tick), instead of the whole graph freezing.

interface Colors {
  fg: string;
  dim: string;
}

const MAX_FPS = 65;
const BAD_FPS = 30;
const RED = '#ff5b5b';
const PAD = 4;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let cssW = 0;
let cssH = 0;
let dpr = 1;
let colors: Colors = { fg: '#000', dim: '#666' };

const samples: number[] = [];
let lastMainDt = 1000 / 60; // last reported main-thread frame delta
let lastTickAt = 0; // worker clock time of the last main-thread tick
let ema = 60;
let reportCounter = 0;

const g = globalThis as unknown as {
  postMessage(m: unknown): void;
  addEventListener(t: string, fn: (e: MessageEvent) => void): void;
};

function applySize(): void {
  if (!canvas || !ctx) return;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function yFor(fps: number): number {
  const c = Math.max(0, Math.min(MAX_FPS, fps));
  return cssH - PAD - (c / MAX_FPS) * (cssH - PAD * 2);
}

function render(): void {
  if (!ctx) return;
  const now = performance.now();
  const stall = now - lastTickAt;
  // The main thread can't be running faster than one frame per `stall` ms while
  // we're waiting for it, so its effective FPS is bounded by 1000 / stall.
  const fps = 1000 / Math.max(lastMainDt, stall);
  ema = ema * 0.9 + fps * 0.1;

  samples.push(fps);
  const cols = Math.max(2, Math.floor(cssW));
  while (samples.length > cols) samples.shift();
  const n = samples.length;
  const x0 = cssW - n;

  ctx.clearRect(0, 0, cssW, cssH);

  // Reference gridlines at 30 and 60 fps.
  ctx.strokeStyle = colors.dim;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (const gl of [30, 60]) {
    const y = Math.round(yFor(gl)) + 0.5;
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

    // The FPS line, per-segment so dips below 30 fps turn red.
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

  // Report the smoothed value for the badge a few times a second (best-effort;
  // the main thread only applies it when it isn't blocked).
  if (++reportCounter % 6 === 0) g.postMessage({ type: 'fps', value: Math.round(ema) });
}

g.addEventListener('message', (e: MessageEvent) => {
  const m = e.data as
    | { type: 'init'; canvas: OffscreenCanvas; cssW: number; cssH: number; dpr: number; colors: Colors }
    | { type: 'resize'; cssW: number; cssH: number; dpr: number }
    | { type: 'colors'; colors: Colors }
    | { type: 'tick'; dt: number };

  if (m.type === 'init') {
    canvas = m.canvas;
    ctx = canvas.getContext('2d');
    cssW = m.cssW;
    cssH = m.cssH;
    dpr = m.dpr;
    colors = m.colors;
    lastTickAt = performance.now();
    applySize();
    setInterval(render, 16);
  } else if (m.type === 'resize') {
    cssW = m.cssW;
    cssH = m.cssH;
    dpr = m.dpr;
    applySize();
  } else if (m.type === 'colors') {
    colors = m.colors;
  } else if (m.type === 'tick') {
    lastMainDt = m.dt > 0 ? m.dt : 1000 / 60;
    lastTickAt = performance.now();
  }
});
