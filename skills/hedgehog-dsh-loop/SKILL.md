---
name: hedgehog-dsh-loop
description: Use for every unit of work on the deepseek-harness core, from planning intake through the six-layer scaffold → logic → wiring → smoke → bundle → join build, gated by `hedgehog verify` and committed one layer at a time. Triggers on "next step", "next phase", "what's next", or the start of any work session on a bootstrapped deepseek-harness project. Also covers this core's own planning intake and Correction Protocol.
---

# Hedgehog DSH Loop

The operating loop for a bootstrapped `deepseek-harness` project:
`hedgehog claim --owner <owner> --count <n>` emits the packet for every
ready layer, run each through `harness-eng`, `hedgehog verify` gates and
commits it. The build graph (`.hedgehog/hedgehog.db`) is the live list —
query it via `hedgehog status`/`hedgehog ready`, never re-derive state
from prose. This core's `workspace/core.yaml`, already the source of
truth, defines the six compiled layers and this core's module axis:
`{module}` is a plugin name, and a project builds one intent per plugin
it wants to add to the workspace. This is the same module-axis mechanism
`full-stack-app` uses per domain module — not the linear, single-module
degenerate case `landing-page`'s loop implements. Because layers vary
independently per plugin, a single `hedgehog claim` call can return
**multiple** ready tasks at once (e.g. `logic` for one plugin and
`scaffold` for another, claimed together) — never assume `--count N`
returns exactly one task the way a linear chain's loop would.

One agent, `harness-eng`, builds every layer for every plugin — there is
no per-layer or per-stage agent handoff the way other cores split
build vs. copy vs. review work. `join` is the one layer that is
`once: true` and `exclusive: true`: it runs after every plugin's
`bundle` layer is complete, typechecks the whole workspace together, and
is the cross-plugin integration check the per-plugin layers can't be.

## Planning intake (Phase 0, before any build layer)

Run once per new plugin, before that plugin's `scaffold` task can be
claimed. Unlike `landing-page`'s planning intake, this core does not run
the vendored BMAD-METHOD shelf — there is no subject/audience/job to
mine, no brief to lock. Intake here is mechanical: one intent per plugin
the user wants to build, named directly.

1. **Confirm the plugin's name and goal with the user** — the plugin
   name becomes `{module}` everywhere in the compiled graph (directory
   name under `plugins/`, commit scopes), so confirm it matches the generator's naming rule (lowercase,
   starts with a letter, letters/digits/hyphens only) before adding the
   intent. State the goal (what the plugin does) and outcome (what
   "done" looks like — usually: boots under DSH, completes the smoke
   task, bundles cleanly) in plain terms and get explicit go-ahead before
   writing anything to the build graph.
2. **Add the intent**: `hedgehog intent add --id <plugin-name> --goal
   "<what this plugin does>" --outcome "<what done looks like>"` — one
   call per plugin, no BMAD archive, no mined brief. Run `hedgehog plan`
   next to compile it against this core's `workspace/core.yaml` into the
   six per-plugin layer tasks, then `hedgehog status` to show the
   compiled chain.
3. **Commit planning intake's output as one commit**,
   `chore(planning): intake` — the committed intent
   (`.hedgehog/intents/<plugin-name>.json`) and root `CLAUDE.md`'s filled
   placeholders, if this is the project's first intent.
   `.hedgehog/hedgehog.db` is gitignored and derived — `hedgehog plan`
   compiles it from the committed intent, and `hedgehog db rebuild`
   re-derives it from that same intent plus git history.
4. **Hand off to `bootstrap`** (first plugin) or straight into The Loop
   (an additional plugin in an already-bootstrapped project) once the
   commit lands.

`planner` owns this section; see that agent for when it runs, including
its Re-entry pass for adding a new plugin to an already-built project
(see Stop Condition below).

## The generator step (before `scaffold` can be claimed)

