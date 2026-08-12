import type { Case } from './types';
import { cases } from './registry';

function parseId(): string {
  // Strip any `?query` so cases can carry their own params, e.g. #/memory-leak?dom=1
  return window.location.hash.replace(/^#\/?/, '').split('?')[0];
}

function resolveCase(id: string): Case {
  return cases.find((c) => c.id === id) ?? cases[0];
}

function routeKey(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

export function startRouter(container: HTMLElement, onChange: (active: Case) => void): void {
  let current: Case | null = null;
  let currentKey: string | null = null;

  const render = () => {
    // Re-mount when the full route (id + query) changes, so cases pick up
    // param changes like #/memory-leak?dom=1 even when the id is unchanged.
    const key = routeKey();
    if (key === currentKey) return;

    const next = resolveCase(parseId());
    if (current?.unmount) current.unmount(container);
    container.innerHTML = '';
    current = next;
    currentKey = key;
    next.mount(container);
    onChange(next);
  };

  window.addEventListener('hashchange', render);
  render();
}
