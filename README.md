# @skyf0xx/hedgehog-core-deepseek-harness

Hedgehog's deepseek-harness core: a pinned DeepSeek Harness (DSH) /
Cordis plugin workspace, a tool-plugin generator, and the skills that
drive building DSH plugins with Hedgehog's build discipline.

## Contents

- `workspace/` — the workspace a Hedgehog install copies to a
  project's repo root: the pnpm workspace pinned to an exact DSH/Cordis
  `rc` tag, the tool-plugin generator (`tools/generators/`), and the
  six-layer `core.yaml` (scaffold, logic, wiring, smoke, bundle, join).
- `agents/` — `harness-eng`, the single build agent covering every
  layer's hand-work for one plugin.
- `skills/` — `hedgehog-dsh-loop` (claim/verify sequencing and
  friction-logging discipline), `hedgehog-bootstrap-deepseek-harness-core`
  (lands the workspace), and `dsh-plugin-shapes` (reference catalog of
  the four DSH plugin shapes).
- `CLAUDE.core.md` — fills a Hedgehog project's root `CLAUDE.md`
  `{{CORE_SECTION}}` placeholder for this core.
- `hedgehog-core.yaml` — this package's manifest: name, flag, and which
  agents/skills it carries.

## Using this package

A Hedgehog installation depends on this package for the
`deepseek-harness` core rather than carrying its content directly. See
the Hedgehog engine ([`skyf0xx/hedgehog`](https://github.com/skyf0xx/hedgehog))
for the installer and build-graph tooling that consumes it.

## Working on this core

This is a versioned npm package that the Hedgehog engine's `init`
fetches by name, carrying `deepseek-harness`'s own agent, skills, a
pinned workspace, and the `hedgehog-core.yaml` manifest that names all
three to the engine. See the engine repo and its `ARCHITECTURE.md` for
how `init` resolves and fetches a core package — that mechanism lives
there, not here.

No root `CLAUDE.md` lives in this repo. `CLAUDE.core.md` is a payload
file: its content is installed into a *consuming project's* generated
`CLAUDE.md`, filling that project's `{{CORE_SECTION}}` placeholder.

DSH is pre-1.0 and moves fast; this core pins `@deepseek-ai/dsh`,
`@deepseek-ai/cordis`, and `@deepseek-ai/dsh-tools` to an exact `rc` tag
rather than a caret range, and bumps that pin by hand — see
`workspace/package.json` for the current pin. `harness-eng` logs
breaking changes and undocumented behavior via `hedgehog friction add`
as it builds; `tweaker` reviews that log post-build.

A change here is a release of this package, not of the engine: bump
`package.json`'s version, commit, and merge to `main` — this repo's own
`publish.yml` tags and publishes from there.
