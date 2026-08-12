import type { Case } from '../types';

// Naive recursive Fibonacci — intentionally O(2^n) with no memoization.
// This is the antipattern: a heavy CPU task run synchronously in one tick.
function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

let rafId = 0;

const blockingFibonacci: Case = {
  id: 'blocking-cpu',
  title: 'Blocking CPU',
  description:
    'A heavy synchronous computation runs in a single tick, freezing the main thread so the UI cannot paint or respond.',

  mount(container) {
    container.innerHTML = `
      <h2>${blockingFibonacci.title}</h2>
      <p>${blockingFibonacci.description}</p>

      <section class="panel">
        <h3>Live main-thread heartbeat</h3>
        <div class="heartbeat" id="heartbeat">0</div>
        <p class="hint">Updated every animation frame. Watch it freeze the moment you press Run &mdash; that stall is the blocked main thread.</p>
      </section>

      <section class="controls">
        <label for="fib-n">n =</label>
        <input id="fib-n" type="number" value="42" min="0" max="50" />
        <button id="fib-run" type="button">Run (blocking)</button>
      </section>

      <table id="fib-result" hidden>
        <tbody>
          <tr><th>Result</th><td id="fib-value"></td></tr>
          <tr><th>Elapsed</th><td><span id="fib-elapsed"></span> ms</td></tr>
        </tbody>
      </table>

      <h2>Why this is an antipattern</h2>
      <p>
        JavaScript runs on a single main thread shared with layout, paint, and input
        handling. A long synchronous task blocks all of them &mdash; the page appears frozen
        until it finishes.
      </p>
      <h2>How you'd fix it</h2>
      <ul>
        <li><strong>Memoize / better algorithm:</strong> iterative Fibonacci is O(n).</li>
        <li><strong>Chunk the work:</strong> break it across ticks with <code>setTimeout</code> / <code>requestIdleCallback</code>.</li>
        <li><strong>Offload it:</strong> run heavy compute in a Web Worker, off the main thread.</li>
      </ul>
    `;

    const heartbeat = container.querySelector<HTMLDivElement>('#heartbeat')!;
    const input = container.querySelector<HTMLInputElement>('#fib-n')!;
    const runBtn = container.querySelector<HTMLButtonElement>('#fib-run')!;
    const resultBox = container.querySelector<HTMLElement>('#fib-result')!;
    const valueEl = container.querySelector<HTMLSpanElement>('#fib-value')!;
    const elapsedEl = container.querySelector<HTMLSpanElement>('#fib-elapsed')!;

    let ticks = 0;
    const tick = () => {
      ticks += 1;
      heartbeat.textContent = String(ticks);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    runBtn.addEventListener('click', () => {
      const n = Number(input.value);
      const start = performance.now();
      const value = fib(n); // synchronous, blocks the main thread
      const elapsed = performance.now() - start;

      valueEl.textContent = value.toLocaleString();
      elapsedEl.textContent = elapsed.toFixed(1);
      resultBox.hidden = false;
    });
  },

  unmount() {
    cancelAnimationFrame(rafId);
  },
};

export default blockingFibonacci;
