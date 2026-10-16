import type { Kernel } from '@core/kernel';

export interface WinHandle {
  readonly id: string;
  readonly el: HTMLElement;
  readonly body: HTMLElement;
  setTitle(t: string): void;
  close(): void;
  isFocused(): boolean;
}

export interface WinDef {
  id: string;
  title: string;
  tag: number;
  /** position in the stack. lowest = master */
  order: number;
  /** extra class on the window element */
  cls?: string;
  create(k: Kernel, w: WinHandle): Node;
  onFocus?(): void;
  /** tag became visible / hidden. use to pause expensive stuff */
  onShow?(): void;
  onHide?(): void;
}

export interface Win {
  def: WinDef;
  handle: WinHandle;
  tag: number;
  closed: boolean;
  mounted: boolean;
}
