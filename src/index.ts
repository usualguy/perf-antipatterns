import './styles.css';
import { cases } from './registry';
import { startRouter } from './router';

const app = document.getElementById('app')!;

app.innerHTML = `
  <table class="header">
    <tbody>
      <tr>
        <td class="width-auto" rowspan="3">
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
    </tbody>
  </table>
  <nav class="nav" id="case-list">
    ${cases
      .map((c) => `<a href="#/${c.id}" data-id="${c.id}">${c.title}</a>`)
      .join('')}
  </nav>
  <hr />
  <main id="content"></main>
  <footer class="ball-footer">
    <hr />
    <p class="ball-caption">
      Main-thread health &mdash; this ball animates on <code>requestAnimationFrame</code>,
      so it stutters or freezes exactly when the main thread is blocked or janky, on any
      case. <strong><span id="ball-fps">60</span> FPS</strong>
    </p>
    <pre class="ball-stage" id="ball-stage" aria-hidden="true"></pre>
  </footer>
`;

const content = document.getElementById('content')!;
const links = Array.from(app.querySelectorAll<HTMLAnchorElement>('#case-list a'));

startRouter(content, (active) => {
  for (const link of links) {
    link.classList.toggle('active', link.dataset.id === active.id);
  }
});

startBall(
  document.getElementById('ball-stage')!,
  document.getElementById('ball-fps')!,
);

// A global bouncing-ball indicator. Because it renders on requestAnimationFrame
// using wall-clock physics, a blocked main thread makes it freeze and then jump
// (frames lost), and jank makes it stutter — a live, honest FPS gauge.
function startBall(stage: HTMLElement, fpsEl: HTMLElement): void {
  const W = 48;
  const AIR_ROWS = 7; // ball rows 0 (top) .. AIR_ROWS (resting on the ground)
  const start = performance.now();
  let last = start;
  let fps = 60;

  const frame = (now: number) => {
    const dt = now - last;
    last = now;
    if (dt > 0) fps = fps * 0.9 + (1000 / dt) * 0.1;

    const t = (now - start) / 1000;
    const bounce = Math.abs(Math.sin(t * 3.2)); // 0 on ground, 1 at apex
    const row = Math.round(AIR_ROWS * (1 - bounce));
    const phase = (t % 5) / 5; // horizontal sweep, 5s there-and-back
    const tri = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const col = Math.round((W - 1) * tri);

    const lines: string[] = [];
    for (let r = 0; r <= AIR_ROWS; r++) {
      let line = '';
      for (let c = 0; c < W; c++) line += r === row && c === col ? '●' : ' ';
      lines.push(line);
    }
    lines.push('▔'.repeat(W)); // ground

    stage.textContent = lines.join('\n');
    fpsEl.textContent = String(Math.round(fps));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
