import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:build-info';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

function git(cmd: string): string | null {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

/**
 * exposes commit/date/version to the app as `virtual:build-info`.
 * used by uname, the boot log and /etc/os-release.
 */
export function buildInfo(version: string): Plugin {
  return {
    name: 'mnr:build-info',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      // GITHUB_SHA is set in actions, git might not be (shallow clone etc)
      const commit = (process.env.GITHUB_SHA ?? git('rev-parse HEAD') ?? 'unknown').slice(0, 7);
      const dirty = git('status --porcelain') ? '-dirty' : '';
      const info = {
        version,
        commit: commit + (commit === 'unknown' ? '' : dirty),
        builtAt: new Date().toISOString(),
        node: process.version,
        mode: process.env.NODE_ENV ?? 'development',
      };
      return `export default ${JSON.stringify(info)};`;
    },
  };
}
