import { Graphics } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { Scenario } from '../types';

const COLORS = [0xff5b5b, 0x5b9dff, 0x5bff9d, 0xffd15b, 0xd15bff];

export function createGraphics(): Scenario {
  let app!: Application;
  const g = new Graphics();
  let fixed = false;
  let count = 1200;
  let t = 0;
  let rebuildMs = 0;

  function draw(): void {
    g.clear();
    const W = app.screen.width;
    const H = app.screen.height;
    const cols = Math.ceil(Math.sqrt(count * (W / H)));
    const rows = Math.ceil(count / cols);
    const dx = W / cols;
    const dy = H / rows;
    let i = 0;
    for (let r = 0; r < rows && i < count; r++) {
      for (let c = 0; c < cols && i < count; c++, i++) {
        const x = c * dx + dx / 2 + Math.sin(t + i) * 3;
        const y = r * dy + dy / 2 + Math.cos(t + i) * 3;
        g.circle(x, y, 3 + (i % 4)).fill(COLORS[i % COLORS.length]);
      }
    }
  }

  return {
    id: 'graphics',
    label: 'Graphics',
    title: 'Graphics rebuilt every frame',
    lead: 'Calling clear() and rebuilding the whole geometry every frame is expensive (CPU tessellation + GPU upload). Build it once and animate with a transform instead.',
    fixLabel: 'Fix: build once, transform',
    fixed: false,
    sliders: [
      { key: 'count', label: 'Shapes', min: 200, max: 4000, step: 100, value: 1200, format: (v) => v.toLocaleString() },
    ],

    build(a) {
      app = a;
      g.pivot.set(app.screen.width / 2, app.screen.height / 2);
      g.position.set(app.screen.width / 2, app.screen.height / 2);
      app.stage.addChild(g);
      draw();
    },
    update(dt) {
      t += dt * 0.003;
      if (fixed) {
        // Geometry is static; only the transform changes — no rebuild.
        rebuildMs = 0;
        g.rotation = Math.sin(t) * 0.06;
      } else {
        // Antipattern: tear down and rebuild all geometry every frame.
        const s = performance.now();
        draw();
        rebuildMs = performance.now() - s;
      }
    },
    destroy() {
      g.destroy();
    },
    metrics() {
      return [
        { label: 'Shapes', value: count.toLocaleString() },
        { label: 'Rebuild / frame', value: `${rebuildMs.toFixed(1)} ms` },
      ];
    },
    setFixed(v) {
      fixed = v;
      this.fixed = v;
      g.rotation = 0;
      draw(); // draw once for the fixed path (and refresh either way)
    },
    setSlider(k, v) {
      if (k === 'count') {
        count = v;
        this.sliders[0].value = v;
        draw();
      }
    },
  };
}
