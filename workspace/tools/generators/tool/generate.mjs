// Generator logic for `pnpm generate:tool <name>`. Produces the
// repeatable 80% of a DSH tool plugin: package.json (with the
// dsh.bundle.patch block and pinned deps), cordis.patch.yml, a stub
// src/index.ts that typechecks and boots (execute() throws "not
// implemented"), tsconfig.json, a dev-patch cordis.yml for the local
// `pnpm dsh web --patch` launch loop, and a placeholder smoke-prompt
// file. It stops exactly where hand judgment starts — the `logic`
// layer replaces the stub body.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = join(HERE, '..', '..', '..');

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

function fillTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (!(key in vars)) throw new Error(`template placeholder {{${key}}} has no value`);
    return vars[key];
  });
}

async function writeGenerated(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  console.log(`  created ${path.slice(WORKSPACE_ROOT.length + 1)}`);
}

export async function generateTool(rawName) {
  const name = rawName.trim();
  if (!NAME_PATTERN.test(name)) {
    throw new Error(
      `invalid plugin name "${name}" — must be lowercase, start with a letter, and contain only letters, digits, and hyphens (matches ${NAME_PATTERN})`,
    );
  }

  const pluginDir = join(WORKSPACE_ROOT, 'plugins', name);
  const vars = { name };

  const packageJsonTmpl = await readFile(join(HERE, 'template.package.json.tmpl'), 'utf8');
  const patchRowTmpl = await readFile(join(HERE, 'template.patch-row.yml.tmpl'), 'utf8');
  const pluginTsTmpl = await readFile(join(HERE, 'template.plugin.ts.tmpl'), 'utf8');

  await writeGenerated(join(pluginDir, 'package.json'), fillTemplate(packageJsonTmpl, vars));
  await writeGenerated(join(pluginDir, 'cordis.patch.yml'), fillTemplate(patchRowTmpl, vars));
  await writeGenerated(join(pluginDir, 'src', 'index.ts'), fillTemplate(pluginTsTmpl, vars));

  await writeGenerated(
    join(pluginDir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ES2022',
          moduleResolution: 'bundler',
          strict: true,
          declaration: true,
          outDir: 'lib',
          rootDir: 'src',
          skipLibCheck: true,
        },
        include: ['src'],
      },
      null,
      2,
    ) + '\n',
  );

  // Local dev-patch overlay for `pnpm dsh web --patch plugins/{name}/cordis.yml`
  // — the plugin path must be absolute (DSH's own convention for --patch
  // overlays), resolved at generate time since it's specific to this checkout.
  const absolutePluginEntry = join(pluginDir, 'src', 'index.ts');
  await writeGenerated(
    join(pluginDir, 'cordis.yml'),
    `- insert:\n    - id: ${name}\n      name: ${absolutePluginEntry}\n`,
  );

  await writeGenerated(
    join(WORKSPACE_ROOT, '.hedgehog', 'dsh-smoke', `${name}.md`),
    `TODO: replace with a real one-line task prompt that exercises the "${name}" tool end-to-end via \`dsh --profile headless --patch plugins/${name}/cordis.patch.yml\`.\n`,
  );

  console.log(`\nGenerated plugin "${name}" at plugins/${name}/. Next: pnpm install, then fill in src/index.ts's execute().`);
}
