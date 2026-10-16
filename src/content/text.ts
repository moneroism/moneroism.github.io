import { profile } from './profile';
import { projects, type Project } from './projects';
import { contact, donate } from './contact';

// plain-text renderings of the content, for the terminal. the windows render their own html.

const wrap = (s: string, w = 72): string => {
  const out: string[] = [];
  let line = '';
  for (const word of s.split(/\s+/)) {
    if (line && (line + ' ' + word).length > w) {
      out.push(line);
      line = word;
    } else line = line ? line + ' ' + word : word;
  }
  if (line) out.push(line);
  return out.join('\n');
};

export function aboutTxt(): string {
  const w = Math.max(...profile.principles.map(([k]) => k.length));
  return [
    profile.bio.map((p) => wrap(p)).join('\n\n'),
    'principles:\n' + profile.principles.map(([k, v]) => `  ${k.padEnd(w)}  ${v}`).join('\n'),
    profile.thisSite.join('\n'),
  ].join('\n\n');
}

export function projectMd(p: Project): string {
  const out = [`# ${p.name}`, '', p.summary, ''];
  const meta = [`lang: ${p.lang}`, `status: ${p.status}${p.version ? ' ' + p.version : ''}`];
  if (p.license) meta.push(`license: ${p.license}`);
  out.push(meta.join(' | '), p.url, '');
  for (const s of p.details) {
    switch (s.kind) {
      case 'p':
        out.push(wrap(s.text), '');
        break;
      case 'list':
        if (s.title) out.push(`## ${s.title}`, '');
        out.push(...s.items.map((i) => wrap('- ' + i, 72).replace(/\n/g, '\n  ')), '');
        break;
      case 'table': {
        if (s.title) out.push(`## ${s.title}`, '');
        const w = Math.max(...s.rows.map(([k]) => k.length));
        out.push(...s.rows.map(([k, v]) => `  ${k.padEnd(w)}  ${v}`), '');
        break;
      }
      case 'code':
        out.push(...s.text.split('\n').map((l) => '    ' + l), '');
        break;
    }
  }
  return out.join('\n').trimEnd();
}

export function contactTxt(): string {
  if (!contact.length) return '';
  const w = Math.max(...contact.map((c) => c.label.length));
  return contact.map((c) => `${c.label.padEnd(w)}  ${c.value}`).join('\n');
}

export function donateTxt(): string {
  const lines: string[] = [];
  if (donate.xmr) lines.push('xmr  ' + donate.xmr);
  for (const o of donate.other) lines.push(`${o.label}  ${o.value}`);
  return lines.join('\n');
}

export const projectList = () => projects;
