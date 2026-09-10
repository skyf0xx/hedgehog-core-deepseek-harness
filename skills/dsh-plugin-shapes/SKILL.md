---
name: dsh-plugin-shapes
description: Use whenever `harness-eng` is writing a DSH plugin's own TypeScript — deciding whether it's a tool, hook, UI/slot, protocol-driver/service, agent-team, subagent, job, workflow, webhook, session-query, or Web Client slot/panel shape, or filling in that shape's DSL. Also the reference for the Agent-passing pattern that replaced `ctx.agent` and the `agent.inbox` API that replaced the `Inbox` runtime class. Trigger on "write the plugin", "register a tool", "hook into tools/pre-execute", "wire a service", "class-form plugin", "ctx.on", "ctx.tools.register", "ctx.agent", "agent.inbox", "spawn a subagent", "ctx.agentTeams", "ctx.jobs", "ctx.workflowEngine", "ctx.webhookRuntime", "ctx.sessionQuery", "ctx.slots", "ctx.sidebarRightTabs", "ctx.sidebarRight", "sidebar panel", "Web Client slot", or any `plugins/*/src/*.ts` edit. Catalogs the plugin-facing shapes DSH supports with real, doc-verified code — so the plugin body comes from a confirmed DSL instead of a guessed or half-remembered one.
---

# DSH Plugin Shapes

