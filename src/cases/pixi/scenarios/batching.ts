import { Container, Graphics, Sprite } from 'pixi.js';
import type { Application, Texture } from 'pixi.js';
import type { Scenario } from '../types';

const COLORS = [0xff5b5b, 0x5b9dff, 0x5bff9d, 0xffd15b, 0xd15bff, 0x5b0000, 0x00d1ff];

export function createBatching(): Scenario {
  let app!: Application;
  const container = new Container();
  let sprites: Sprite[] = [];
  let vx: number[] = [];
  let vy: number[] = [];
  let uniqueTextures: Texture[] = [];
  let shared: Texture | null = null;
  let fixed = false;
  let count = 800;

  function circleTexture(color: number): Texture {
    const g = new Graphics().circle(9, 9, 9).fill(color);
    const tex = app.renderer.generateTexture(g);
    g.destroy();
    return tex;
  }

  function clear(): void {
    for (const s of sprites) s.destroy();
    for (const t of uniqueTextures) t.destroy(true);
    sprites = [];
    vx = [];
    vy = [];
    uniqueTextures = [];
    container.removeChildren();
  }

  function rebuild(): void {
    clear();
    const W = app.screen.width;
    const H = app.screen.height;
    if (!shared) shared = circleTexture(0xffffff);
    for (let i = 0; i < count; i++) {
      let s: Sprite;
      if (fixed) {
        // One shared base texture → all sprites batch into a single draw call.
        s = new Sprite(shared);
        s.tint = COLORS[i % COLORS.length];
      } else {
        // A unique base texture per sprite → the batch breaks, one draw call each.
        const tex = circleTexture(COLORS[i % COLORS.length]);
        uniqueTextures.push(tex);
        s = new Sprite(tex);
      }
      s.anchor.set(0.5);
      s.x = Math.random() * W;
      s.y = Math.random() * H;
      sprites.push(s);
      vx.push((Math.random() * 2 - 1) * 0.08);
      vy.push((Math.random() * 2 - 1) * 0.08);
      container.addChild(s);
    }
  }

  return {
    id: 'batching',
    label: 'Batching',
    title: 'Broken batching (many textures)',
    lead: 'Sprites drawn from many different base textures cannot be batched — each becomes its own draw call. Share one texture (tint for variety) so they batch into a single draw.',
    fixLabel: 'Fix: share one texture',
    fixed: false,
    sliders: [
      { key: 'count', label: 'Sprites', min: 100, max: 3000, step: 100, value: 800, format: (v) => v.toLocaleString() },
    ],

    build(a) {
      app = a;
      app.stage.addChild(container);
      rebuild();
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
      clear();
      shared?.destroy(true);
      shared = null;
      container.destroy({ children: true });
    },
    metrics() {
      return [
        { label: 'Sprites', value: count.toLocaleString() },
        { label: 'Base textures', value: fixed ? '1' : count.toLocaleString() },
      ];
    },
    setFixed(v) {
      fixed = v;
      this.fixed = v;
      rebuild();
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
