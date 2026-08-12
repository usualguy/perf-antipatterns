import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Section, Slider, Stat, Stats, Toggle, useRenderCount, useTicker } from '../shared';

// A deliberately costly, un-cheatable computation.
function expensiveCompute(size: number): number {
  const arr = new Float64Array(size);
  for (let i = 0; i < size; i++) arr[i] = (i * 2654435761) % 100000;
  arr.sort();
  return arr[(size / 2) | 0];
}

export function ExpensiveRender(): ReactNode {
  const [active, setActive] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [size, setSize] = useState(60000);
  useTicker(active, 15);
  const renders = useRenderCount();

  // `ms` is set only when work actually runs this render.
  let ms = 0;
  const memoized = useMemo(() => {
    const t = performance.now();
    const r = expensiveCompute(size);
    ms = performance.now() - t;
    return r;
  }, [size]);

  let result: number;
  if (fixed) {
    result = memoized; // cached: `ms` stays 0 unless `size` changed this render
  } else {
    const t = performance.now();
    result = expensiveCompute(size); // runs on EVERY render
    ms = performance.now() - t;
  }
  void result;

  return (
    <Section
      title="2. Expensive work in render, no useMemo"
      lead="A costly computation runs on every render instead of being cached. Wrap it in useMemo keyed on its inputs."
    >
      <div className="controls">
        <Toggle label="Active (tick 15x/s)" checked={active} onChange={setActive} />
        <Toggle label="Fix: useMemo" checked={fixed} onChange={setFixed} />
      </div>
      <Slider
        label="Work size"
        min={10000}
        max={300000}
        step={10000}
        value={size}
        format={(v) => `${(v / 1000).toFixed(0)}k`}
        onChange={setSize}
      />
      <Stats>
        <Stat label="Work this render" value={`${ms.toFixed(1)} ms`} />
        <Stat label="Renders" value={renders.toLocaleString()} />
      </Stats>
    </Section>
  );
}