`scaffold`'s scope files don't get hand-authored — they get generated.
**Before claiming a plugin's `scaffold` task, run `pnpm generate:tool
<plugin-name>` first**, from `workspace/`. It produces the plugin's
`package.json` (with the `dsh.bundle.patch` block and pinned deps),
`cordis.patch.yml`, a stub `src/index.ts` that typechecks and boots
(`execute()` throws "not implemented"), `tsconfig.json`, a dev-patch
`cordis.yml` for the local `pnpm dsh web --patch` launch loop, and a
placeholder smoke-prompt file at `.hedgehog/dsh-smoke/<plugin-name>.md`.

This changes what `harness-eng`'s `scaffold`-layer work actually is: not
writing these files from scratch, but confirming the generator's output
matches the plugin's actual intent and adjusting anything that needs a
judgment call the generator can't make — then filling in the smoke-prompt
placeholder with a real one-line task prompt that will exercise the
plugin end-to-end once `logic` and `wiring` are done. `scaffold`'s own
`verify` (`node tools/generators/verify-scaffold.mjs {module}`) checks
the generator's output is well-formed; it does not check the smoke
prompt is real rather than still the TODO placeholder, so `harness-eng`
confirms that by inspection before presenting the layer.

If `pnpm generate:tool <plugin-name>` hasn't been run yet for a plugin
whose intent already exists, that's the first thing to do — not a build
step to work around by hand-writing the scaffold files.

## The Loop (every unit of work)

1. **Run `hedgehog claim --owner <owner> --count <n>`.** `<owner>` is
   this session (a stable id — session id or equivalent). It emits one
   task packet per ready layer (STATUS/INTENT/RELEVANT RULES/INHERITED
   DEBT/WHY NOW/BLOCKED DOWNSTREAM/ALLOWED SCOPE/VERIFICATION) — trust
   it: `hedgehog claim` never hands out a layer whose dependency isn't
   `complete`, so there's no separate gate check to run by hand. With
   multiple plugins in flight, or independent layers ready across
   plugins, **this can return more than one task** — read every packet
   returned, don't assume the first is the only one. `hedgehog ready`
   previews the same decision without claiming anything.
2. **For each claimed packet, confirm its layer's prerequisites**: for
   `scaffold`, confirm `pnpm generate:tool <plugin-name>` has already
   run (see above) — if not, run it first, then proceed. For every other
   layer, the packet's ALLOWED SCOPE and the prior layer's landed commit
   are the only inputs needed.
3. **Delegate the packet to `harness-eng`**, which does the layer's
   actual work against that plugin: `scaffold` confirms/adjusts generator
   output and fills the smoke prompt; `logic` implements `execute()` (and
   any supporting code) in `src/index.ts` and the rest of `src/`;
   `wiring` fills in `cordis.patch.yml` and any `package.json` wiring
   needed for the plugin to load under a real DSH profile; `smoke`
   confirms the filled-in smoke prompt actually exercises the plugin,
   then relies on the layer's own `verify` command to prove it end to
   end; `bundle` confirms the package is pack-ready; `join` (once, after
   every plugin's `bundle` is complete) resolves any cross-plugin
   typecheck break the per-plugin layers couldn't see in isolation.
   Multiple claimed packets for different plugins can be worked in
   whatever order is convenient — they're independent unless a Correction
   Protocol patch links them (see below).
4. **`harness-eng` runs its own self-test** for the layer before
   presenting its work — necessary, not sufficient. This is a sanity
   check the agent does for itself; it does not move the task and does
   not commit its own work. Committing is always the orchestrating
   session's act via `hedgehog verify`, regardless of which layer
   produced the change.
5. **Hit a DSH breaking change, undocumented CLI/manifest behavior, or a
   manifest shape that shifted mid-build? Log it immediately** — `hedgehog
   friction add "<note>" [--task <task-id>]` — before doing anything else
   to work around it. See Friction log below; this is not optional
   housekeeping saved for later, it's the next action the moment the
   surprise happens.
6. Once `harness-eng`'s work for a claimed layer is presented and (for
   `scaffold`) any judgment-call adjustments are settled, **run `hedgehog
   verify <task-id> --owner <owner>`.** It checks the touched files
   against that packet's ALLOWED SCOPE, runs the layer's `VERIFICATION`
   command, and on a pass writes the commit (the exact Conventional
   Commit message from `workspace/core.yaml`, e.g. `feat({module}):
   logic`) and unlocks the next layer for that plugin. On a scope
   violation or a failing check, the task moves to `blocked` with a
   `blocked_reason` of `scope_violation` or `verification_failed`, and
   nothing downstream for that plugin unlocks. Fix the work, then run
   `hedgehog retry <task-id>` to return the task to `planned`, claim it
   again by task id, and verify again — `hedgehog verify` only accepts a
   task currently held in `building`, so a blocked task has to go back
   through `retry` and `claim` first. Don't hand-commit around it.

   A `blocked` task anywhere in the graph makes `hedgehog claim --count
   <n>` refuse to hand out anything at all, with a non-zero exit naming
   the blocked task(s). Fix and `retry` it before claiming more. A
   **targeted** `hedgehog claim <task-id> --owner <owner>` is exempt —
   that's how the just-retried task gets reclaimed above. A lease the
   same `claim` call reaps for having just expired is exempt too: that
   call still claims whatever else is ready, and the reaped task lands in
   NEEDS ATTENTION for the next `claim` call to stop on.
7. **After `smoke` verifies clean** for a plugin (`dsh --profile headless
   --patch plugins/{module}/cordis.patch.yml "<task>"` exits 0, proving
   the plugin boots under DSH's builtin `headless` profile and completes
   one real task, no human required) — see Visibility step below before
   moving on to `bundle`.
8. **Repeat** — `hedgehog claim --owner <owner> --count <n>` again for
   whatever layers are ready next, across every plugin in flight.

Each `hedgehog verify` call commits exactly one plugin's one layer; a
wrong layer is fixed forward later via the Correction Protocol.

## Visibility step (advisory, after `smoke` passes)

`smoke`'s automated verify proves the plugin works — it does not show
anyone the plugin working. Once a plugin's `smoke` task is `complete`,
**offer the developer `pnpm dsh web --patch plugins/<plugin-name>/cordis.yml`**
so they can open `127.0.0.1:3080` and see the plugin loaded live in the
browser, actually callable, not just green on a typecheck. This is
manual, human-visible, and purely advisory: it never blocks `bundle` or
any later layer if the developer skips it, and `hedgehog verify` does
not check whether it ran. Offer it every time `smoke` completes, even if
declined before — it's cheap to offer and it's the only point in the
loop where the plugin is actually seen working rather than proven
working by a command's exit code.

## Friction log

DSH is pre-1.0, days old as a project, and its own docs warn of breaking
changes between `rc` tags. Given that cadence, this is one of the most
frequently invoked instructions in this file, not a footnote: **call
`hedgehog friction add "<note>" [--task <task-id>]` on any DSH breaking
change, undocumented CLI or manifest behavior, or a manifest shape that
shifted from what an earlier layer assumed** — a `--dump-config` flag
behaving differently than the last plugin's `wiring` layer found it, a
`headless` exit code meaning something new, a `cordis.patch.yml` field
that got renamed, anything where the pin in `workspace/package.json`
turns out to not mean what it meant last time. Log it the moment it's
hit, mid-layer, not after the fact from memory — the note is only useful
if it's specific enough for `tweaker` to act on later. `tweaker` reads
the friction log once, post-build, and files GitHub issues against
`skyf0xx/hedgehog` from it — the same mechanic every Hedgehog core's
loop skill uses for turning real build friction into upstream fixes.

## Correction Protocol

The same core mechanic every Hedgehog core's loop skill implements:
stop, patch the upstream layer in place, fast-forward every dependent
layer as its own commit, commit messages as the explanation, resume the
loop. For this core specifically:

- **A correction ripples forward through one plugin's own chain.** A
  wrong `logic` layer for a given plugin ripples through that same
  plugin's `wiring`, `smoke`, and `bundle` — each its own small commit,
  in order, `hedgehog retry` → claim → fix → verify at each step.
- **A correction to one plugin does not ripple to other plugins.**
  Because layers are module-axis (independent per `{module}`), patching
  plugin A's `logic` layer has no effect on plugin B's tasks — don't
  re-verify or re-touch a different plugin's chain just because a
  sibling plugin needed a fix.
- **Unless the correction touches something `join` depends on
  cross-plugin.** If the patch changes a shared type, a workspace-level
  dependency, or anything else `join`'s workspace-wide typecheck could
  catch, `join` re-runs after every affected plugin's own chain is fixed
  — not before. `join` being `once: true` means it only unlocks after
  every plugin's `bundle` is complete in the first place, so a
  correction that reopens `join` is really: fix each affected plugin's
  chain forward to `bundle` again, then let `join` re-claim and re-verify
  once all of them land.

The orchestrating session runs this protocol and owns every commit in
it. `harness-eng` re-runs whichever layer the patch targets — there's no
other agent to hand off to, unlike a core that splits build and review
across agents. Use `conventional-commits` when a correction touches
several layers in one working-tree pass and needs splitting back into
per-layer commits.

### Post-build entry

Same shape as every Hedgehog core's Post-build entry: no task to stop,
return to `tweaker` instead, every touched task stays `complete` and is
fixed forward in new commits. This core routes here when something is
wrong in a plugin that's already shipped past `bundle` (or past `join`)
and the fix is small enough not to warrant reopening it as a full
Correction Protocol pass through the live graph.

**New scope on this core usually isn't a post-build entry at all** —
unlike a core with no module axis, this core has a natural home for a
new plugin: a new intent, added via `planner`'s Re-entry pass, the same
mechanism `full-stack-app` uses for a new domain module. Route "add
another plugin" there, through Planning intake above, not through this
section. Post-build entry is for fixing something already built, not for
adding something new that the module axis already has room for.

## Phase Transition Checks

Before claiming a plugin's `scaffold` task, confirm `pnpm generate:tool
<plugin-name>` has already produced `plugins/<plugin-name>/` — `scaffold`
is confirming and adjusting that output, not creating it from nothing.
If the intent exists but the generator hasn't run, run it first.

Before claiming `logic`, confirm `scaffold` is `complete` per `hedgehog
status` — `harness-eng` is filling in real logic against a scaffold
that's already committed, not one still pending review.

Before claiming `wiring`, confirm `logic` typechecks clean per its own
landed commit — `wiring` connects a plugin whose logic is already
correct; a `logic` layer that only looks done invites a `wiring`-layer
failure that's actually a `logic`-layer bug wearing a different layer's
blocked reason.

Before claiming `smoke`, confirm the smoke-prompt placeholder at
`.hedgehog/dsh-smoke/<plugin-name>.md` has been replaced with a real
task prompt — a `smoke` task claimed against the generator's original
`TODO: replace...` placeholder will fail `verify` in a way that reads
like a DSH problem when it's actually an unfinished `scaffold` step.

Before claiming `bundle`, confirm `smoke` is `complete` — a plugin that
hasn't proven it boots and completes a real task under DSH has no
business being packed for distribution.

Before claiming `join`, confirm **every** plugin currently in the graph
has a `complete` `bundle` task — `join` is `once: true` and `exclusive:
true` precisely because it's the one point that reasons about the whole
workspace at once; claiming it against a partially-bundled workspace
defeats the point of the check.

## Rules

- **`harness-eng` builds every layer for every plugin.** There is no
  per-stage agent split — one agent's judgment carries the whole plugin
  from scaffold confirmation through bundle.
- **The generator runs before `scaffold` is claimed, always.** Don't
  hand-author scaffold-layer files to route around running `pnpm
  generate:tool` — that defeats the point of having a generator for the
  repeatable 80% of a new plugin.
- **Friction logging is not optional and not deferred.** Any DSH
  surprise — breaking change, undocumented behavior, shifted manifest
  shape — gets `hedgehog friction add`'d the moment it's hit. Given
  DSH's pre-1.0 cadence, treat this as a default reflex during every
  layer, not a step reserved for something dramatic.
- **The Visibility step never blocks.** Offering `pnpm dsh web --patch
  ...` after `smoke` passes is advisory every time — skipping it never
  stops `bundle` from being claimed or verified.
- **A correction to one plugin stays scoped to that plugin**, except
  where it touches something `join` depends on cross-plugin — see
  Correction Protocol above for exactly when `join` re-runs.
- **A wrong layer is fixed at its source** — the Correction Protocol,
  not a downstream workaround (e.g. don't patch `bundle` to route around
  a `logic` bug that belongs in `logic`).

## Stop Condition

No Polish Loop on this core — v0.1 ships no visual/UI review agents;
`smoke`'s automated verify plus the advisory Visibility step are the
whole verification story past `join`. Offer the fresh-context handoff
once every claimed task shows `complete` per `hedgehog status` — in
practice, either every plugin's full six-layer chain is complete and
`join` has landed (the natural unit when the project's whole intent set
is done), or a single plugin's own six-layer chain is complete and no
other intent is queued (the natural unit for one plugin at a time). Use
judgment for which framing fits the moment, the same way `hedgehog
boundary`'s check applies regardless of which framing prompted the ask.

Confirm it with `hedgehog boundary` before offering the handoff: it
exits 0 only when nothing is in flight, the working tree is clean, and
the last closed task completed its intent, and names which of the three
failed otherwise. `hedgehog quiesce` answers only the in-flight third —
the right check while waiting out a correction, not the one for clearing
context. The same command is what decides any mid-build `/clear` too,
and `hedgehog boundary --handoff` prints the block the next session
opens with: where the build is, what's next and why, and what's blocked.

Tell the user plainly that the build is complete and that clearing
context now costs nothing — the build graph, the friction log, and the
commit log hold everything a fresh session needs. Name **both** ways
forward:

- **Adjustments to what's built** — a `tweaker` session, in a *new* chat
  window, not a subagent call inside this one. Tell the user plainly:
  close this chat window and open a new one, then paste this to start
  it:

  > The build is complete — `harness-eng` built every plugin's six
  > layers through `join`. Use the tweaker agent: first review the
  > friction log and ask me for feedback on the build, then take my
  > tweak requests one at a time.

- **New scope** — another plugin. Since this core has a module axis, a
  new plugin has a natural home: `planner`'s Re-entry pass adds a new
  intent (Planning intake above), `hedgehog plan` compiles its own
  six-layer chain, and The Loop resumes exactly as it did for the first
  plugin. There's no "does the brief still hold" question the way a
  brief-anchored core has to ask — a new plugin is additive by
  construction, independent of every other plugin already built, save
  for whatever `join` catches once its own `bundle` lands.

Don't start making tweaks or planning a new plugin in the current,
already-large context; that's what the fresh session is for.
