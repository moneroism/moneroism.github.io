import { aboutWindow } from './about';
import { terminalWindow } from './terminal';
import { projectListWindow, projectDetailWindow } from './projects';
import { contactWindow } from './contact';
import { sysmonWindow } from './sysmon';
import { fingerprintWindow } from './fingerprint';
import { dmesgWindow } from './dmesg';
import { helpWindow } from './help';
import type { WinDef } from '@ui/wm/types';

export const windows = (): WinDef[] => [
  aboutWindow(),
  terminalWindow(),
  projectListWindow(),
  projectDetailWindow(),
  contactWindow(),
  sysmonWindow(),
  fingerprintWindow(),
  dmesgWindow(),
  helpWindow(),
];
