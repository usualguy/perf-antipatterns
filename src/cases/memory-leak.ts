import type { Case } from '../types';

// ---- Leak stores (module scope) --------------------------------------------
// These deliberately live outside the case's mount/unmount lifecycle, so the
// retained memory survives navigating away — that is exactly the leak.
const leakedNodes: HTMLElement[] = []; // detached DOM subtrees + their listeners
const leakedIntervals: number[] = []; // uncleared timers, each retaining a buffer
const leakedCache: Float64Array[] = []; // unbounded cache that never releases

// Each Float64Array(500_000) is ~4 MB, so a step moves the heap visibly.
const CHUNK_LEN = 500_000;
const BYTES_PER_CHUNK = CHUNK_LEN * 8;

type LeakType = 'dom' | 'interval' | 'cache';

// Estimate the retained bytes for each leak type (for the stats table).
function estimatedBytes(): Record<LeakType, number> {
  return {
    // ~5000 nodes per subtree; rough per-node cost is hard to know, so estimate.
    dom: leakedNodes.length * 5000 * 200,
    interval: leakedIntervals.length * BYTES_PER_CHUNK,
    cache: leakedCache.length * BYTES_PER_CHUNK,
  };
}

function usedHeapBytes(): number | null {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize : null;
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// ---- Leak steps ------------------------------------------------------------
function leakDom(): void {
  const subtree = document.createElement('div');
  for (let i = 0; i < 5000; i++) {
    const child = document.createElement('div');
    child.textContent = 'leak';
    // A listener that closes over `subtree` keeps the whole tree reachable.
    child.addEventListener('click', () => void subtree);
    subtree.appendChild(child);
  }
  // Attach then detach: the nodes leave the document but stay referenced.
  document.body.appendChild(subtree);
  subtree.remove();
  leakedNodes.push(subtree);
}

function leakInterval(): void {
  const buffer = new Float64Array(CHUNK_LEN); // captured by the closure below
  const id = window.setInterval(() => {
    // Touch the buffer so it can't be optimized away; timer is never cleared.
    void buffer.length;
  }, 1000);
  leakedIntervals.push(id);
}

function leakCache(): void {
  leakedCache.push(new Float64Array(CHUNK_LEN));
}

// ---- Reset (the fix) -------------------------------------------------------
function freeAll(): void {
  for (const id of leakedIntervals) clearInterval(id);
  leakedIntervals.length = 0;
  leakedNodes.length = 0;
  leakedCache.length = 0;
}

let uiTimer = 0;

const memoryLeak: Case = {
  id: 'memory-leak',
  title: 'Memory Leak',
  description:
    'References that are never released keep memory alive forever. Detached DOM, uncleared timers, and unbounded caches all grow the heap until the tab slows or crashes.',

  mount(container) {
    container.innerHTML = `
      <h2>${memoryLeak.title}</h2>
      <p>${memoryLeak.description}</p>

      <section class="panel">
        <h3>Live JS heap</h3>
        <div class="heartbeat" id="heap">&mdash;</div>
        <p class="hint" id="heap-note">Updated continuously. Click <strong>Leak more</strong> and watch it climb; <strong>Reset</strong> frees the references so the GC can reclaim them.</p>
      </section>

      <div class="options">
        <label><input type="checkbox" id="leak-dom" checked /> Detached DOM + listeners</label>
        <label><input type="checkbox" id="leak-interval" checked /> Uncleared setInterval</label>
        <label><input type="checkbox" id="leak-cache" checked /> Unbounded cache</label>
      </div>

      <section class="controls">
        <button id="leak-more" type="button">Leak more</button>
        <button id="leak-reset" type="button">Reset (free)</button>
      </section>

      <table>
        <thead>
          <tr><th class="width-auto">Leak type</th><th>Retained</th><th>Est. MB</th></tr>
        </thead>
        <tbody>
          <tr><th>Detached DOM</th><td id="stat-dom-n"></td><td id="stat-dom-mb"></td></tr>
          <tr><th>setInterval</th><td id="stat-interval-n"></td><td id="stat-interval-mb"></td></tr>
          <tr><th>Cache</th><td id="stat-cache-n"></td><td id="stat-cache-mb"></td></tr>
        </tbody>
      </table>

      <h2>Why this is an antipattern</h2>
      <p>
        The garbage collector can only reclaim objects nothing references. A forgotten
        listener, a timer that keeps running, or a cache with no eviction all keep their
        data reachable &mdash; so the heap only grows.
      </p>
      <h2>How you'd fix it</h2>
      <ul>
        <li><strong>Detached DOM:</strong> remove listeners and drop node references on teardown.</li>
        <li><strong>Timers:</strong> pair every <code>setInterval</code> / <code>setTimeout</code> with <code>clearInterval</code> / <code>clearTimeout</code>.</li>
        <li><strong>Caches:</strong> bound them (LRU / max size) or key with <code>WeakMap</code> so entries release with their keys.</li>
      </ul>
    `;

    const heapEl = container.querySelector<HTMLDivElement>('#heap')!;
    const noteEl = container.querySelector<HTMLParagraphElement>('#heap-note')!;
    const domBox = container.querySelector<HTMLInputElement>('#leak-dom')!;
    const intervalBox = container.querySelector<HTMLInputElement>('#leak-interval')!;
    const cacheBox = container.querySelector<HTMLInputElement>('#leak-cache')!;
    const moreBtn = container.querySelector<HTMLButtonElement>('#leak-more')!;
    const resetBtn = container.querySelector<HTMLButtonElement>('#leak-reset')!;

    const stat = (id: string) => container.querySelector<HTMLTableCellElement>(id)!;
    const domN = stat('#stat-dom-n');
    const domMb = stat('#stat-dom-mb');
    const intervalN = stat('#stat-interval-n');
    const intervalMb = stat('#stat-interval-mb');
    const cacheN = stat('#stat-cache-n');
    const cacheMb = stat('#stat-cache-mb');

    const heapSupported = usedHeapBytes() !== null;
    if (!heapSupported) {
      noteEl.innerHTML =
        'Your browser does not expose <code>performance.memory</code> (Chrome only), so this shows the <em>estimated</em> leaked total instead. Behaviour is identical.';
    }

    const refresh = () => {
      const est = estimatedBytes();
      const heap = usedHeapBytes();
      heapEl.textContent = heap !== null
        ? `${mb(heap)} MB`
        : `~${mb(est.dom + est.interval + est.cache)} MB`;

      domN.textContent = String(leakedNodes.length);
      domMb.textContent = mb(est.dom);
      intervalN.textContent = String(leakedIntervals.length);
      intervalMb.textContent = mb(est.interval);
      cacheN.textContent = String(leakedCache.length);
      cacheMb.textContent = mb(est.cache);
    };

    moreBtn.addEventListener('click', () => {
      if (domBox.checked) leakDom();
      if (intervalBox.checked) leakInterval();
      if (cacheBox.checked) leakCache();
      refresh();
    });

    resetBtn.addEventListener('click', () => {
      freeAll();
      refresh();
    });

    refresh();
    uiTimer = window.setInterval(refresh, 300);
  },

  unmount() {
    // The UI refresh timer is well-behaved and cleaned up here.
    // The leak stores intentionally persist — use Reset to free them.
    clearInterval(uiTimer);
  },
};

export default memoryLeak;
