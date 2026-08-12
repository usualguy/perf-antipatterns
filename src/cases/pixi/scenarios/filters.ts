import { BlurFilter, Container, Graphics, Sprite } from 'pixi.js';
import type { Application, Texture } from 'pixi.js';
import type { Scenario } from '../types';

const COLORS = [0xff5b5b, 0x5b9dff, 0x5bff9d, 0xffd15b, 0xd15bff];
const SPRITES = 240;

export function createFilters(): Scenario {
  let app!: Application;
  const container = new Container();
  let sprites: Sprite[] = [];
  let vx: number[] = [];
  let vy: number[] = [];
  let tex: Texture | null = null;
  let blurs: BlurFilter[] = [];
  let fixed = false;
  let passes = 4;

  function build(): void {
    const W = app.screen.width;
    const H = app.screen.height;
    if (!tex) {
      const g = new Graphics().circle(12, 12, 12).fill(0xffffff);
      tex = app.renderer.generateTexture(g);
      g.destroy();
    }
    for (let i = 0; i < SPRITES; i++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.tint = COLORS[i % COLORS.length];
      s.x = Math.random() * W;
      s.y = Math.random() * H;
      sprites.push(s);
      vx.push((Math.random() * 2 - 1) * 0.06);
      vy.push((Math.random() * 2 - 1) * 0.06);
      container.addChild(s);
    }
  }

  function disposeBlurs(): void {
    for (const b of blurs) b.destroy();
    blurs = [];
  }

  function applyFilter(): void {
    disposeBlurs();
    if (fixed) {
      container.filters = [];
      return;
    }
    // Stack several full-screen blur passes over the whole container — each is a
    // separate multi-pass GPU render. Cost scales with the count: a GPU killer.
    for (let i = 0; i < passes; i++) blurs.push(new BlurFilter({ strength: 10, quality: 4 }));
    container.filters = blurs;
  }

  return {
    id: 'filters',
    label: 'Filters',
    title: 'Expensive filters',
    lead: 'Each filter runs full-screen GPU passes every frame; stacking them multiplies the cost. Filters are GPU killers — use few, at low strength, on small areas.',
    fixLabel: 'Fix: filters off',
    fixed: false,
    sliders: [
      { key: 'passes', label: 'Stacked blur filters', min: 1, max: 10, step: 1, value: 4 },
    ],

    build(a) {
      app = a;
      app.stage.addChild(container);
      build();
      applyFilter();
    },
    update(dt) {
      const W = app.screen.width;
      const H = app.screen.height;
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        s.x += vx[i] * dt;
        s.y += vy[i] * dt;
        if (s.x < 0 || s.x > W) vx[i] = -vx[i];
        if (s.y < 0 || s.y > H) vy[i] = -vy[i];
      }
    },
    destroy() {
      for (const s of sprites) s.destroy();
      sprites = [];
      tex?.destroy(true);
      tex = null;
      disposeBlurs();
      container.destroy({ children: true });
    },
    metrics() {
      return [
        { label: 'Sprites', value: SPRITES.toLocaleString() },
        { label: 'Filter passes', value: fixed ? 'off' : String(passes) },
      ];
    },
    setFixed(v) {
      fixed = v;
      this.fixed = v;
      applyFilter();
    },
    setSlider(k, v) {
      if (k === 'passes') {
        passes = v;
        this.sliders[0].value = v;
        applyFilter();
      }
    },
  };
}
