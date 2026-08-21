#!/usr/bin/env node
// The `scaffold` layer's verify command: `node tools/generators/verify-scaffold.mjs {module}`.
// Structural check only — does the generated shape exist and parse. The
// `logic` layer's `tsc --noEmit` is what actually checks the code.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = join(HERE, '..', '..');

const [, , name] = process.argv;

function fail(message) {
  console.error(`scaffold verify failed for "${name}": ${message}`);
  process.exit(1);
}

if (!name) fail('missing plugin name argument');

const pluginDir = join(WORKSPACE_ROOT, 'plugins', name);

const requiredFiles = [
  'package.json',
  'cordis.patch.yml',
  'cordis.yml',
  'tsconfig.json',
  join('src', 'index.ts'),
];

for (const relPath of requiredFiles) {
  const path = join(pluginDir, relPath);
  try {
    await readFile(path, 'utf8');
  } catch {
    fail(`missing expected file plugins/${name}/${relPath}`);
  }
}

let pkg;
try {
  pkg = JSON.parse(await readFile(join(pluginDir, 'package.json'), 'utf8'));
} catch (err) {
  fail(`package.json does not parse as JSON: ${err.message}`);
}

if (!pkg.dsh?.bundle?.patch) {
  fail('package.json is missing the "dsh.bundle.patch" key');
}

const smokePromptPath = join(WORKSPACE_ROOT, '.hedgehog', 'dsh-smoke', `${name}.md`);
try {
  await readFile(smokePromptPath, 'utf8');
} catch {
  fail(`missing smoke prompt file .hedgehog/dsh-smoke/${name}.md`);
}

console.log(`scaffold verify OK for "${name}"`);
