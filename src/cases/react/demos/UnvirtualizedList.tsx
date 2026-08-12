import { useState } from 'react';
import type { ReactNode } from 'react';
import { Section, Slider, Stat, Stats, Toggle } from '../shared';

const ROW_H = 22;
const VIEW_H = 220;
const WINDOW = Math.ceil(VIEW_H / ROW_H) + 3;

export function UnvirtualizedList(): ReactNode {
  const [fixed, setFixed] = useState(false);
  const [count, setCount] = useState(8000);
  const [scrollTop, setScrollTop] = useState(0);

  let body: ReactNode;
  let rowsInDom: number;

  if (fixed) {
    // Virtualized: render only the visible window, absolutely positioned
    // inside a full-height spacer.
    const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - 1);
    const endIdx = Math.min(count, startIdx + WINDOW);
    const slice: ReactNode[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      slice.push(
        <div key={i} className="vrow" style={{ position: 'absolute', top: i * ROW_H, height: ROW_H }}>
          row #{i}
        </div>,
      );
    }
    rowsInDom = slice.length;
    body = <div style={{ height: count * ROW_H, position: 'relative' }}>{slice}</div>;
  } else {
    // Antipattern: every row is in the DOM at once.
    const all: ReactNode[] = [];
    for (let i = 0; i < count; i++) {
      all.push(
        <div key={i} className="vrow" style={{ height: ROW_H }}>
          row #{i}
        </div>,
      );
    }
    rowsInDom = count;
    body = <>{all}</>;
  }

  return (
    <Section
      title="4. Huge unvirtualized list"
      lead="Rendering thousands of rows puts them all in the DOM — slow to mount and janky to scroll. Virtualize: render only the rows in view."
    >
      <div className="controls">
        <Toggle label="Fix: virtualize (windowing)" checked={fixed} onChange={setFixed} />
      </div>
      <Slider
        label="Rows"
        min={1000}
        max={20000}
        step={1000}
        value={count}
        format={(v) => v.toLocaleString()}
        onChange={setCount}
      />
      <Stats>
        <Stat label="Rows in DOM" value={rowsInDom.toLocaleString()} />
        <Stat label="Total rows" value={count.toLocaleString()} />
      </Stats>
      <div
        className="vlist"
        style={{ height: VIEW_H, overflow: 'auto' }}
        onScroll={(e) => {
          if (fixed) setScrollTop((e.target as HTMLDivElement).scrollTop);
        }}
      >
        {body}
      </div>
    </Section>
  );
}
