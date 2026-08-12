import { Container, Graphics, Sprite } from 'pixi.js';
import type { Application, Texture } from 'pixi.js';
import type { Scenario } from '../types';

// The virtual field is SPREAD× the viewport on each axis, so most objects sit
// off-screen at any moment.
const SPREAD = 3;

export function createCulling(): Scenario {
  let app!: Application;
  const world = new Container();
  let sprites: Sprite[] = [];
  let vx: number[] = [];
  let vy: number[] = [];
  let tex: Texture | null = null;
  let fixed = false;
  let count = 6000;
  let onScreen = 0;

  function clear(): void {
    for (const s of sprites) s.destroy();
    sprites = [];
    vx = [];
    vy = [];
    world.removeChildren();
  }

  function rebuild(): void {
    clear();
    const W = app.screen.width;
    const H = app.screen.height;
    if (!tex) {
      const g = new Graphics().rect(0, 0, 8, 8).fill(0x5b9dff);
      tex = app.renderer.generateTexture(g);
      g.destroy();
    }
    for (let i = 0; i < count; i++) {
      const s = new Sprite(tex);
      // Spread across [-W, 2W] × [-H, 2H] — only ~1/9 is on-screen.
      s.x = Math.random() * W * SPREAD - W;
      s.y = Math.random() * H * SPREAD - H;
      sprites.push(s);
      vx.push((Math.random() * 2 - 1) * 0.05);
      vy.push((Math.random() * 2 - 1) * 0.05);
      world.addChild(s);
    }
  }

  return {
    id: 'culling',
    label: 'Culling',
    title: 'No off-screen culling',
    lead: 'Objects outside the viewport are still moved and submitted to the GPU every frame. Skip the ones off-screen — only draw what is visible.',
    fixLabel: 'Fix: cull off-screen',
    fixed: false,
    sliders: [
      { key: 'count', label: 'Objects', min: 1000, max: 20000, step: 1000, value: 6000, format: (v) => v.toLocaleString() },
    ],

    build(a) {
      app = a;
      app.stage.addChild(world);
      rebuild();
    },
    update(dt) {
      const W = app.screen.width;
      const H = app.screen.height;
      const loX = -W;
      const loY = -H;
      const span = SPREAD;
      let vis = 0;
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        let x = s.x + vx[i] * dt;
        let y = s.y + vy[i] * dt;
        if (x < loX) x += W * span;
        else if (x > loX + W * span) x -= W * span;
        if (y < loY) y += H * span;
        else if (y > loY + H * span) y -= H * span;
        s.x = x;
        s.y = y;
        const on = x >= -8 && x <= W && y >= -8 && y <= H;
        if (on) vis++;
        // The fix: hide off-screen sprites so they aren't rendered/batched.
        s.visible = fixed ? on : true;
      }
      onScreen = vis;
    },
    destroy() {
      clear();
      tex?.destroy(true);
      tex = null;
      world.destroy({ children: true });
    },
    metrics() {
      return [
        { label: 'Objects', value: count.toLocaleString() },
        { label: 'Rendered', value: (fixed ? onScreen : count).toLocaleString() },
      ];
    },
    setFixed(v) {
      fixed = v;
      this.fixed = v;
      if (!v) for (const s of sprites) s.visible = true;
    },
    setSlider(k, v) {
      if (k === 'count') {
        count = v;
        this.sliders[0].value = v;
        rebuild();
      }
    },
  };
}
