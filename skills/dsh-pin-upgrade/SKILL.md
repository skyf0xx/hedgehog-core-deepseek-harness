---
name: dsh-pin-upgrade
description: Use when a new DeepSeek Harness (DSH) release appears and this repo's pin (workspace/package.json's @deepseek-ai/dsh and @deepseek-ai/dsh-tools) may need bumping to it. Triggers on "new DSH release", "deepseek-harness released", "check for a DSH update", "bump the DSH pin", or a deepseek-ai/deepseek-harness release URL. Covers this core package's own upgrade to feature parity with upstream — not something a consuming project or harness-eng runs.
---

# DSH Pin Upgrade

This is an upgrade of **this repo**, the core package — not on a
project built with it. `harness-eng` and the other shipped skills never
invoke this one; it doesn't belong in `hedgehog-core.yaml`'s manifest.

**The goal is feature parity with the tag being adopted, every time —
not damage control.** A bump that only confirms nothing broke and stops
there is an incomplete run of this skill. If the new tag documents a
capability this skill's shapes don't yet catalog — a new confirmed
event, a new `ctx.*` service, a subsystem doc that graduated from thin
to worked-example-complete — cataloging it is not optional follow-up
work; it's what step 4 is for, on every bump, not just the ones where
something looks broken. A pin bump that leaves `dsh-plugin-shapes` only
as current as it needs to be to avoid lying, rather than as current as
the new tag actually allows, has not finished the job.

DSH is pre-1.0 and moves fast. `workspace/package.json` pins
`@deepseek-ai/dsh` and `@deepseek-ai/dsh-tools` to an exact tag rather
than a caret range (`README.md`'s "Working on this core" section is the
owning statement of this policy), and `dsh-plugin-shapes/SKILL.md`
additionally states its own event/service catalog is only guaranteed
true as of the tag named in its "Verified against" line — **don't bump
the pin without re-verifying that file first.**

## Steps

1. **Confirm there's actually a newer tag than what's pinned.** Read the
   current pin from `workspace/package.json`. If the user linked a
   specific release URL, use it directly, but note that a raw
   `#anchor`-fragment URL to a releases page will 404 as a fetch target —
   fetch `https://github.com/deepseek-ai/deepseek-harness/releases`
   itself and read the entry off that page instead.

2. **Read the release notes for every version between the current pin
   and the target**, not just the target's own notes — a skipped
   intermediate alpha can carry a change the latest one's notes don't
   restate. Read for **both directions of change, weighted equally**:
   removals/renames/breaking API shifts, *and* new features, new
   sections, new services, or a previously-thin doc becoming complete
   enough to catalog. A new capability that this core doesn't yet teach
   is exactly as much this step's business as a removal that would make
   it teach something false — don't let the word "breaking" narrow what
   counts as worth chasing.

   This step is a *trigger for investigation*, not something step 4's
   doc diff automatically covers on its own: for every item you find —
   a `ctx.something` removed or added, a type demoted from class to
   interface, a renamed method, a new event, a new subsystem, an "Out of
   scope" item in `dsh-plugin-shapes/SKILL.md` that a doc now resolves —
   identify which specific subsystem doc file owns that symbol. Don't
   assume it falls inside whatever doc set step 4 happens to check. Add
   that doc file to step 4's fetch list explicitly if
   `dsh-plugin-shapes/SKILL.md` doesn't already cite it, and fetch it
   before treating the item as resolved (added, corrected, or
   deliberately left out with a reason — not merely noticed). A symbol
   change or new feature that release notes surface but no subsystem doc
   confirms is friction to log via `hedgehog friction add`, not something
   to wave through on the changelog line alone, and not something to
   drop just because it's additive rather than breaking.

3. **Grep this repo for anything a removed or changed feature touches.**
   A *removal or rename* in DSH's release notes only requires a code fix
   here if this core's skills, agents, generator, or templates reference
   the old symbol. If that grep comes back empty, no existing code needs
   fixing — note that and move on.

   This grep step is about existing code only; it says nothing about
   whether to catalog a **new** feature. Don't run the same "empty grep,
   move on" logic against additions — a new `ctx.*` service or event
   won't appear in a grep of this repo precisely because nothing here
   uses it yet, and that absence is the parity gap, not a reason to skip
   it. Every new-feature item step 2 surfaced goes to step 4 regardless
   of what this grep finds.

   An empty grep result also says nothing about whether
   `dsh-plugin-shapes`'s catalog makes a claim about that symbol that the
   new tag has now falsified. A stale "doesn't exist" or "confirmed"
   claim about a symbol nothing in this repo happens to call yet is still
   a claim this skill is on the hook for — step 4 is what closes it out,
   via the owning doc identified in step 2.

