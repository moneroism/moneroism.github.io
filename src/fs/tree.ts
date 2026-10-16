import buildInfo from 'virtual:build-info';
import { dir, file, Vfs } from './vfs';
import { aboutTxt, contactTxt, donateTxt, projectMd } from '@/content/text';
import { projects } from '@/content/projects';
import { formatBytes } from '@/utils/misc';

export interface TreeDeps {
  user: string;
  host: string;
  uptime: () => number;
  commands: () => string[];
  fps: () => number;
}

export const kernelVersion = () =>
  `6.18.0-hardened1-cig (${buildInfo.commit}) #1 SMP PREEMPT_DYNAMIC ${new Date(buildInfo.builtAt).toUTCString()}`;

export function buildVfs(d: TreeDeps): Vfs {
  const home = `/home/${d.user}`;
  const hexRand = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

  const root = dir(
    '',
    [
      dir(
        'home',
        [
          dir(d.user, [
            file('about.txt', aboutTxt),
            file('contact.txt', contactTxt),
            file('donate.txt', donateTxt),
            dir(
              'projects',
              projects.map((p) => file(`${p.id}.md`, () => projectMd(p))),
            ),
            file(
              '.plan',
              [
                '- ship cig 0.3.0 (first bare-metal install)',
                '- fill in contact.txt at some point',
                '- stop adding features to this website',
                '  (status: failing)',
              ].join('\n'),
            ),
            file(
              '.profile',
              ['export EDITOR=vi', 'export PAGER=less', `export PS1='\\u@\\h:\\w$ '`, '# no HISTFILE upload. obviously'].join(
                '\n',
              ),
            ),
            file('notes.txt', '', false),
          ]),
        ],
        true,
      ),
      dir(
        'etc',
        [
          file('hostname', d.host),
          file(
            'os-release',
            [
              'NAME="cig"',
              'ID=cig',
              `VERSION_ID=${buildInfo.version}`,
              `BUILD_ID=${buildInfo.commit}`,
              'PRETTY_NAME="cig (web edition)"',
              'HOME_URL="https://github.com/moneroism/cig"',
            ].join('\n'),
          ),
          file('motd', `welcome to ${d.host}. type 'help'. nothing you do here leaves this tab.`),
          file('shells', '/bin/msh'),
          file('doas.conf', `# it's a website. nobody gets root.\ndeny ${d.user} as root`),
        ],
        true,
      ),
      dir(
        'proc',
        [
          file('uptime', () => `${(d.uptime() / 1000).toFixed(2)} 0.00`),
          file('version', () => `Linux version ${kernelVersion()}`),
          file('loadavg', () => {
            // "load" = how far below 60fps we are. it's not real load. nothing here is real
            const l = Math.max(0, (60 - d.fps()) / 60).toFixed(2);
            return `${l} ${l} ${l} 1/${d.commands().length} 1`;
          }),
          file('cpuinfo', () => {
            const n = navigator.hardwareConcurrency || 1;
            return Array.from({ length: n }, (_, i) => `processor\t: ${i}\nmodel name\t: your cpu (we didn't ask)`).join(
              '\n\n',
            );
          }),
          file('meminfo', () => {
            const m = performance.memory;
            if (!m) return 'MemTotal: unknown (your browser doesn\'t say. good.)';
            return `HeapUsed:  ${formatBytes(m.usedJSHeapSize)}\nHeapTotal: ${formatBytes(m.totalJSHeapSize)}\nHeapLimit: ${formatBytes(m.jsHeapSizeLimit)}`;
          }),
        ],
        true,
      ),
      dir('dev', [file('null', ''), file('random', hexRand), file('urandom', hexRand)], true),
      dir('bin', [], true),
      dir(
        'usr',
        [dir('share', [dir('doc', [dir('telemetry', [file('README', 'there is no telemetry.\n\nthat\'s the whole document.')])])])],
        true,
      ),
      dir('tmp'),
    ],
    true,
  );

  // /bin is populated lazily since commands register after the fs is built
  const bin = root.children.get('bin')!;
  const fs = new Vfs(root, home);
  const origList = fs.list.bind(fs);
  // HACK: refresh /bin on every list. cheaper than wiring an event for it
  fs.list = (abs: string) => {
    if (abs === '/bin' && bin.type === 'dir') {
      bin.children = new Map(d.commands().map((c) => [c, file(c, `#!/bin/msh\n# builtin: ${c}`)]));
    }
    return origList(abs);
  };
  return fs;
}
