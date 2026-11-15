#!/usr/bin/env node
// Entrypoint for every workspace generator. Dispatches by subcommand:
//   node tools/generators/cli.mjs tool <name>
//   node tools/generators/cli.mjs overlay <name>

const [, , kind, name] = process.argv;

if (kind === 'tool') {
  if (!name) {
    console.error('usage: node tools/generators/cli.mjs tool <name>');
    process.exit(1);
  }
  const { generateTool } = await import('./tool/generate.mjs');
  await generateTool(name);
} else if (kind === 'overlay') {
  if (!name) {
    console.error('usage: node tools/generators/cli.mjs overlay <name>');
    process.exit(1);
  }
  const { writeDevOverlay } = await import('./tool/generate.mjs');
  await writeDevOverlay(name);
} else {
  console.error(`unknown generator kind: "${kind ?? ''}"\nusage: node tools/generators/cli.mjs tool|overlay <name>`);
  process.exit(1);
}
