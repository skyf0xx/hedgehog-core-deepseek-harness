#!/usr/bin/env node
// Entrypoint for every workspace generator. Dispatches by subcommand:
//   node tools/generators/cli.mjs tool <name>

const [, , kind, name] = process.argv;

if (kind === 'tool') {
  if (!name) {
    console.error('usage: node tools/generators/cli.mjs tool <name>');
    process.exit(1);
  }
  const { generateTool } = await import('./tool/generate.mjs');
  await generateTool(name);
} else {
  console.error(`unknown generator kind: "${kind ?? ''}"\nusage: node tools/generators/cli.mjs tool <name>`);
  process.exit(1);
}
