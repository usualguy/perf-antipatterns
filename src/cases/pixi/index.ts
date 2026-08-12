import type { Case } from '../../types';

// PixiJS (and this whole case) is code-split into its own chunk, loaded only
// when the PixiJS tab is opened.
const pixiCase: Case = {
  id: 'pixi',
  title: 'PixiJS',
  description: 'Common PixiJS performance mistakes, each with a toggleable fix.',

  mount(container) {
    let disposed = false;
    let dispose: (() => void) | null = null;
    container.textContent = 'Loading PixiJS…';
    import('./app').then(({ mountApp }) => {
      if (disposed) return;
      container.textContent = '';
      mountApp(container).then((d) => {
        if (disposed) d();
        else dispose = d;
      });
    });
    (container as HTMLElement & { __pixiDispose?: () => void }).__pixiDispose = () => {
      disposed = true;
      dispose?.();
      dispose = null;
    };
  },

  unmount(container) {
    const el = container as HTMLElement & { __pixiDispose?: () => void };
    el.__pixiDispose?.();
    delete el.__pixiDispose;
  },
};

export default pixiCase;