4. **Re-verify `dsh-plugin-shapes/SKILL.md` against the new tag's own
   docs — using that file's citation list, read live, not a copy pasted
   into this step.** Open `dsh-plugin-shapes/SKILL.md` and read its
   "Verified against DSH tag" section: it names every doc file its
   catalog currently draws from, split by which shapes/sections each doc
   backs. Build your fetch list from that reading, plus:
   - any doc file step 2 identified as the owner of a release-note item,
     even when `dsh-plugin-shapes` doesn't cite it yet, and
   - the new tag's own release notes, always, regardless of what
     `dsh-plugin-shapes` cites.

   Fetch that full set at the new tag and diff each doc claim-by-claim
   against the skill's catalog: every confirmed event name, confirmed
   service/method signature, and "doesn't exist"/"was removed" claim —
   and also every section of a cited doc the catalog doesn't yet cover
   at all. Treat these as equally mandatory, not the second one as
   optional polish:
   - **Corrections**: something the catalog claims is now wrong (renamed,
     removed, signature changed) — fix it.
   - **Parity additions**: a confirmed event, service, method, or shape
     the new tag's docs support that the catalog doesn't catalog yet,
     including an "Out of scope, and why" entry whose stated blocker (a
     thin doc, a missing example) the new tag has resolved — add it as a
     new shape or extend an existing one, with the same doc-verified
     code and honesty-note treatment as the rest of the file. A `dsh`
     release note calling something out under "New Features" is a
     prompt to check whether it's plugin-authoring surface the same way
     a breaking-change note is a prompt to check whether it's a
     correction — don't apply that scrutiny to one direction and not the
     other.

   Update the skill's catalog to match what you find — including its
   "Verified against" section, so it lists exactly the doc set this
   re-check used — before touching the pin line, not after. Do this even
   when the only outcome is "nothing to correct, nothing new to add";
   still update the "Verified against DSH tag" line (and add any doc
   filenames step 2 surfaced) to the new tag. But don't reach for that
   outcome by only checking for corrections and skipping the parity
   pass — the two checks are separate and both required.

   Also re-check the skill's "Out of scope, and why" section against
   this same live reading — a tag that adds a `ctx.*` service to a
   subsystem currently listed as out of scope moves it into scope and
   needs a new shape added, not just a version-line bump.

   **Never hardcode `dsh-plugin-shapes`'s doc list into this step.**
   Read its citation list fresh every time a pin bump runs. The moment
   this file names specific filenames as "the set to check," a later
   widening of `dsh-plugin-shapes`'s scope can drift silently out of what
   bumps re-verify — the two skills stay in lockstep only if this step
   derives its fetch list from the other skill's own current statement
   of scope, never from a snapshot of it.

5. **Bump the pin.** Update `@deepseek-ai/dsh` and `@deepseek-ai/dsh-tools`
   in `workspace/package.json` (leave `@deepseek-ai/cordis` alone unless
   the release notes specifically call out a Cordis bump too), then run
   `pnpm install` inside `workspace/` to regenerate `pnpm-lock.yaml`.
   Diff the lockfile before trusting it — confirm the version-string
   changes are the only real content change. An unrelated importer
   disappearing from the lockfile (e.g. a stale entry for a
   `plugins/*` directory that no longer exists on disk, since `plugins/`
   ships with only a `.gitkeep`) is expected pnpm pruning, not something
   this bump caused — don't chase it.

6. **Bump this package's own version**: `npm version patch -m "chore:
   bump version to %s" --no-git-tag-version` in the repo root (matches
   the `release` script in `package.json`, run manually here so the
   version bump commit can be batched with the pin change).

7. **PR and merge**, per this repo's own process (`README.md`'s
   "Working on this core" section): a change here is a release of this
   package. This repo's GitHub squash-merge is disabled — use a merge
   commit (`gh pr merge --merge`), not `--squash`. Wait for CI checks to
   pass before merging.

## What NOT to do

- Don't bump the pin on release notes alone. The grep-and-diff steps
  above are what makes the bump safe — skipping them is exactly the
  drift `dsh-plugin-shapes`'s own header warns against.
- Don't treat this as maintenance whose job is done once nothing is
  broken. A bump that re-verifies existing claims but never asks "does
  the new tag teach something we don't yet catalog" has only done half
  of step 4. The point of bumping the pin is to stay at feature parity
  with upstream, not just to avoid shipping a stale or false claim.
- Don't skip a new-feature item because grepping this repo for it comes
  back empty. That emptiness is expected — it's *why* the feature isn't
  covered yet — not a signal to drop it. Only step 3's removal/rename
  check gets to use an empty grep as a reason to stop.
- Don't add this skill to `hedgehog-core.yaml`. It's not part of what
  ships to a consuming project.
- Don't treat an app-runtime change (UI behavior, performance, a removed
  persistence backend not referenced anywhere in this repo) as a reason
  to hold the bump — only a change to the plugin-authoring surface (the
  doc set `dsh-plugin-shapes/SKILL.md` currently cites, the generator,
  the bundle/manifest shape) is in scope for this core. What counts as
  "the doc set" grows as `dsh-plugin-shapes` grows — don't reason about
  scope from a memory of which files used to matter.
- Don't let step 4's fetch list be a fixed list of filenames, in this
  file or in your own head. Re-derive it from `dsh-plugin-shapes/SKILL.md`'s
  current "Verified against" section on every run.
