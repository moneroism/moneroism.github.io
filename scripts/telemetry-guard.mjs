#!/usr/bin/env node
// postbuild check: fail the build if anything in dist/ references a host that isn't allowlisted.
// it's dumb on purpose. regex over text files. false positives > false negatives.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ALLOWED = new Set([
  'github.com',
  'codeberg.org',
  'www.gnu.org',
  'www.w3.org', // svg xmlns, not a request
  'getmonero.org',
]);
const TEXT = new Set(['.html', '.js', '.css', '.svg', '.txt', '.json', '.xml', '.webmanifest']);
const URL_RE = /\bhttps?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi;

const root = process.argv[2] ?? 'dist';
let bad = 0;
let files = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (TEXT.has(extname(p))) check(p);
  }
}

function check(file) {
  files++;
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(URL_RE)) {
    const host = m[1].toLowerCase();
    if (!ALLOWED.has(host)) {
      bad++;
      const line = src.slice(0, m.index).split('\n').length;
      console.error(`  ${file}:${line}  ${m[0]}`);
    }
  }
}

try {
  walk(root);
} catch (e) {
  console.error(`telemetry-guard: can't read ${root}: ${e.message}`);
  process.exit(2);
}

if (bad) {
  console.error(`\ntelemetry-guard: ${bad} reference(s) to non-allowlisted hosts. fix it or allowlist it.`);
  process.exit(1);
}
console.log(`telemetry-guard: ${files} files, 0 unknown hosts. clean.`);
