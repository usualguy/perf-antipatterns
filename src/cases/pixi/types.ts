import type { Application } from 'pixi.js';

export interface SliderDesc {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;
}

export interface Metric {
  label: string;
  value: string;
}

// A single "mistake" scenario. Only one runs at a time on the shared app.
export interface Scenario {
  id: string;
  label: string; // switcher button
  title: string; // explanation heading
  lead: string; // explanation text
  fixLabel: string; // label for the Fix toggle
  fixed: boolean;
  sliders: SliderDesc[];

  build(app: Application): void;
  update(dtMs: number): void;
  destroy(): void;
  metrics(): Metric[]; // scenario-specific stats (FPS is added by the shell)

  setFixed(v: boolean): void;
  setSlider(key: string, v: number): void;
}
