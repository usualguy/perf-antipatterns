import { memo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { burnMs, Section, Slider, Stat, Stats, Toggle, useTicker } from '../shared';

// Shared render counter (read by the parent, written by every child render).
const counter = { renders: 0 };

function ExpensiveItemImpl({ index, busyMs }: { index: number; busyMs: number }): ReactNode {
  counter.renders += 1;
  burnMs(busyMs);
  return <li>item #{index}</li>;
}
// The fix: memoized so it only re-renders when its own props change.
const ExpensiveItemMemo = memo(ExpensiveItemImpl);

export function UnnecessaryRerenders(): ReactNode {
  const [active, setActive] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [count, setCount] = useState(50);
  const [busyMs, setBusyMs] = useState(0.2);

  // Ticker bumps parent state ~10x/s; children don't depend on it, yet they
  // re-render every tick unless memoized.
  useTicker(active, 10);

  const start = useRef(counter.renders);
  // Reset the baseline whenever the knobs change so the "since start" count is honest.
  const key = `${active}-${fixed}-${count}-${busyMs}`;
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    start.current = counter.renders;
  }

  const Item = fixed ? ExpensiveItemMemo : ExpensiveItemImpl;
  const childRenders = counter.renders - start.current;

  return (
    <Section
      title="1. Unnecessary re-renders"
      lead="A parent state change re-renders children that don't depend on it. The classic React perf bug — fix by memoizing the children."
    >
      <div className="controls">
        <Toggle label="Active (tick 10x/s)" checked={active} onChange={setActive} />
        <Toggle label="Fix: React.memo children" checked={fixed} onChange={setFixed} />
      </div>
      <Slider label="Children" min={10} max={400} value={count} onChange={setCount} />
      <Slider
        label="Work per child"
        min={0}
        max={2}
        step={0.1}
        value={busyMs}
        format={(v) => `${v.toFixed(1)} ms`}
        onChange={setBusyMs}
      />
      <Stats>
        <Stat label="Child renders (since change)" value={childRenders.toLocaleString()} />
        <Stat label="Mode" value={fixed ? 'memoized' : 'unmemoized'} />
      </Stats>
      <ul style={{ display: 'none' }}>
        {Array.from({ length: count }, (_, i) => (
          <Item key={i} index={i} busyMs={busyMs} />
        ))}
      </ul>
    </Section>
  );
}