`harness-eng` decides *which* shape a given plugin intent needs — that
judgment call belongs to the task, not to this skill. This skill covers
*how* to write each shape once chosen: the plugin's own TypeScript body,
catalogued against DSH's docs. It doesn't cover the bundle/manifest
wrapper (`package.json`'s `dsh.bundle`, `cordis.patch.yml`) that every
shape shares regardless of which one it implements — that's the
tool-plugin generator's concern, not this skill's.

**Verified against DSH tag `dsh-v0.1.5-rc.1`.** Shapes 1-4 and the
"Every plugin body" structural forms were checked against
`docs/user/develop/framework/events.md` and `service.md`. The Agent/Inbox
section and Shapes 5-9 were checked against `docs/subsystems/core.md`,
`docs/subsystems/agent-team.md`, `docs/subsystems/subagent.md`,
`docs/subsystems/jobs.md`, `docs/subsystems/workflow.md`,
`docs/subsystems/webhook.md`, `docs/subsystems/session-query.md`. Shape 10
was checked against `docs/subsystems/slots.md` and
`docs/subsystems/sidebar-right.md`. All of the above plus the
`dsh-v0.1.5-rc.1` release notes were read at that tag, the same tag
`workspace/package.json` pins `@deepseek-ai/dsh` and `@deepseek-ai/dsh-tools`
to. This is the one owning statement of which DSH revision this skill's
catalog was checked against — every confirmed-event, confirmed-signature,
and "doesn't exist" claim below is only guaranteed true as of that tag. A
re-pin to a newer `rc` or stable tag needs this skill's claims re-checked
against the new tag's own docs before the pin line above is updated to
match; don't bump the pin in `workspace/package.json` without also
re-verifying this file.

## Out of scope, and why

Not every subsystem DSH documents is plugin-authoring surface. Checked and
excluded at this tag:

- **`sdk-minimal`/`minimal` default-tool-set changes** (v0.1.5-alpha.2's
  "Minimal-profile default tools" note: Web `minimal` and Python
  `sdk-minimal` are now shell-only by default, with `str_replace_editor`
  requiring explicit opt-in) — this is bundle/profile composition
  (`cordis.patch.yml`, `dsh plugin --profile`), the same bundle/manifest
  wrapper this skill already excludes below as the generator's concern, not
  a `ctx.*` service or plugin-authoring DSL change. A plugin author's Shape
  1-9 code is unaffected; only which tools a given profile preloads by
  default changed.
- **MCP client pagination-cursor rejection** (v0.1.5-alpha.2 bug fix) —
  internal robustness of `dsh-mcp-client` consuming a misbehaving external
  MCP server, not a `ctx.*` surface a DSH plugin author calls.
- **`docs/subsystems/scope.md`** (`ScopeKey`, `Scoped<T>`, `ScopeLayer`) —
  a dependency-free internal library primitive that `agent`, `session`,
  and other registries build per-agent scoping on top of. It has no Cordis
  service of its own (no `ctx.scope`) and nothing a plugin author calls
  directly; the shapes below that need scoping (Shape 2's `ctx.on`, Shape
  4's `Service` subclass) already cover the plugin-visible surface.
- **`docs/subsystems/schedule.md`** (session-local absolute-time and
  fixed-rate schedule entries) — has no generated Cordis API section in
  its doc at this tag (no `ctx.schedule` or equivalent); it's a Web
  catalog/app feature (durable records, active views, read-only Web
  catalog) with no plugin-facing registration point found. If a future
  tag adds one, re-check this file before assuming it's still out.

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

**Honesty note:** treat `agent.followup()` and `agent.steer()` as
confirmed to exist by name; their exact signatures are now resolved by
the Agent-passing section below. `ConversationNodeDefinition` named here
in earlier tags does not appear in `dsh-v0.1.5-alpha.2`'s `slots.md` —
the real, doc-verified Web Client contribution mechanism as of this tag
is the general `ctx.slots` registry and, for the right-Sidebar
specifically, `ctx.sidebarRightTabs`, both catalogued in full as Shape
10, below. Use Shape 10 for any new UI-plugin work rather than this
shape's older, thinner description.

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

## Agent-passing and `agent.inbox` (replaces `ctx.agent` and `Inbox`)

**As of `dsh-v0.1.5-alpha.1`, `ctx.agent` no longer exists.** Per that
release's own notes ("插件 Agent API 调整" / "Agent plugin API changes"):
"Remove `ctx.agent` and require callers to pass the Agent explicitly."
Confirmed against `docs/subsystems/core.md`'s `ctx.agents` (`AgentRegistry`)
section at that tag — there is no `ctx.agent` getter anywhere in it. A
plugin written against an older DSH rc that reads `ctx.agent` will fail to
compile against the pinned tag; that's this change, not a regression to
work around.

**What replaced it — two ways to get an `Agent`, per `docs/subsystems/core.md`:**

1. **Explicit parameter.** Any call that used to read `ctx.agent` now
   takes the `Agent` as an argument instead. This is the pattern
   throughout every doc-verified service below (`ctx.agentTeams`,
   `ctx.subagents`, `ctx.workflowEngine`) — every method that needs an
   acting agent takes `agent: Agent` explicitly rather than reading it
   ambiently. Design your own hook or service the same way: if a callback
   needs "the agent driving this," take it as a parameter, not from `ctx`.

2. **`ctx.agents.currentInitiator()` / `ctx.agents.requireInitiator()`**,
   for the case an explicit parameter genuinely isn't available (logging,
   tracing, metrics, host attribution) — the process-local initiator
   carried through the current asynchronous driver chain:
   ```ts
   export const inject = ['agents']
   export function apply(ctx: Context) {
     ctx.on('tools/result', () => {
       const agent = ctx.agents.currentInitiator() // Agent | undefined
       // requireInitiator() instead, if absence should throw
     })
   }
   ```
   Per the doc: "Ambient presence is neither liveness proof nor
   authorization" — don't use either method as an authorization check;
   they're for attribution only.

**`agent.inbox` — the `Inbox` type, not a runtime class.** Per the same
release's notes ("Inbox API 调整" / "Inbox API changes"): "Make `Inbox` a
type-only interface instead of an exported runtime class. Plugins access
pending messages through `agent.inbox`; `hasPending` and `claim` are no
longer public API." Confirmed against `core.md`'s `Agent`/`Inbox`
interfaces: `Agent.inbox` is a readonly property (`readonly inbox: Inbox`),
and `Inbox` exposes `nextTurn`/`nextStep` (readonly arrays) plus
`clear()`, `append()`, `prepend()`, `replace()`, `remove()`, and `splice()`
— no `hasPending` or `claim` anywhere in the interface:

```ts
function inspectInbox(agent: Agent) {
  const pending = [...agent.inbox.nextTurn, ...agent.inbox.nextStep]
  agent.inbox.append('next-turn', someUserMessage)
}
```

**Honesty note:** `Agent`, `Inbox`, `InboxTarget`, and `UserMessage` are
declared in `packages/core/agent/src/types.ts` per `core.md`'s own
"Source" lines — not in `@deepseek-ai/cordis` (that package owns `Context`
and `Service`, per Shape 4's confirmed imports). The doc does not state
which published npm package re-exports these agent types, or under what
name. Don't guess an import specifier for `Agent`/`Inbox`/`InboxTarget`/
`UserMessage` — check the actual `dsh` / `dsh-agent-*` package's exports at
the pinned tag (or the generated `.d.ts` in `node_modules` after `pnpm
install`) before writing the import line, and log friction via `hedgehog
friction add` if the published package doesn't cleanly re-export them.

Don't `import { Inbox } from ...` expecting a constructible class
regardless of where you resolve the type from, and don't call
`agent.inbox.hasPending()` or
`agent.inbox.claim()` — neither exists at this tag. Claiming (removing the
proposed batch at a step boundary) is loop-internal
(`ReactLoopInbox`) and, per the doc, explicitly "not part of `Agent.inbox`."
A plugin that needs to react to a message leaving the inbox listens for
the `agent/inbox/claimed`, `agent/inbox/inserted`, or `agent/inbox/discarded`
events (Shape 2's `ctx.on` pattern) instead of polling or claiming.

The `Agent` interface's other members most plugins reach for:
`agent.followup(message)` (queue an ordinary follow-up turn),
`agent.steer(message)` (submit steering for the nearest step boundary),
`agent.inject(message)` (queue model-facing context for the next pre-step
without waking the driver), `agent.send(message, target, wakeup)` (the
unified primitive the three aliases above are built on), `agent.cancel(cause,
options)`, and `agent.whenIdle()`. These match the signatures in
Shape 3's `agent.followup()` / `agent.steer()` mentions — that shape's
honesty note about unconfirmed exact signatures is now resolved by this
section for `followup`/`steer`/`inject`/`send`; what Shape 3 still leaves
unconfirmed is only `ConversationNodeDefinition`, the Web Client
contribution point.

## Shape 5: Agent Team plugin (`ctx.agentTeams`)

A plugin that builds or coordinates a multi-agent team — spawning
teammates, passing messages between them, and managing a shared task DAG.
Confirmed against `docs/subsystems/agent-team.md`'s generated Cordis
surface. This is an **experimental** package (`packages/experimental/agent-team`
per the doc) — treat the surface as more likely to shift than Shapes 1-4.

Every method takes the acting `Agent` as an explicit first argument (the
pattern described above, not `ctx.agent`):

```ts
export const inject = ['agentTeams']
export function apply(ctx: Context) {
  ctx.on('tools/result', async (exec, result) => {
    const agent = ctx.agents.currentInitiator()
    if (!agent) return
    const membership = ctx.agentTeams.tryMembership(agent)
    if (!membership) return // not a Team member

    const roster = ctx.agentTeams.listMembers(agent)
    await ctx.agentTeams.sendMessage(agent, {
      /* target name, content, pre-queue cancellation — see doc for exact request shape */
    })
  })
}
```

Confirmed methods: `membership(agent)`, `listMembers(agent)`,
`spawnTeammate(caller, request)`, `sendMessage(caller, request)`,
`createTask(caller, request)`, `getTask(caller, id)`, `listTasks(caller)`,
`updateTask(caller, request)`, `waitForChange(caller, timeoutMs, signal)`,
`interrupt(caller, targetName)`, `tryMembership(agent)` (the non-throwing
form — returns `undefined` for a non-Team subagent instead of throwing).
The exact field shapes of `SpawnTeammateRequest`, `SendTeamMessageRequest`,
`CreateTeamTaskRequest`, and `UpdateTeamTaskRequest` are declared in
`packages/experimental/agent-team/src/types.ts` per the doc, not restated
in prose there — read that source file (or re-fetch the doc's full type
block) before constructing one of these request objects rather than
guessing field names.

**Honesty note:** the doc explicitly defers "operation, authorization,
recovery, and limit behavior" to the package README
(`packages/experimental/agent-team/README.md`), which this pass did not
fetch. Don't assume a call succeeds unconditionally or invent a rejection
shape — re-fetch that README before writing error handling around this
service, and log friction via `hedgehog friction add` if it's still thin.

## Shape 6: Subagent-spawning plugin (`ctx.subagents`)

A plugin that delegates work to a subagent — either a one-shot run or a
durable continuable child (e.g. a Claude Code or Codex backend, per the
built-in providers the v0.1.5-alpha.1 release notes mention bumping).
Confirmed against `docs/subsystems/subagent.md`'s generated Cordis surface.

Two request shapes, matching the doc's "two kinds of capability" framing:

```ts
export const inject = ['subagents']
export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'delegate-oneshot',
    // ...
    async execute(args) {
      const run = await ctx.subagents.start('claude-code', {
        /* label, prompt, parent, signal, optional capabilities — see doc */
      })
      return run.result // SubagentResult, per the doc
    },
  }))
}
```

For a durable continuable child instead of a one-shot run:
```ts
// ContinuableStart's exact field names aren't restated in doc prose —
// confirm them against packages/subagent/subagent/src before destructuring
const started = await ctx.subagents.startContinuable({
  /* provider, delegation request, caller cancellation */
})
// later, from the parent Agent (targetId is the durable child session id):
await ctx.subagents.sendMessage(parentAgent, started.childId, contentBlocks, {})
```

Confirmed methods: `start(name, request)` (one-shot, returns
`SubagentRun`), `startContinuable(spec)` (durable child), `sendMessage(sender,
targetId, content, options)`, `interrupt(targetSessionId, authority)`,
`listChildren(parentSessionId, signal?)`, `listDescendants(rootSessionId,
signal?)`, `registerProvider(provider)` / `getProvider(name)` / `list()`
(provider registry, distinct from the instance-level `list()` on other
services), `drainContinuableDescendants(parents)`,
`drainContinuableChildren(parent, childIds)`. A plugin that implements its
own backend (rather than delegating to a built-in one) implements
`SubagentProvider` and calls `registerProvider` — the doc names this
contract but its full method-by-method shape lives in `docs/subsystems/subagent.md`'s
"The provider contract: `SubagentProvider`" section; re-read that section
directly before implementing one rather than working from this summary.

**Honesty note:** `SubagentStartRequest`, `ContinuableStartSpec`, and
`SubagentResult`'s exact fields were not transcribed into this skill —
they're substantial doc-given types (see the source doc's "The one-shot
start request," "Continuable children and activations," and "The terminal
result" sections). Read those sections directly when constructing a
request rather than guessing field names; log friction via `hedgehog
friction add` if a needed field still isn't documented at the depth
needed.

## Shape 7: Background job plugin (`ctx.jobs`)

`ctx.jobs` is an **abstract seam**, not a ready-to-call service by
default — per `docs/subsystems/jobs.md`: "Subclass, implement the
abstract methods, and load the subclass as a plugin — it registers as
`ctx.jobs` (one implementation per context; loading a second throws)."
The doc names the package for the Service Definition contract as
`dsh-jobs` (`packages/jobs/jobs`), and confirms a ready-made concrete
provider already exists: `dsh-jobs-local`'s `LocalJobRegistry` (process-local,
with a configurable `maxConcurrentJobsPerOwner`, default `10`). **Load
`dsh-jobs-local` and use `ctx.jobs` directly** rather than subclassing
`JobRegistry` yourself, unless the plugin's whole purpose is providing an
alternative job backend (the class form from Shape 4, applied to this
specific abstract contract — same shape, just a different base class):

```ts
export const inject = ['jobs']
export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'start-long-task',
    async execute(args) {
      const agent = ctx.agents.currentInitiator()
      const id = ctx.jobs.start(/* spec: identity, owner, synchronous starter */)
      return id
    },
  }))
}
```

Confirmed methods on `ctx.jobs`: `start(spec)`, `list(caller?)`,
`get(id, caller?)`, `read(id, caller?)`, `kill(id, caller?, reason?)`,
`wait(id, timeoutMs, caller?, signal?)`, `onJobDone(listener)`,
`onJobsChanged(listener)`, `attachController(name)` — each optional
`caller` an explicit `Agent` (the same explicit-passing pattern as
everywhere else in this catalog; a non-agent caller sees only unowned
jobs). Ownership is fenced by the caller's session id: "Ids are
predictable, so authorization — not secrecy — is the boundary," per the
doc. A job controller (something that can read/stop jobs for a scope of
owners) calls `attachController(name)` — `start` refuses work for an
owner no attached controller serves.

**Honesty note:** `JobStart`, `JobSnapshot`, and `JobRead`'s exact fields
are declared in `packages/jobs/jobs/src/types.ts` per the doc's source
link, not fully restated in this skill. Confirm field names against the
doc or source before constructing a `JobStart` spec.

## Shape 8: Workflow-scripting plugin (`ctx.workflowEngine`)

Another **abstract seam** (per `docs/subsystems/workflow.md`): "Workflow
Service Definition contract." The confirmed surface is a single method:

```ts
export const inject = ['workflowEngine']
export function apply(ctx: Context) {
  const run = ctx.workflowEngine.start({
    /* script, args, parent agent, optional cancel signal — see WorkflowStartRequest */
  })
  // run.result resolves when the script settles
}
```

A plugin observes workflow execution via the confirmed `workflow/*`
events (Shape 2's `ctx.on` pattern): `workflow/start`, `workflow/phase`
(a `phase(title)` call in the script), `workflow/log` (a `log(message)`
call), `workflow/agent-start` / `workflow/agent-end` (paired by
`agent.seq`, one per `agent()` call the script makes), and `workflow/end`
— which deliberately omits the result value in its payload
(`WorkflowResultInfo`), per the doc's own note.

**Honesty note:** `WorkflowStartRequest`, `WorkflowRun`, and the script
language itself (what a workflow script's body can actually contain
beyond `agent()`, `log()`, and `phase()` calls) are not covered by this
skill — `docs/subsystems/workflow.md` and its package source are the
place to confirm those before writing a script or a plugin that
constructs `WorkflowStartRequest` by hand.

## Shape 9: Read-oriented plugin services (`ctx.webhookRuntime`, `ctx.sessionQuery`)

Two more confirmed `ctx.*` services, narrower than the shapes above:

**`ctx.webhookRuntime`** (per `docs/subsystems/webhook.md`) turns
authenticated external deliveries into new root Sessions. A plugin
registers a trusted rule:
```ts
export const inject = ['webhookRuntime']
export function apply(ctx: Context) {
  const disposeAsync = ctx.webhookRuntime.register({
    // a unique id, a provider kind, and run(delivery, signal) — exact
    // field names are declared in WebhookRule<K>, not restated in prose
    // by the doc; confirm them in packages/webhook/webhook/src before typing this literally
    async run(delivery, signal) {
      // return null, or one WebhookSessionRequest
      return null
    },
  })
}
```
Confirmed: `register(rule)` returns `() => Promise<void>` — an awaitable
effect disposer that "aborts and drains this rule's active callbacks," per
the generated signature (not a synchronous disposer like Shape 4's
service-registration examples). `dispatch(delivery)` is fire-and-forget
and is the runtime's own entry point (called by a provider adapter like
`dsh-webhook-github`, not typically by a rule-registering plugin). Per the
doc: "The runtime has no queue, retry, deduplication, execution status,
crash replay, ... or completion result" — don't build a plugin that
assumes any of those exist.

**`ctx.sessionQuery`** (per `docs/subsystems/session-query.md`) is a
read-only, live-preferred query service over the session corpus:
`observeSession(sessionId, options)`, `searchSessions(request, exec?)`,
`searchEvents(request, exec?)`, `listSessions(signal?)`,
`readSession(sessionId)`, `filterSessions(filters, signal?)`,
`readTitle(sessionId, signal?)`, `listEvents(sessionId)`. No mutation
methods are documented on this service — treat it as read-only.

**Honesty note:** neither service's full request/filter type
(`SessionSearchRequest`, `SessionResultFilter`, `WebhookSessionRequest`,
`WebhookEventOf<K>`) is transcribed here. Confirm field names against the
linked doc or its source file before constructing one, and log friction
via `hedgehog friction add` if a needed shape isn't covered at the depth
you need.

## Shape 10: Web Client slot/panel plugin (`ctx.slots`)

A plugin that contributes UI into the built-in Web Client — a sidebar
panel, a conversation header action, a right-Sidebar tab type — rather
than registering a tool, hook, or backend service. Confirmed against
`docs/subsystems/slots.md`'s generated Client surface. This resolves
Shape 3's former "Sidebar UI"/`ConversationNodeDefinition` honesty note:
as of `dsh-v0.1.5-alpha.2`, this is a real, doc-verified, `ctx.*`-backed
extension point, not an app-runtime-only feature.

`ctx.slots` is the Web Client's typed React composition registry. A
feature plugin contributes a component into a named slot with
`ctx.slots.register()`, and — when contributing into a slot it doesn't
itself own — waits for the owning declaration's lifetime with
`ctx.slots.inject(key, callback)` first:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

type HeaderActionProps = PropsRuntime<'conversation.session.header.actions'>

function HeaderAction({ useSession }: HeaderActionProps) {
  const running = useSession(snapshot => snapshot.running)
  return <button disabled={running}>Review</button>
}

export const inject = ['slots']

export function apply(ctx: Context): void {
  ctx.slots.inject('conversation.session.header.actions', () =>
    ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'review',
      order: 100,
    }, HeaderAction))
}
```

**Cardinality** (fixed per slot by its declaration): `single` (one cell,
priority winner renders), `list` (cells addressed by required `id`,
ordered by `order` then registration order), `keyed` (the owner dispatches
an `entryKey`; the matching cell renders), `chain` (each entry supplies
`select(owner)`; the first non-null result in priority order renders).
**Scope** (also fixed per slot): `root` (one instance), `session-maybe`
(renderable without a Session; Session values optional), `session`
(requires a resolved Session binding). `priority` is a shadowing rank for
`single`/`list`/`keyed` and an election order for `chain` — lower values
run or render first.

A registered component receives: owner values and standard scope values
(`PropsRuntime<K>`), authorized child renderers for any slot it declares
itself (`PropsRenderSlots<S>`), a selector hook and mutations for a
declared `store` (`PropsStore<H>`), private data/callbacks from a
registration-level `inject` factory (`InjectFace<I>`), a localized `t`
from a declared `locale` namespace, and — for a `chain` slot — the elected
`matched` value. Components never receive `ctx` directly; services and
model objects stay in the `apply` closure and are projected into
callbacks or observable sources passed through `inject`. Framework-wide
standard props available by scope include `useSessions`,
`useWorkspaces`, `usePanelInfo` (every scope), and — for `session`/
`session-maybe` — `sessionId`, `useSession`, `useProjection`,
`useConversation`, `useInput`, `inputActions`.

**The shipped hierarchy** (per `slots.md`'s "Current hierarchy") is the
authoritative list of registrable slot keys — a plugin registers only
into a key that appears here; guessing a plausible-sounding key is the
same mistake Shape 2's honesty note warns against for event names:

```text
root
├─ sidebar
│  ├─ sidebar.brand.mark / sidebar.brand.name / sidebar.panellist
│  ├─ sidebar.footer.action / sidebar.workspaces / sidebar.settings
│     └─ (settings.trigger, settings.section, settings.plugins.tab, …)
├─ main
│  └─ main.conversation
│     ├─ conversation.session → conversation.view → conversation.chat.node → …
│     ├─ conversation.session.header → (.actions, .utilities, .corner, …)
│     ├─ conversation.composer / conversation.composer.bar → …
│     └─ conversation.hero.* (brand.mark, workspace, agentPreset)
├─ rightbar
│  └─ rightbar.session
│     ├─ sidebar.right.pane.tab → sidebar.right.tab.guide
│     ├─ sidebar.right.pane.tab.title
│     └─ sidebar.right.tab.menu.item
└─ shell.overlay
```

`sidebar.panellist` and `main` are where a plugin registers a global
panel; `main.conversation` is where the conversation UI itself now lives
— this is the `dsh-v0.1.5-alpha.2` "Web plugin panel API changes" release
note ("插件 Agent API 调整" sibling note "Web 插件面板 API 调整"): plugins
register global panels through `sidebar.panellist` and `main`, and the
former root-level `conversation` slot moved to the `conversation` key
under `main`. Re-run `pnpm run gen-client-catalog`'s generated Client
inspect catalog (or `cordis_inspect what:"client"` against a running
instance) for the exhaustive, current contract of any key — cardinality,
scope, owner props, current occupants, declaration owner, replacement
risk — rather than treating the tree above as exhaustive on its own; it's
a shape reference, not the generated catalog itself.

**Right-Sidebar tab types** are a further, more specific registration on
top of the general slot system, confirmed against
`docs/subsystems/sidebar-right.md`: `ctx.sidebarRightTabs.register(definition)`
registers a tab-type implementation (an `id`, a `kind`, optional resource-
address `patterns`, a `priority` band of `extension`/`builtin`/`fallback`,
optional `canOpen(address)` veto, `title(address)`, optional `guide` entry
metadata), and the tab's body/title are separately registered into the
keyed `sidebar.right.pane.tab` / `sidebar.right.pane.tab.title` slots
under that same `id`:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'

export const inject = ['sidebarRightTabs', 'slots']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: '@acme/dsh-client-ui-image',
    kind: 'image',
    patterns: ['*.png', '*.jpg', '*.gif', '*.svg'],
    canOpen: address => address.startsWith('dsh-resource://file/'),
    title: address => address.slice(address.lastIndexOf('/') + 1),
  }), 'image type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: '@acme/dsh-client-ui-image' },
    ImageBody,
  )), 'image body')
}
```

