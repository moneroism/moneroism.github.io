import './styles/main.scss';
import { Kernel } from '@core/kernel';
import { loadConfig } from '@/config';
import { createPrefs, PREFS, storageModule } from '@/services/storage';
import { initialTheme, themeModule } from '@/services/theme';
import { keysModule } from '@/services/keys';
import { routerModule } from '@/services/router';
import { perfModule } from '@/services/perf';
import { createWmModule } from '@ui/wm/wm';
import { barModule } from '@ui/bar/bar';
import { windows } from '@ui/windows';
import { projects } from '@/content/projects';

const config = loadConfig();
// prefs have to exist before the kernel so the initial state can come from them
const prefs = createPrefs();

const kernel = new Kernel(config, {
  tag: 1,
  theme: initialTheme(prefs.get('theme', null)),
  crt: config.features.crt && prefs.get('crt', false),
  layout: 'tile',
  focused: null,
  project: projects[0]!.id,
});
kernel.container.value(PREFS, prefs);

kernel
  .use(storageModule)
  .use(themeModule)
  .use(keysModule)
  .use(routerModule)
  .use(perfModule)
  .use(createWmModule(windows()))
  .use(barModule);

kernel.boot().catch((e) => {
  // critical module died. show something instead of a blank page
  document.body.textContent = `kernel panic: ${(e as Error).message}`;
  console.error(e);
});

if (config.features.debug) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__kernel = kernel;
}
