import type { Case } from '../types';

// ---- Leak stores (module scope) --------------------------------------------
// These deliberately live outside the case's mount/unmount lifecycle, so the
// retained memory survives navigating away — that is exactly the leak.
const leakedNodes: HTMLElement[] = []; // detached DOM subtrees + their listeners
const leakedIntervals: number[] = []; // uncleared timers, each retaining a buffer
const leakedCache: Float64Array[] = []; // unbounded cache that never releases

// Each detached subtree is one root + this many children, one listener each.
const CHILDREN_PER_SUBTREE = 5000;
const NODES_PER_SUBTREE = CHILDREN_PER_SUBTREE + 1;

// Each Float64Array(500_000) is exactly 4 MB, so a step moves the heap visibly.
const CHUNK_LEN = 500_000;
const BYTES_PER_CHUNK = CHUNK_LEN * 8;

type LeakType = 'dom' | 'interval' | 'cache';

// Which leak types start checked. Default: all off. Opt in via URL params on the
// hash route, e.g. #/memory-leak?dom=1&cache=1 (or `all=1` for every type).
function initialSelection(): Record<LeakType, boolean> {
  const query = window.location.hash.split('?')[1] ?? '';
  const params = new URLSearchParams(query);
  const on = (key: string): boolean =>
    ['1', 'true', 'on', 'yes'].includes((params.get(key) ?? '').toLowerCase());
  const all = on('all');
  return {
    dom: all || on('dom'),
    interval: all || on('interval'),
    cache: all || on('cache'),
  };
}

// Exact counters, computed from what the demo actually retains. Unlike the
// browser heap below, these are precise and match what you'd see in the
// DevTools Performance monitor (DOM Nodes / JS event listeners).
interface Metrics {
  nodes: number;
  listeners: number;
  timers: number;
  bufferBytes: number; // exact: only Float64Arrays we allocated
  heapBytes: number | null; // approximate, browser-reported, may be null
}

function metrics(): Metrics {
  const subtrees = leakedNodes.length;
  return {
    nodes: subtrees * NODES_PER_SUBTREE,
    listeners: subtrees * CHILDREN_PER_SUBTREE,
    timers: leakedIntervals.length,
    bufferBytes: (leakedIntervals.length + leakedCache.length) * BYTES_PER_CHUNK,
    heapBytes: usedHeapBytes(),
  };
}

// performance.memory is non-standard, deprecated, and quantized for privacy —
// it lags and will NOT match DevTools. Shown only as a rough trend.
function usedHeapBytes(): number | null {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize : null;
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function count(n: number): string {
  return n.toLocaleString();
}

// ---- Leak steps ------------------------------------------------------------
function leakDom(): void {
  const subtree = document.createElement('div');
  for (let i = 0; i < CHILDREN_PER_SUBTREE; i++) {
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

      <section class="panel stats-row">
        <div><div class="stat-num" id="m-nodes">0</div><div class="stat-label">Detached nodes</div></div>
        <div><div class="stat-num" id="m-listeners">0</div><div class="stat-label">Listeners</div></div>
        <div><div class="stat-num" id="m-timers">0</div><div class="stat-label">Timers</div></div>
        <div><div class="stat-num" id="m-buffers">0.0</div><div class="stat-label">Buffer MB</div></div>
      </section>
      <p class="hint" id="heap-note">
        These are counted exactly from what the demo retains &mdash; they match the DevTools
        Performance monitor. Browser heap (<code>performance.memory</code>):
        <span id="m-heap">&mdash;</span>, shown only as a rough trend &mdash; it is deprecated
        and quantized, so it lags and will not match the DevTools Memory panel.
      </p>

      <div class="options">
        <label><input type="checkbox" id="leak-dom" /> Detached DOM + listeners</label>
        <label><input type="checkbox" id="leak-interval" /> Uncleared setInterval</label>
        <label><input type="checkbox" id="leak-cache" /> Unbounded cache</label>
        <p class="hint">Preselect via URL, e.g. <code>#/memory-leak?dom=1&amp;cache=1</code> (<code>all=1</code> for every type).</p>
      </div>

      <section class="controls">
        <button id="leak-more" type="button">Leak more</button>
        <button id="leak-reset" type="button">Reset (free)</button>
      </section>

      <table>
        <thead>
          <tr><th class="width-auto">Leak type</th><th>Steps</th><th>Retained</th></tr>
        </thead>
        <tbody>
          <tr><th>Detached DOM</th><td id="stat-dom-n">0</td><td id="stat-dom-detail">&mdash;</td></tr>
          <tr><th>setInterval</th><td id="stat-interval-n">0</td><td id="stat-interval-detail">&mdash;</td></tr>
          <tr><th>Cache</th><td id="stat-cache-n">0</td><td id="stat-cache-detail">&mdash;</td></tr>
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

    const el = <T extends HTMLElement>(sel: string): T =>
      container.querySelector<T>(sel)!;

    const mNodes = el<HTMLDivElement>('#m-nodes');
    const mListeners = el<HTMLDivElement>('#m-listeners');
    const mTimers = el<HTMLDivElement>('#m-timers');
    const mBuffers = el<HTMLDivElement>('#m-buffers');
    const mHeap = el<HTMLSpanElement>('#m-heap');

    const domBox = el<HTMLInputElement>('#leak-dom');
    const intervalBox = el<HTMLInputElement>('#leak-interval');
    const cacheBox = el<HTMLInputElement>('#leak-cache');
    const moreBtn = el<HTMLButtonElement>('#leak-more');
    const resetBtn = el<HTMLButtonElement>('#leak-reset');

    const domN = el<HTMLTableCellElement>('#stat-dom-n');
    const domDetail = el<HTMLTableCellElement>('#stat-dom-detail');
    const intervalN = el<HTMLTableCellElement>('#stat-interval-n');
    const intervalDetail = el<HTMLTableCellElement>('#stat-interval-detail');
    const cacheN = el<HTMLTableCellElement>('#stat-cache-n');
    const cacheDetail = el<HTMLTableCellElement>('#stat-cache-detail');

    const selection = initialSelection();
    domBox.checked = selection.dom;
    intervalBox.checked = selection.interval;
    cacheBox.checked = selection.cache;

    const refresh = () => {
      const m = metrics();
      mNodes.textContent = count(m.nodes);
      mListeners.textContent = count(m.listeners);
      mTimers.textContent = count(m.timers);
      mBuffers.textContent = mb(m.bufferBytes);
      mHeap.textContent = m.heapBytes !== null ? `${mb(m.heapBytes)} MB` : 'unavailable';

      domN.textContent = count(leakedNodes.length);
      domDetail.textContent = `${count(m.nodes)} nodes, ${count(m.listeners)} listeners`;
      intervalN.textContent = count(leakedIntervals.length);
      intervalDetail.textContent = `${mb(leakedIntervals.length * BYTES_PER_CHUNK)} MB`;
      cacheN.textContent = count(leakedCache.length);
      cacheDetail.textContent = `${mb(leakedCache.length * BYTES_PER_CHUNK)} MB`;
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