`ctx.sidebarRight` is the navigation controller a plugin's own UI code
calls to open content: `openResource(address, options?)` for a
`dsh-resource://` address, `openTab(kind, options?)` for a page tab; both
throw for an address/kind nothing claims (a wiring mistake, not a user
error). `close`, `active`, `isExpanded`, `toggleExpanded`, `focus`,
`split`, `float`, and `dock` are the other confirmed methods, all
requiring a mounted Session surface for writes.

**Honesty note:** the tab-type `definition`'s exact TypeScript shape
beyond the fields listed above, the full `SidebarRightResourceParamsMap`/
`SidebarRightTabParamsMap` merge-extensible param types, and
`useTabInfo()`'s complete return shape are not transcribed here — see
`sidebar-right.md`'s "Tab-type registration" and "Slots and owner props"
sections directly before constructing a definition object. Registering a
resource *provider* (as opposed to a Sidebar tab type) goes through
`ctx.resources.register(provider)` per `docs/subsystems/client-resources.md`,
which this pass did not fetch in full — confirm the provider contract
there before implementing one, and log friction via `hedgehog friction
add` if it's thin.

## Constraints

- This skill catalogs shape and DSL only — it doesn't judge which shape
  fits a given plugin intent. That call belongs to `harness-eng`,
  informed by the task at hand.
