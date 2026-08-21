---
name: hedgehog-bootstrap-deepseek-harness-core
description: Use once, at the start of a new Hedgehog project on the deepseek-harness core, to land the pre-verified DSH/Cordis plugin workspace and verify it's green. Runs as the only move of the `bootstrap` agent on this core — there are no add-on steps, unlike full-stack-app. Invoked automatically by `planner` after Confirm & Lock.
---

# Hedgehog Bootstrap — deepseek-harness Core

Lands the whole of a `deepseek-harness` project's workspace — there's no
add-on layer to run after it, unlike `full-stack-app`'s
`hedgehog-bootstrap` — by copying a pre-built, pre-verified workspace
(this package's `workspace/`) rather than generating it live: the pnpm
workspace pinned to exact DeepSeek Harness (DSH) and Cordis versions,
the six-layer `core.yaml` (scaffold, logic, wiring, smoke, bundle,
join), and the tool-plugin generator under `tools/generators/`. This
piece is deterministic — the same commands produce the same output on
every project — so the output is committed once, upstream, and copied
here instead of re-derived by an agent on every run.

Unlike landing-page's workspace, this core's workspace starts with an
**empty** `plugins/` directory (just a `.gitkeep`). There is no plugin
to build yet at bootstrap time — a plugin is created later by
`pnpm generate:tool <name>` once the user names what they want to
build, and `harness-eng` takes it from there through `core.yaml`'s six
layers. Bootstrap's job here is narrower than landing-page's: land the
toolchain and generator, prove the toolchain itself is wired correctly,
and stop — there is no page or component for this step to build or
verify, because nothing has been scaffolded yet.

This skill has no per-project decisions to make: no add-ons, no
dependency beyond confirming its own commit hasn't already landed,
nothing to ask. deepseek-harness's core is identical on every project
running it.

## What lands

Everything under this package's `workspace/`, copied to the repo root:

- `core.yaml` — the six-layer sequence (`scaffold`, `logic`, `wiring`,
  `smoke`, `bundle`, `join`) every plugin intent runs through, one intent
  per plugin.
- `package.json` — pinned dependencies: `@deepseek-ai/dsh` and
  `@deepseek-ai/dsh-tools` at `0.1.0-rc.8`, `@deepseek-ai/cordis` at
  `4.0.1`. Cordis is versioned independently of DSH's `rc` cadence — the
  three packages do not share one tag, and the pin reflects that; don't
  "simplify" them onto a single version during a later bump.
- `pnpm-workspace.yaml` — `packages: ["plugins/*"]`.
- `plugins/` — empty except for a `.gitkeep`. The first plugin lands
  later, generated (not hand-written) by `pnpm generate:tool <name>`.
- `tools/generators/` — the generator tooling itself: `cli.mjs` (entry
  point), `tool/generate.mjs` and its `template.*.tmpl` files (the
  per-plugin scaffold `generate:tool` produces), and
  `verify-scaffold.mjs` (the `scaffold` layer's verify command —
  structural check only, confirms the generated shape exists and
  parses; `logic`'s `tsc --noEmit` is what actually checks the code).
- `.env.example` — documents `DEEPSEEK_API_KEY`, the credential DSH's
  `dsh-credentials-local` provider reads from a project-root `.env`.
  Copy to `.env` and fill in before any layer past `wiring` runs; `.env`
  itself is gitignored, never committed.
- `README.md` — a thin index: what the workspace is, plus a `## Plugins`
  section. `pnpm generate:tool <name>` appends one bullet here per new
  plugin, right after the `<!-- plugin-readme-links -->` marker, linking
  to that plugin's own generated README — this file is never hand-edited
  beyond that.

`node_modules` is not part of the copy — `pnpm install` regenerates it
from the committed `pnpm-lock.yaml`.

## Steps

### 1. Confirm this hasn't already run

Check for `core.yaml` at the repo root, or a prior `chore: workspace`
commit (`git log --grep="^chore: workspace"`). Either means core already
landed — stop, don't re-copy. On a project installed via `hedgehog init
--deepseek-harness`, `workspace/` was already copied to the repo root
before any git history existed, so its contents land inside the
project's very first commit (`chore: install Hedgehog`) rather than a
later `chore: workspace` commit of their own — `core.yaml`'s presence is
the only signal step 6 will ever produce on that path. On a project that
ran plain `init` and only reached this core because `planner` picked it
at Phase 0, `workspace/` is copied later, mid-history, and does get its
own `chore: workspace` commit (step 7). Either signal alone is
sufficient to stop here; don't expect both. If something about the
landed core seems wrong, that's a Correction Protocol case
(`hedgehog-dsh-loop`), not a re-copy: patch the specific file at its
source.

### 2. Land this package's `workspace/`

`hedgehog init --deepseek-harness` copies this package's `workspace/`
to the repo root at install time, the same way it copies the engine's
`src/agents` to this host's own agents directory — check whether the
core files are already present (same check as step 1) before copying
again. On a project that ran plain `init` (no core flag) and only
reaches `deepseek-harness` because `planner` picked it at Phase 0, this
hasn't happened yet: copy `workspace/`'s contents to the repo root now.
Also merge this core's `CLAUDE.md` section into root `CLAUDE.md` (this
package's `CLAUDE.core.md` fills the shell's `{{CORE_SECTION}}`
placeholder left unfilled by a deferred install) — skip this if the
section is already filled. Either way, by the end of this step every
file listed in "What lands" above should be on disk.

### 3. Confirm `dsh` and `pnpm` are reachable

`pnpm` must already be on `PATH` for step 4 to run at all. `dsh` itself
is not a separate install — it ships as the CLI binary inside the
`@deepseek-ai/dsh` npm package installed in step 4, so it only becomes
reachable after that install completes, via `pnpm dsh` (or `pnpm exec
dsh`) rather than a bare `dsh` on `PATH`. Treat this step as a sanity
check to run once install finishes, not a blocking gate before it —
confirm with something like `pnpm dsh --version` (or whatever the
package's actual entry point is; verify the real invocation once and
correct this note if it differs).

### 4. Confirm a DeepSeek API credential is available

Nothing through `wiring` needs one — `scaffold`, `logic`, and `wiring`
are typecheck/structural checks against source files, not a real DSH
boot. `smoke` (and later, `dsh web`) does: it boots a real profile and
calls the model, so it needs `DEEPSEEK_API_KEY` resolvable by DSH's
`dsh-credentials-local` provider. The simplest path is a `.env` file at
the workspace root — `workspace/.env.example` documents this; copy it
to `workspace/.env` and fill in the key (gitignored, never committed).
Confirm with the user this exists or that they'll add it before
`harness-eng` reaches a plugin's `smoke` layer — raise it now rather
than letting it surface as a late failure three layers in.

### 5. Install

```bash
pnpm install
```

Resolves against the committed `pnpm-lock.yaml` — this should be fast
and produce no lockfile changes. A lockfile diff here means the shipped
`pnpm-lock.yaml` doesn't match `package.json` — that's a packaging bug
in this package's `workspace/`, not something to patch locally (see
**If verification fails**, below).

### 6. Verify

```bash
pnpm -r exec tsc --noEmit
```

This is `core.yaml`'s own `join` layer verify command, run here against
an empty `plugins/` directory. With zero plugins in the workspace it
should pass trivially — nothing to typecheck — and that trivial pass
*is* the bootstrap-time proof that the toolchain wiring works: the same
role landing-page's `pnpm astro check && pnpm build` plays for its own
bootstrap. A non-trivial failure here (not "no packages found," an
actual TypeScript or resolution error) means the shipped toolchain
config itself is broken.

### 7. Commit

```
chore: workspace
```

One commit for all of core, landed as a verified copy — on a project
that ran plain `init` and reached this core via `planner`'s Phase 0
pick. On a `--deepseek-harness`-flagged install, `workspace/`'s content
already sits inside `chore: install Hedgehog` (see step 1), so there is
nothing left to commit here: `git status` is clean, and this step is a
no-op by design rather than a skipped one. Either way, by the end of
this step `core.yaml`'s presence at the repo root is the durable record
that core landed — `bootstrap` checks for it via step 1, not a
`chore: workspace` commit that only exists on one of the two paths.

## If verification fails

A clean copy of `workspace/` that fails `pnpm install` (lockfile drift)
or the `join` verify command means the shipped template itself is
broken — not a per-project problem to hand-patch around. Stop and
report exactly what failed. Fixing this means updating `workspace/` at
its source (this package) and shipping a new package version — never
patch a consuming project's copy to route around a broken template and
call core done.

## Constraints

- Run once per project, as the `bootstrap` agent's only move on this
  core — never invoked on its own by a user.
- No add-on awareness, because this core has no add-ons. If a future
  deepseek-harness variation genuinely needs one, that's a new core
  decision for `planner`'s Phase 0, not an add-on bolted onto this one.
- Don't hand-edit any file this step lands to work around a
  verification failure. Fix `workspace/` at the source instead (see
  **If verification fails**).
- Don't generate a plugin, run `pnpm generate:tool`, or write any
  `plugins/*` content — that's `harness-eng`'s work, per plugin intent,
  after this Bootstrap box is checked. `plugins/` stays empty (but for
  `.gitkeep`) at the end of this skill.
