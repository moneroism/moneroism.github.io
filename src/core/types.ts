import type { ThemeName } from '@/services/theme';

export type Layout = 'tile' | 'monocle';

export interface AppState {
  tag: number;
  theme: ThemeName;
  crt: boolean;
  layout: Layout;
  focused: string | null;
  project: string;
}

export interface AppEvents extends Record<string, unknown> {
  'wm:focus': { id: string };
  'wm:arrange': void;
  'term:exec': { line: string };
  'kernel:proc': { pid: number; name: string; state: ProcState };
}

export type ProcState = 'R' | 'S' | 'Z' | 'X';
