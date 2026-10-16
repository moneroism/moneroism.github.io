declare module 'virtual:build-info' {
  const info: {
    version: string;
    commit: string;
    builtAt: string;
    node: string;
    mode: string;
  };
  export default info;
}