- **`ctx.agent` does not exist at the pinned tag.** Any plugin body that
  reads `ctx.agent` is either targeting a stale rc or was written from
  memory of one — pass the `Agent` explicitly instead, or use
  `ctx.agents.currentInitiator()`/`requireInitiator()`. See "Agent-passing
  and `agent.inbox`" above before touching any call that used to assume
  `ctx.agent`.
- **`Inbox` is not an importable runtime class.** Access pending inbox
  state through `agent.inbox` (the confirmed `nextTurn`/`nextStep`/
  `clear`/`append`/`prepend`/`replace`/`remove`/`splice` surface); don't
  call `agent.inbox.hasPending()` or `agent.inbox.claim()` — neither is
  public at this tag.
- Don't invoke an extension-point name (a `ctx.on` event string, a
  service name, a method like `agent.followup()`, or a slot key) that
  isn't confirmed in this file or in a doc you've just re-fetched. A
  plausible-sounding name is still an invented one. This includes literal
  field names on a request object this skill left as a placeholder
  comment (Shapes 5, 6, 9, 10) — confirm those against the cited source
  file, don't guess them from the prose description. For Shape 10
  specifically, a slot key must appear in `slots.md`'s "Current
  hierarchy" or the generated Client inspect catalog — don't register
  into a key invented from what "feels like" it should exist.
