---
name: dsh-pin-upgrade
description: Use when a new DeepSeek Harness (DSH) release appears and this repo's pin (workspace/package.json's @deepseek-ai/dsh and @deepseek-ai/dsh-tools) may need bumping to it. Triggers on "new DSH release", "deepseek-harness released", "check for a DSH update", "bump the DSH pin", or a deepseek-ai/deepseek-harness release URL. Covers this core package's own maintenance — not something a consuming project or harness-eng runs.
---

# DSH Pin Upgrade

This is maintenance on **this repo**, the core package — not on a
project built with it. `harness-eng` and the other shipped skills never
invoke this one; it doesn't belong in `hedgehog-core.yaml`'s manifest.

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
   intermediate alpha can carry a breaking change the latest one's notes
   don't restate.

3. **Grep this repo for anything a breaking or removed feature touches.**
   A change in DSH's release notes only matters here if this core's
   skills, agents, generator, or templates reference it. If the grep
   comes back empty, that feature isn't part of what this core teaches
   or scaffolds — note that and move on, don't block the bump on it.

4. **Re-verify `dsh-plugin-shapes/SKILL.md` against the new tag's own
   docs**, per that file's own instruction: fetch
   `docs/user/develop/framework/events.md` and `service.md` at the new
   tag, and diff them claim-by-claim against the skill's catalog —
   every confirmed event name, confirmed service, and "doesn't exist"
   claim (e.g. `tools/pre-execute`, `ctx.provide()`). If something
   changed, update the skill's catalog to match before touching the pin
   line, not after. If nothing changed, update only the "Verified
   against DSH tag" line to the new tag.

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
- Don't add this skill to `hedgehog-core.yaml`. It's not part of what
  ships to a consuming project.
- Don't treat an app-runtime change (UI behavior, performance, a removed
  persistence backend not referenced anywhere in this repo) as a reason
  to hold the bump — only a change to the plugin-authoring surface
  (`events.md`, `service.md`, the generator, the bundle/manifest shape)
  is in scope for this core.
