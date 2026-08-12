import { memo, useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Section, Stat, Stats, Toggle, useTicker } from '../shared';

const counter = { renders: 0 };

// Memoized child — but memo only helps if its props keep the same identity.
const Child = memo(function Child(_props: {
  config: { theme: string };
  onClick: () => void;
}): ReactNode {
  counter.renders += 1;
  return null;
});

export function UnstableProps(): ReactNode {
  const [active, setActive] = useState(false);
  const [fixed, setFixed] = useState(false);
  useTicker(active, 10);

  // Antipattern: new object + new function every render → memo is defeated.
  // Fix: stabilize identity with useMemo / useCallback.
  const unstableConfig = { theme: 'dark' };
  const unstableOnClick = () => {};
  const stableConfig = useMemo(() => ({ theme: 'dark' }), []);
  const stableOnClick = useCallback(() => {}, []);

  const config = fixed ? stableConfig : unstableConfig;
  const onClick = fixed ? stableOnClick : unstableOnClick;

  const start = useRef(counter.renders);
  const key = `${active}-${fixed}`;
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    start.current = counter.renders;
  }
  const childRenders = counter.renders - start.current;

  return (
    <Section
      title="3. Unstable props defeat React.memo"
      lead="Passing a fresh object/array/function literal each render gives the memoized child new props every time, so it re-renders anyway. Stabilize with useMemo / useCallback."
    >
      <div className="controls">
        <Toggle label="Active (tick 10x/s)" checked={active} onChange={setActive} />
        <Toggle label="Fix: useMemo / useCallback" checked={fixed} onChange={setFixed} />
      </div>
      <Stats>
        <Stat label="Memo child renders (since change)" value={childRenders.toLocaleString()} />
        <Stat label="Props" value={fixed ? 'stable' : 'new each render'} />
      </Stats>
      <div style={{ display: 'none' }}>
        <Child config={config} onClick={onClick} />
      </div>
    </Section>
  );
}
