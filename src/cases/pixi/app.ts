import { Application } from 'pixi.js';
import type { Scenario } from './types';
import { createBatching } from './scenarios/batching';
import { createCulling } from './scenarios/culling';
import { createGraphics } from './scenarios/graphics';
import { createFilters } from './scenarios/filters';

export async function mountApp(container: HTMLElement): Promise<() => void> {
  container.innerHTML = `
    <h2>PixiJS</h2>
    <p>
      Common PixiJS mistakes that tank the frame rate. Pick a scenario, flip
      &ldquo;Fix&rdquo; to apply the optimization, and drag the slider &mdash; watch the
      canvas FPS and the ball at the bottom.
    </p>
    <div class="scenario-nav" id="pixi-nav"></div>
    <div class="pixi-canvas" id="pixi-holder"></div>
    <section class="panel stats-row" id="pixi-metrics">
      <div><div class="stat-num" id="pm-0">0</div><div class="stat-label" id="pl-0">FPS</div></div>
      <div><div class="stat-num" id="pm-1">0</div><div class="stat-label" id="pl-1">&mdash;</div></div>
      <div><div class="stat-num" id="pm-2">0</div><div class="stat-label" id="pl-2">&mdash;</div></div>
    </section>
    <div id="pixi-controls"></div>
    <div id="pixi-explain"></div>
    <h2>How you'd fix these</h2>
    <ul>
      <li><strong>Batching:</strong> share one texture / atlas (tint for variety) so sprites batch into one draw call.</li>
      <li><strong>Culling:</strong> skip rendering objects outside the viewport.</li>
      <li><strong>Graphics:</strong> build geometry once and animate with a transform, not clear()+redraw.</li>
      <li><strong>Filters:</strong> use them sparingly &mdash; low strength, small areas; cache static results.</li>
    </ul>
  `;

  const holder = container.querySelector<HTMLDivElement>('#pixi-holder')!;
  const navEl = container.querySelector<HTMLDivElement>('#pixi-nav')!;
  const controlsEl = container.querySelector<HTMLDivElement>('#pixi-controls')!;
  const explainEl = container.querySelector<HTMLDivElement>('#pixi-explain')!;
  const num = (i: number) => container.querySelector<HTMLDivElement>(`#pm-${i}`)!;
  const lab = (i: number) => container.querySelector<HTMLDivElement>(`#pl-${i}`)!;

  const width = Math.min(container.clientWidth || 600, 640);
  const height = 340;

  const app = new Application();
  await app.init({ width, height, background: 0x0b0d10, antialias: false, resolution: 1 });
  holder.appendChild(app.canvas);

  const scenarios: Scenario[] = [
    createBatching(),
    createCulling(),
    createGraphics(),
    createFilters(),
  ];
  let current: Scenario | null = null;

  function renderControls(s: Scenario): void {
    controlsEl.innerHTML = '';
    const fixWrap = document.createElement('label');
    fixWrap.className = 'inline-toggle';
    const fix = document.createElement('input');
    fix.type = 'checkbox';
    fix.checked = s.fixed;
    fix.addEventListener('change', () => s.setFixed(fix.checked));
    fixWrap.append(fix, document.createTextNode(' ' + s.fixLabel));
    const controls = document.createElement('div');
    controls.className = 'controls';
    controls.appendChild(fixWrap);
    controlsEl.appendChild(controls);

    for (const sl of s.sliders) {
      const row = document.createElement('div');
      row.className = 'slider-row';
      const label = document.createElement('label');
      const shown = () => (sl.format ? sl.format(sl.value) : String(sl.value));
      label.textContent = `${sl.label}: ${shown()}`;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(sl.min);
      input.max = String(sl.max);
      input.step = String(sl.step);
      input.value = String(sl.value);
      input.addEventListener('input', () => {
        const v = Number(input.value);
        s.setSlider(sl.key, v);
        label.textContent = `${sl.label}: ${shown()}`;
      });
      row.append(label, input);
      controlsEl.appendChild(row);
    }
  }

  function renderNav(): void {
    navEl.innerHTML = '';
    for (const s of scenarios) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = s.label;
      btn.classList.toggle('active', s === current);
      btn.addEventListener('click', () => select(s));
      navEl.appendChild(btn);
    }
  }

  function select(s: Scenario): void {
    if (current === s) return;
    current?.destroy();
    app.stage.removeChildren();
    current = s;
    s.build(app);
    renderNav();
    renderControls(s);
    explainEl.innerHTML = `<h3>${s.title}</h3><p class="hint">${s.lead}</p>`;
  }

  const tick = () => {
    if (!current) return;
    current.update(app.ticker.deltaMS);
    num(0).textContent = String(Math.round(app.ticker.FPS));
    lab(0).textContent = 'FPS';
    const ms = current.metrics();
    for (let i = 0; i < 2; i++) {
      num(i + 1).textContent = ms[i]?.value ?? '—';
      lab(i + 1).textContent = ms[i]?.label ?? '—';
    }
  };
  app.ticker.add(tick);

  select(scenarios[0]);

  return () => {
    app.ticker.remove(tick);
    current?.destroy();
    current = null;
    app.destroy({ removeView: true }, { children: true, texture: true });
  };
}
