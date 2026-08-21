## This project's core: deepseek-harness

Builds DeepSeek Harness (DSH) plugins: TypeScript modules that extend
DSH's Cordis-based plugin kernel with new tools, hooks, UI behavior, or
services other plugins can consume. One intent per plugin — the module
axis this core builds along — so a project with several plugins runs
several independent six-layer chains through the same fixed sequence.
Scaffolding is automatic (`pnpm generate:tool`), real generators produce
the repeatable structure rather than an agent freehand-authoring
boilerplate, and a real DSH boot (`headless`, then optionally the Web UI)
proves a plugin works rather than trusting a typecheck alone.

DSH is pre-1.0 and moves fast; its own docs warn of breaking changes
between `rc` tags. This core treats that churn as the expected cost of
building against DSH early rather than waiting for it to stabilize —
friction gets logged aggressively via `hedgehog friction add` and fixed
forward, not designed around.

### The skills — invoke these, don't improvise

- **`hedgehog-dsh-loop`** — every unit of work once bootstrapped:
  `hedgehog claim` emits the packet for each ready layer across every
  plugin in flight, `harness-eng` builds it, `hedgehog verify` gates and
  commits it. Also covers this core's planning intake (adding a plugin
  intent), the generator-before-scaffold step, the advisory `dsh web`
  visibility step after `smoke` passes, and the Correction Protocol for
  fixing a wrong upstream layer. Invoke it at the start of any build
  session and for "what's next".
- **`hedgehog-bootstrap-deepseek-harness-core`** — run **once**, at
  project start, to land the pinned pnpm workspace and generator
  tooling. Skip if `core.yaml` already exists at the repo root.
- **`dsh-plugin-shapes`** — the plugin-body construction library: the
  four DSH plugin shapes (tool, hook, UI, protocol-driver/service) with
  real, doc-verified DSL. `harness-eng` consults it at the `logic` layer
  instead of re-deriving DSH's API from memory.
- **`conventional-commits`** — when a change spans several layers in one
  working-tree pass and needs splitting back into per-layer commits
  (mainly Correction Protocol cleanups).

### The agents — delegate the judgment calls

- **`planner`** — planning intake at project start (which core applies),
  then this core's own intake: confirming a plugin's name and goal with
  the user and writing its intent (`hedgehog intent add`, one call per
  plugin — no BMAD mining, no brief to lock). Hands off to `bootstrap` on
  a project's first plugin; for every plugin after that, its Re-entry
  pass adds a new intent directly, since this core's module axis gives a
  new plugin a natural home in the build graph.
- **`bootstrap`** — runs `hedgehog-bootstrap-deepseek-harness-core`'s
  steps. Triggered automatically by `planner` after its first run; skip
  if `core.yaml` already exists at the repo root.
