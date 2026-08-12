import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { ReactNode } from 'react';
import { UnnecessaryRerenders } from './demos/UnnecessaryRerenders';
import { ExpensiveRender } from './demos/ExpensiveRender';
import { UnstableProps } from './demos/UnstableProps';
import { UnvirtualizedList } from './demos/UnvirtualizedList';

function App(): ReactNode {
  return (
    <>
      <h2>React</h2>
      <p>
        Common React performance mistakes, each with the antipattern and its fix. Toggle
        &ldquo;Active&rdquo; to drive the work, flip &ldquo;Fix&rdquo; to apply the
        optimization, and watch the metrics and the FPS ball at the bottom respond.
      </p>
      <UnnecessaryRerenders />
      <ExpensiveRender />
      <UnstableProps />
      <UnvirtualizedList />
      <h2>How you'd fix these</h2>
      <ul>
        <li><strong>Re-renders:</strong> memoize children (<code>React.memo</code>) and keep their props stable.</li>
        <li><strong>Expensive work:</strong> cache it with <code>useMemo</code> keyed on its inputs.</li>
        <li><strong>Unstable props:</strong> stabilize objects/callbacks with <code>useMemo</code> / <code>useCallback</code>.</li>
        <li><strong>Big lists:</strong> virtualize (windowing) so only visible rows are in the DOM.</li>
      </ul>
    </>
  );
}

export function mountApp(container: HTMLElement): Root {
  const root = createRoot(container);
  root.render(<App />);
  return root;
}
