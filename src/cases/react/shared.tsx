import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Increments once per render (in a ref, so it never itself triggers a render).
export function useRenderCount(): number {
  const n = useRef(0);
  n.current += 1;
  return n.current;
}

// Bumps a counter on an interval while `active`, to drive re-renders. The
// component using it re-renders each tick, so it can read refs for metrics
// without any extra renders.
export function useTicker(active: boolean, hz: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), Math.round(1000 / hz));
    return () => clearInterval(id);
  }, [active, hz]);
  return tick;
}

// Busy-wait for roughly `ms` milliseconds (simulates expensive render work).
export function burnMs(ms: number): void {
  if (ms <= 0) return;
  const end = performance.now() + ms;
  // eslint-disable-next-line no-empty
  while (performance.now() < end) {
    /* spin */
  }
}

export function Section(props: {
  title: string;
  lead: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="demo">
      <h3>{props.title}</h3>
      <p className="hint">{props.lead}</p>
      {props.children}
    </section>
  );
}

export function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): ReactNode {
  return (
    <label className="inline-toggle">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />{' '}
      {props.label}
    </label>
  );
}

export function Slider(props: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}): ReactNode {
  const shown = props.format ? props.format(props.value) : String(props.value);
  return (
    <div className="slider-row">
      <label>
        {props.label}: {shown}
      </label>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Stats(props: { children: ReactNode }): ReactNode {
  return <section className="panel stats-row">{props.children}</section>;
}

export function Stat(props: { label: string; value: string }): ReactNode {
  return (
    <div>
      <div className="stat-num">{props.value}</div>
      <div className="stat-label">{props.label}</div>
    </div>
  );
}
