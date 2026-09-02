---
name: dsh-plugin-shapes
description: Use whenever `harness-eng` is writing a DSH plugin's own TypeScript — deciding whether it's a tool, hook, UI, or protocol-driver/service shape, or filling in that shape's DSL. Trigger on "write the plugin", "register a tool", "hook into tools/pre-execute", "wire a service", "class-form plugin", "ctx.on", "ctx.tools.register", or any `plugins/*/src/*.ts` edit. Catalogs the four plugin shapes DSH supports with real, doc-verified code — so the plugin body comes from a confirmed DSL instead of a guessed or half-remembered one.
---

# DSH Plugin Shapes

`harness-eng` decides *which* shape a given plugin intent needs — that
judgment call belongs to the task, not to this skill. This skill covers
*how* to write each shape once chosen: the plugin's own TypeScript body,
catalogued against DSH's docs. It doesn't cover the bundle/manifest
wrapper (`package.json`'s `dsh.bundle`, `cordis.patch.yml`) that every
shape shares regardless of which one it implements — that's the
tool-plugin generator's concern, not this skill's.

**Verified against DSH tag `dsh-v0.1.2-alpha.5`** (`docs/user/develop/framework/events.md`
and `service.md` at that tag), the same tag `workspace/package.json` pins
`@deepseek-ai/dsh` and `@deepseek-ai/dsh-tools` to. This is the one owning
statement of which DSH revision this skill's catalog was checked against —
every confirmed-event, confirmed-signature, and "doesn't exist" claim
below is only guaranteed true as of that tag. A re-pin to a newer `rc` or
stable tag needs this skill's claims re-checked against the new tag's own
docs before the pin line above is updated to match; don't bump the pin in
`workspace/package.json` without also re-verifying this file.

## v0.1 generator coverage: tool shape only

`pnpm generate:tool <name>` scaffolds the **tool** shape only. Hook, UI,
and protocol-driver/service plugins have no generator yet in this core —
they're hand-authored using this skill as reference. This is deliberate,
not an oversight: DSH's extension-point vocabulary for hooks and UI
plugins is less stable right now than the tool-registration API, so
building a generator against it wouldn't pay back the investment yet. If
that changes, a generator for one of these shapes is a `planner`
Phase-0-scoped addition to this core, not something to improvise inline.

Every DSH plugin, regardless of shape, is a TypeScript module exporting
`name` and `apply(ctx: Context)`, in one of three structural forms:

**Function form** (most common):
```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'my-plugin'

export function apply(ctx: Context) {
  // Register capabilities here.
}
```

**Object form** (function form plus metadata properties in one literal):
```ts
import type { Context } from '@deepseek-ai/cordis'

export default {
  name: 'my-plugin',
  inject: ['tools'],
  apply(ctx: Context) {
    // ...
  },
}
```

**Class form** (for a plugin that provides a service to other plugins —
see Shape 4, below):
```ts
import { Service, type Context } from '@deepseek-ai/cordis'

export default class MyService extends Service {
  static inject = ['tools']

  constructor(ctx: Context) {
    super(ctx, 'myService')
    // Perform synchronous initialization in the constructor.
  }
}
```

Optional `export const inject = [...]` (function/object form) or `static
inject = [...]` (class form) declares which services the plugin consumes.
The framework loads and readies every declared dependency before the
plugin initializes; a required dependency that later disappears while the
app is running causes dependent plugins to dispose automatically.

DSH's own docs put it plainly: "Function form is sufficient in most
cases. Use class form when the plugin provides a service to other
plugins."

The four shapes below are matches of an *intent* — what the plugin is
for — onto these structural forms, not a fourth and fifth structural
option beyond the three above.

## Shape 1: Tool plugin

The most common and cleanest shape — a plugin that gives the model a new
callable capability. Registers via `ctx.tools.register(defineTool({...}))`
from `@deepseek-ai/dsh-tools`, inside function-form `apply`:

```ts
import { defineTool } from '@deepseek-ai/dsh-tools'

export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: 'greet',
    description: 'Greet someone by name.',
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return `Hello, ${args.name}!`
    },
  }))
}
```

`ctx.tools` is itself an injected service — `inject = ['tools']` is required, not
optional, or the plugin throws `cannot get property "tools" without inject` at
load time.

`defineTool` infers and validates `args` from `parameters`. `execute`
returns the canonical value declared by `output.schema`; `output.render`
converts that value into model-facing content blocks. This is the shape
`pnpm generate:tool <name>` scaffolds — reach for the generator first for
this shape, and use this snippet only to extend or hand-check generated
output, not to hand-roll a tool plugin from scratch.

## Shape 2: Hook plugin

A plugin that observes or intercepts framework activity rather than
exposing a new callable. Registers on a Cordis event or a durable
session-event type via `ctx.on`, inside function-form `apply`.

**Confirmed Cordis-level events** (per `docs/user/develop/framework/events.md`
at the tag pinned above): `agent/pre-step`, `agent/request`,
`agent/request-error`, `tools/result`, `session/event`.

**Confirmed durable session-event types** (delivered through the
`session/event` Cordis event, not separate `ctx.on` names of their own):
`turn/*`, `step/*`, `tool/call`, `tool/result`, `compaction/*`.

Basic listener pattern:
```ts
ctx.on('event-name', (payload) => {
  // Handle the event.
})
```

Emission pattern (a plugin can emit its own events, not just consume
framework ones):
```ts
ctx.emit('event-name', payload)
```

Bail mode — short-circuits on the first listener that returns a
non-null result, useful for a hook that can veto or replace something:
```ts
ctx.on('some-check', (input) => {
  if (shouldBlock(input)) return 'blocked'
})
```

Waterfall mode — each listener can transform the value before it reaches
the next, useful for a hook that rewrites content in a pipeline:
```ts
ctx.on('my-plugin/transform', async (_input, next) => {
  const downstream = await next()
  return downstream.trim()
})
```

Type-safe custom events, via TypeScript declaration merging on Cordis's
own `Events` interface:
```ts
declare module '@deepseek-ai/cordis' {
  interface Events {
    'my-plugin/ready': (payload: { id: string }) => void
  }
}
```

A concrete, doc-given example hooking a real framework event:
```ts
export function apply(ctx: Context) {
  ctx.on('tools/result', (exec, result) => {
    console.log(`[tool] ${exec.name}(${JSON.stringify(exec.arguments)})`)
  })
}
```

**Honesty note:** `events.md` does not document a `tools/pre-execute`
event name — that name does not appear in the fetched doc. Don't invoke
`ctx.on('tools/pre-execute', ...)` or any other extension-point string
not in the confirmed list above; if a plugin's intent needs a hook point
this list doesn't cover, that's a gap in DSH's own docs (or a signal the
event doesn't exist yet), not something to fill by guessing a
plausible-sounding name. Log it with `hedgehog friction add` and pick a
confirmed event or a different shape instead.

## Shape 3: UI plugin

A plugin that drives interactive input or contributes to the built-in Web
Client, rather than registering a tool or a passive hook. Per DSH's own
docs, this shape is real but less stable than the tool shape — the docs
at the tag pinned above describe it only at the level below, with no full
worked example:

- Registers on `session/event` the same way a hook plugin does (see
  Shape 2's `ctx.on('session/event', ...)` pattern) to observe turn,
  step, tool-call, and compaction activity as it streams.
- Drives input via `agent.followup()` / `agent.steer()` — named in DSH's
  docs as the mechanism a UI plugin uses to inject or redirect input, but
  no full signature or code example for either call was present at that
  tag.
- Can contribute a `ConversationNodeDefinition` to the built-in Web
  Client — named as a real extension point, but again with no worked
  example at that tag.

**Honesty note:** treat `agent.followup()`, `agent.steer()`, and
`ConversationNodeDefinition` as confirmed to exist by name, but not
confirmed in their exact shape (parameters, return type, registration
site). Don't invent a signature for any of the three. Before shipping a
UI plugin against one, re-fetch DSH's docs for the specific call (or the
Web Client extension docs, if a more specific page exists) to get the
real signature, and log friction via `hedgehog friction add` if the docs
still don't cover it at the needed depth.

## Shape 4: Protocol-driver / class-form (service) plugin

A plugin that provides a capability *to other plugins*, not to the model
or the user directly — the class form referenced in the three structural
forms above. Extends Cordis's `Service` base class and calls `super(ctx,
serviceName)`:

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    metrics: MetricsService
  }
}

export default class MetricsService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'metrics')
  }

  record(event: string, value: number) { /* ... */ }
}
```

