export interface Case {
  id: string;
  title: string;
  description: string;
  mount(container: HTMLElement): void;
  unmount?(container: HTMLElement): void;
}
