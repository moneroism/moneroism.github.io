export interface Config {
  site: {
    handle: string;
    hostname: string;
    title: string;
    repo: string;
  };
  features: {
    crt: boolean;
    debug: boolean;
  };
  wm: {
    mod: 'Alt' | 'Meta' | 'Control';
    mfact: number;
    tags: { id: number; name: string }[];
  };
  term: {
    historySize: number;
    prompt: string;
  };
  bar: {
    blocks: string[];
  };
}