The declaration-merge block on `Context` is what makes `ctx.metrics`
resolve with the right type elsewhere in the workspace — without it,
consumers only get an untyped lookup.

A consuming plugin declares the service as a dependency and then reaches
it directly on `ctx`:
```ts
export const inject = ['tools']
export function apply(ctx: Context) {
  ctx.tools.register(/* ... */)
}
```

Three built-in services ship with the framework and are available to
`inject` without a plugin of your own providing them: `tools`, `llm`,
`agents`.

Dependency handling:
- **Required** — listed in `inject` (or `static inject` in class form);
  the plugin doesn't load until every declared service is ready, and
  disposes automatically if a required service later disappears.
- **Optional** — use `ctx.get('service')` for conditional access instead
  of `inject`, when the plugin should still load without it.
- **Isolation** — the workspace's config file can isolate services per
  plugin group, so two groups can each get their own instance of the
  same service under different configuration.

**Honesty note (correcting an assumption, not the docs):** this shape is
sometimes described as going through a `ctx.provide()` call. That call
does not appear anywhere in DSH's `docs/user/develop/framework/service.md`
at the tag pinned above — the only provisioning mechanism documented
there is extending `Service` and calling `super(ctx, name)`, as shown
above. Don't write `ctx.provide(...)` into a plugin on the assumption
it's the real API; use the `Service` subclass form, and if a future task
genuinely needs a lower-level provisioning call the docs don't cover, log
friction via `hedgehog friction add` rather than guessing at its shape.

## Constraints

- This skill catalogs shape and DSL only — it doesn't judge which of the
  four shapes fits a given plugin intent. That call belongs to
  `harness-eng`, informed by the task at hand.
- Don't invoke an extension-point name (a `ctx.on` event string, a
  service name, a method like `agent.followup()`) that isn't confirmed
  in this file or in a doc you've just re-fetched. A plausible-sounding
  name is still an invented one.
- Where this skill flags a doc as thin or a signature as unconfirmed
  (Shape 3's UI plugin calls, Shape 4's `ctx.provide()` correction), stay
  thin rather than filling the gap — re-fetch DSH's docs for the specific
  call, and log friction via `hedgehog friction add` if the docs still
  don't cover it, instead of shipping a plugin against a guessed API.
- Tool-shape plugins go through `pnpm generate:tool <name>` first; this
  skill's Shape 1 snippet is for extending or hand-checking generated
  output, not for hand-authoring a tool plugin from scratch.
- Doesn't cover the bundle/manifest wrapper (`package.json`'s `dsh.bundle`
  block, `files`, `cordis.patch.yml`'s `insert` entry) — that wrapper is
  the same across all four shapes and is the generator's concern, not
  this skill's.
