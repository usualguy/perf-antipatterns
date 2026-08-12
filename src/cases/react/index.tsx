import type { Root } from 'react-dom/client';
import type { Case } from '../../types';

// React (and this whole case) is code-split into its own chunk, loaded only
// when the React tab is opened — it doesn't bloat the other cases' bundle.
const reactCase: Case = {
  id: 'react',
  title: 'React',
  description: 'Common React performance mistakes, each with a toggleable fix.',

  mount(container) {
    let disposed = false;
    let root: Root | null = null;
    container.textContent = 'Loading React…';
    import('./app').then(({ mountApp }) => {
      if (disposed) return;
      container.textContent = '';
      root = mountApp(container);
    });
    // Stash the teardown so unmount (below) can reach it.
    (container as HTMLElement & { __reactDispose?: () => void }).__reactDispose = () => {
      disposed = true;
      root?.unmount();
      root = null;
    };
  },

  unmount(container) {
    const el = container as HTMLElement & { __reactDispose?: () => void };
    el.__reactDispose?.();
    delete el.__reactDispose;
  },
};

export default reactCase;