- Where this skill flags a doc as thin or a signature as unconfirmed
  (Shape 4's `ctx.provide()` correction, the Agent/Inbox section's
  import-specifier gap, Shapes 5/6/7/8/9/10's unrestated request-type
  fields), stay thin rather than filling the gap — re-fetch DSH's docs
  for the specific call, and log friction via `hedgehog friction add` if
  the docs still don't cover it, instead of shipping a plugin against a
  guessed API.
- Tool-shape plugins go through `pnpm generate:tool <name>` first; this
  skill's Shape 1 snippet is for extending or hand-checking generated
  output, not for hand-authoring a tool plugin from scratch.
- Shape 5 (Agent Team) sits on a package the doc itself calls
  experimental; Shapes 7 (Jobs) and 8 (Workflow) are abstract seams by
  the docs' own description, not fixed concrete APIs. Treat all three as
  more likely to move between tags than Shapes 1-4's. Shape 10 (Web
  Client slots) is new to this skill as of `dsh-v0.1.5-alpha.2` and has a
  large, only-partially-transcribed surface (`client-resources.md`'s
  provider contract, the full owner-props table per slot) — treat gaps
  there the same as any other honesty-note gap, not as settled.
- Doesn't cover the bundle/manifest wrapper (`package.json`'s `dsh.bundle`
  block, `files`, `cordis.patch.yml`'s `insert` entry) — that wrapper is
  the same across every shape and is the generator's concern, not this
  skill's.
