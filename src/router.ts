import type { Case } from './types';
import { cases } from './registry';

function parseId(): string {
  return window.location.hash.replace(/^#\/?/, '');
}

function resolveCase(id: string): Case {
  return cases.find((c) => c.id === id) ?? cases[0];
}

export function startRouter(container: HTMLElement, onChange: (active: Case) => void): void {
  let current: Case | null = null;

  const render = () => {
    const next = resolveCase(parseId());
    if (current === next) return;

    if (current?.unmount) current.unmount(container);
    container.innerHTML = '';
    current = next;
    next.mount(container);
    onChange(next);
  };

  window.addEventListener('hashchange', render);
  render();
}