- **`harness-eng`** — builds every layer, for every plugin: `scaffold`
  (confirms and adjusts `pnpm generate:tool`'s output, fills in the real
  smoke prompt), `logic` (the plugin's actual TypeScript behavior, via
  `dsh-plugin-shapes`), `wiring` (the Cordis patch plumbing that gets the
  plugin loaded under a real profile), `smoke` (proves the plugin boots
  and completes one real task under DSH), `bundle` (publish-readiness),
  and `join` (the one cross-plugin integration check, run once after
  every plugin's `bundle` is complete). One continuous engineering role
  per plugin, not a split between build and review agents.

## The constants (do not deviate)

### Stack (locked — manual re-pin only, no add-ons on this core)

**`@deepseek-ai/dsh`** and **`@deepseek-ai/dsh-tools`**, pinned to an
exact `rc` tag (not a caret range — pre-1.0 semver isn't trustworthy yet)
· **`@deepseek-ai/cordis`**, the plugin kernel DSH is built on, pinned to
its own exact stable version — Cordis is versioned independently of
DSH's `rc` cadence, so its pin is not the same string as the other two ·
**pnpm workspace** rooted at `workspace/`, one package per plugin under
`plugins/*` · **TypeScript**, `tsc --noEmit` as the `logic` and `join`
layers' gate. See `workspace/package.json` for the exact pinned versions
currently in effect.

A new `rc` tag lands often; this core's pin only moves when a human
re-pins it by hand after evaluating what actually broke, then regenerates
and re-verifies the whole `workspace/` before the change ships. Never
bump a pin mid-build to chase a newer feature — that's a package-level
decision, not a build-task one. If a task seems to need something the
pinned version doesn't have, log it with `hedgehog friction add` and
report it rather than bumping the dependency.

### Layout

```text
workspace/
  core.yaml              the six-layer sequence: scaffold, logic, wiring, smoke, bundle, join
  package.json            pnpm workspace root, pinned dsh/cordis/dsh-tools versions
  pnpm-workspace.yaml      packages: ["plugins/*"]
  plugins/
    <plugin-name>/
      package.json         dsh.bundle.patch block, this plugin's own pinned deps
      cordis.patch.yml      the patch row that loads this plugin into a profile
      cordis.yml             dev-patch overlay for `pnpm dsh web --patch`
      tsconfig.json
      src/index.ts            the plugin's own TypeScript — name, apply(ctx), the chosen shape's DSL
  tools/generators/
    cli.mjs                 entrypoint: `node tools/generators/cli.mjs tool <name>`
    tool/generate.mjs        the tool-plugin generator
    tool/template.*.tmpl      package.json, cordis.patch.yml, and plugin-body templates
    verify-scaffold.mjs       the scaffold layer's structural verify command
.hedgehog/
  hedgehog.db              the build graph — one intent per plugin, its six compiled tasks per intent
  dsh-smoke/
    <plugin-name>.md        the real task prompt the smoke layer runs headless against
```

### Core rules

- **Scaffolding is generated, never hand-authored.** `pnpm generate:tool
  <name>` produces a plugin's repeatable 80% — its manifest, patch row,
  and a typechecking stub. `harness-eng`'s `scaffold`-layer work is
  confirming and adjusting that output, not writing it from scratch.
- **One generator in v0.1: tool plugins only.** Hook, UI, and
  protocol-driver plugins are hand-authored against `dsh-plugin-shapes`'s
  catalog — their extension-point vocabulary is less stable, so a
  generator for them doesn't pay back yet. This is a deliberate scope
  cut, not a gap to fill inline; extending generator coverage is a
  `planner` Phase-0-scoped decision for this core package, not a build
  task.
- **Visibility is split from verification.** The `smoke` layer's headless
  run is the automated, scriptable, exit-code-gated proof a plugin works
  — it alone gates the commit. `pnpm dsh web --patch ...`, offered after
  `smoke` passes so the plugin can be seen loaded live at
  `127.0.0.1:3080`, is manual and advisory only; it never blocks a layer.
- **A plugin's shape is a judgment call informed by its intent, its DSL
  is not.** `harness-eng` decides whether a plugin is a tool, hook, UI,
  or protocol-driver shape; `dsh-plugin-shapes` supplies the confirmed
  DSL for whichever shape is chosen. An extension-point name (a `ctx.on`
  event, a service, a method) not confirmed in that skill or in a
  freshly re-fetched doc is never invented.
- **A correction stays scoped to its own plugin**, except where it
  touches something the `join` layer's workspace-wide typecheck depends
  on — see `hedgehog-dsh-loop`'s Correction Protocol for exactly when
  `join` re-runs.
- **Friction logging is a default reflex, not optional housekeeping.**
  Any DSH breaking change, undocumented behavior, or manifest shape that
  shifted from what an earlier layer assumed gets `hedgehog friction
  add`'d the moment it's hit — mid-layer, while the specifics are fresh,
  not reconstructed from memory afterward.
- **A wrong layer is fixed at its source** via the Correction Protocol —
  never a downstream workaround (e.g. don't patch `bundle` to route
  around a `logic` bug that belongs in `logic`).
