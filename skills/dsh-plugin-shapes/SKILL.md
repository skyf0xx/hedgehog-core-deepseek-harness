---
name: dsh-plugin-shapes
description: Use whenever `harness-eng` is writing a DSH plugin's own TypeScript — deciding whether it's a tool, hook, UI/slot, protocol-driver/service, agent-team, subagent, job, workflow, webhook, session-query, Web Client slot/panel, client-resource-provider, agent-preset, scheduled-reminder, or user-question shape, or filling in that shape's DSL. Also the reference for the Agent-passing pattern that replaced `ctx.agent` and the `agent.inbox` API that replaced the `Inbox` runtime class, and for spawning or resuming an agent via `ctx.agents`/`ctx.agentLoop`. Trigger on "write the plugin", "register a tool", "hook into tools/pre-execute", "wire a service", "class-form plugin", "ctx.on", "ctx.tools.register", "ctx.agent", "agent.inbox", "agent/created", "spawn a subagent", "ctx.agentTeams", "ctx.jobs", "ctx.workflowEngine", "ctx.webhookRuntime", "ctx.sessionQuery", "ctx.slots", "ctx.sidebarRightTabs", "ctx.sidebarRight", "ctx.resources", "ctx.agentPresets", "ctx.agents.create", "ctx.agentLoop", "ctx.agentDefaultModel", "agent preset", "tools/pre-execute", "tools/post-execute", "ctx.schedule", "reminder", "ctx.userQuestions", "ask the user", "user-questions/request", "sidebar panel", "Web Client slot", "resource provider", or any `plugins/*/src/*.ts` edit. Catalogs the plugin-facing shapes DSH supports with real, doc-verified code — so the plugin body comes from a confirmed DSL instead of a guessed or half-remembered one.
---

# DSH Plugin Shapes

`harness-eng` decides *which* shape a given plugin intent needs — that
judgment call belongs to the task, not to this skill. This skill covers
*how* to write each shape once chosen: the plugin's own TypeScript body,
catalogued against DSH's docs. It doesn't cover the bundle/manifest
wrapper (`package.json`'s `dsh.bundle`, `cordis.patch.yml`) that every
shape shares regardless of which one it implements — that's the
tool-plugin generator's concern, not this skill's.

**Verified against DSH tag `dsh-v0.2.0-rc.2`.** Shapes 1-4 and the
"Every plugin body" structural forms were checked against
`docs/user/develop/framework/events.md` and `service.md`, with Shape 1's
dynamic-registration note and Shape 2's tool-interception waterfalls
checked against `docs/subsystems/tools.md` (and, for the model-side
`toolUpdate` mode, `docs/subsystems/llm-streaming.md`). The Agent/Inbox
section and Shapes 5-9 were checked against `docs/subsystems/core.md`,
`docs/subsystems/agent-team.md`, `docs/subsystems/subagent.md`,
`docs/subsystems/jobs.md`, `docs/subsystems/workflow.md`,
`docs/subsystems/webhook.md`, `docs/subsystems/session-query.md`. Shape 10
was checked against `docs/subsystems/slots.md`,
`docs/subsystems/sidebar-right.md`, and `docs/subsystems/client-resources.md`.
Shape 11 was checked against `docs/subsystems/core.md`'s `ctx.agentPresets`
section. Shape 12 was checked against `docs/subsystems/schedule.md` and
Shape 13 against `docs/subsystems/user-questions.md`.
`docs/subsystems/otel.md` and `docs/subsystems/credentials.md` were read
at this tag and excluded — see "Out of scope, and why". All of the above
plus the release notes for every version between `dsh-v0.1.7-rc.1` (this
file's previously verified tag) and `dsh-v0.2.0-rc.2` — `dsh-v0.1.7-rc.2`,
`dsh-v0.2.0-rc.1`, `dsh-v0.2.0-rc.2` — were read at the new tag, which
`workspace/package.json` pins `@deepseek-ai/dsh` and
`@deepseek-ai/dsh-tools` to. This is the one owning statement of which DSH
revision this skill's catalog was checked against — every confirmed-event,
confirmed-signature, and "doesn't exist" claim below is only guaranteed
true as of that tag. A re-pin to a newer `rc` or stable tag needs this
skill's claims re-checked against the new tag's own docs — for both
corrections and feature parity, per `dsh-pin-upgrade/SKILL.md` — before the
pin line above is updated to match; don't bump the pin in
`workspace/package.json` without also re-verifying this file.

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
- **`ctx.schedule` is now catalogued as Shape 12**, below — `schedule.md`
  gained a generated Cordis API section (`ScheduleService`, the
  `schedule/changed` event) whose `create` method is not `@Remote`-only.
  Its Web task views, catalog, and delivery-history UI remain app surface.
- **`ctx.otel` (`docs/subsystems/otel.md`)** — a shared OTel transport
  factory (`createEventReporter`, `createSessionLogReporter`) consumed by
  the Host's product- and Session-telemetry adapters. It's telemetry
  infrastructure rather than a capability a feature plugin builds on, and
  its `EventLogOptions`/`SessionLogOptions` shapes are owned by
  `packages/telemetry/otel/README.md`, not the doc. A plugin that
  genuinely needs its own telemetry channel should read that README first
  and log friction via `hedgehog friction add` if it doesn't resolve the
  options shape.
- **`ctx.authorization`, `ctx.credentials`, `ctx.credentialsController`,
  `ctx.deepseekAccount` (`docs/subsystems/credentials.md`)** — the Host's
  credential-resolution and DeepSeek Platform account seams (sign-in,
  balance, bonus notifications, token rejection). These are abstract
  provider seams the Host composition fills and `@Remote` controllers the
  Web app's settings UI calls; no doc-given pattern exists for a feature
  plugin registering against them.
- **LLM adapter authoring (`docs/subsystems/llm-streaming.md`,
  `docs/user/develop/practice/llm-adapter.md`)** — including the
  `toolUpdate` model-info field behind `dsh-v0.1.7-rc.2`'s "dynamic tool
  additions without invalidating KV Cache" release note. Writing an
  `LlmAdapter` is its own practice guide with its own abstract class;
  this skill catalogs only its effect on tool plugins (Shape 1's
  dynamic-registration note).
- **The Plugin Manager page and runtime dependency resolution/unloading**
  (installing, configuring, and live enabling/disabling plugins from the
  Web app; Creator mode installing persistent plugins through Plugin
  Manager rather than its own dynamic definition/execution tools; Auto
  review enabled from the Plugins page, Inspector shipped as a separately
  installed plugin rather than by default; the `dsh` command bundled with
  macOS/Windows Desktop for plugin management) — this
  is the Web app's end-user plugin install/enable/disable surface and
  Creator mode's own scratch-authoring workflow, the same bundle/profile-
  composition category as the `sdk-minimal` item above, not a `ctx.*`
  service or plugin-authoring DSL change. No doc in this skill's citation
  list documents a Cordis surface for it. A
  plugin's own `apply(ctx)` body, `cordis.patch.yml` entry, and Shape
  1-13 DSL are unaffected by how the Web app or Creator mode installs it
  at runtime.
- **`ctx.agentPresets` is now catalogued as Shape 11**, below — see that
  section for what's confirmed and what's still thin.
- **`ctx.jobController` (`JobController`, `docs/subsystems/jobs.md`,
  distinct from the already-catalogued Shape 7 `ctx.jobs`)** — its own
  doc calls it the "Host service backing the generated `ctx.remote.job`
  namespace," and its `kill` method is framed explicitly as killing "one
  background job **on a human's behalf**." All three of its methods
  (`list`, `follow`, `kill`) are `@Remote`-decorated, the same
  client-facing-endpoint marker Shape 10's `useResource`/slot props
  material uses for Web-app-consumed surface rather than plugin-authored
  DSL. This is the Web app's own end-user job-monitoring/kill UI talking
  to the job registry, the same category as the Plugin Manager item
  above, not a capability a plugin registers or calls to build its own
  behavior. A plugin implementing or consuming background jobs uses
  Shape 7's `ctx.jobs` instead. Re-check this file if a future tag turns
  any of `ctx.jobController`'s methods into something a plugin can
  register against rather than only a Remote-consumed read/kill surface.

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

**Registering a tool mid-session** (a `ctx.tools.register` call after
agents already exist, which fires `tools/change`) is recorded in the
Session log as a developer-role `ToolAdditionBlock`/`ToolRemovalBlock`,
per `docs/subsystems/llm-streaming.md`. A model route whose resolved
model info declares `toolUpdate` receives those incremental tool updates
instead of a re-sent complete tool list, which keeps the provider's KV
cache prefix intact; a route without `toolUpdate` still declares the
complete list on every request. Nothing in the tool plugin's own body
changes either way — don't try to opt into or detect this from the
plugin; it's the adapter's and Session's concern.

## Shape 2: Hook plugin

A plugin that observes or intercepts framework activity rather than
exposing a new callable. Registers on a Cordis event or a durable
session-event type via `ctx.on`, inside function-form `apply`.

**Confirmed Cordis-level events** (per `docs/user/develop/framework/events.md`
at the tag pinned above): `agent/pre-step`, `agent/request`,
`agent/request-error`, `tools/result`, `session/event`.

**Confirmed as of `dsh-v0.1.7-rc.1`, per `docs/subsystems/core.md`:**
`agent/created` (serial mode) — fires once an entered agent is ready for
per-agent initialization after factory setup; listeners run in order and
are awaited before creation resolves, and a throw or rejection fails
creation and skips later listeners:
```ts
export function apply(ctx: Context) {
  ctx.on('agent/created', async ({ agent, source, signal }) => {
    // per-agent initialization; must not await agent.whenIdle() or its own owner's disposal
  })
}
```
This is a chore-level rename in the underlying framework (the previous,
unconfirmed `agent/session-start` name some earlier tags' release notes
described never appeared in this skill's catalog, so there is nothing to
migrate here) — treat `agent/created` as the confirmed name going
forward. `agent/disposed` (emit mode, fires after driver quiescence and
scoped-registration unwind) is also confirmed in the same doc, for the
symmetric teardown case.

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

**Tool-interception waterfalls — confirmed per `docs/subsystems/tools.md`.**
`events.md` lists only the framework-level events above; the tool
pipeline's own events live in `tools.md`'s generated `tools/*` section.
`ctx.tools.execute()` runs each call through `tools/pre-execute` →
registered monotonic guards → `tools/execute` → content projection →
`tools/post-execute` → optional `finalizeContent` → `tools/result`. All
four hook points below are scope-filtered: an agent-scoped listener sees
only that agent's calls.

- **`tools/pre-execute`** (waterfall) — `(exec: ToolExecution, next) =>
  Promise<PreToolDecision>`. Allow, deny, cancel, or ask before dispatch;
  `next()` delegates to allow. Arguments cannot be rewritten here — history,
  audit, UI, and execution must agree.
- **`tools/execute`** (waterfall) — `(exec: ToolDispatchExecution, next) =>
  Promise<ToolExecutionResult>`. Around-dispatch wrapper for timeout, retry,
  or metrics; a wrapper may change only `exec.signal`.
- **`tools/post-execute`** (waterfall) — `(exec, result, next) =>
  Promise<PostToolDecision>`. Accept, replace content *or* value (never
  both), attach `additionalContexts`, or `block` with corrective feedback.
- **`tools/change`** (emit, no payload) — the available tool set changed.
  Deliberately unfiltered: a scoped listener sees every change.

`tools/ptc-dispatch-log` (waterfall) is also confirmed, but only rewrites
the durable-log copy of a `run_code` sub-dispatch — reach for it only when
building a spill/redaction policy for PTC logs.

```ts
export function apply(ctx: Context) {
  ctx.on('tools/pre-execute', async (exec, next) => {
    if (exec.name === 'bash' && isDestructive(exec.arguments)) {
      return { kind: 'ask', reason: 'Destructive shell command',
        displayReason: { en: 'This command deletes files. Allow it once?' } }
    }
    return next()
  })
}
```

`PreToolDecision` is `{ kind: 'allow' } | { kind: 'deny'; reason: string;
info?: ToolErrorInfo } | { kind: 'cancel' } | { kind: 'ask'; reason?:
string; displayReason?: { en: string; [locale: string]: string } }` —
`reason` on `ask` is the audited approval reason, `displayReason` the
localized prompt text. `ask` proceeds only when an approval service
returns `allowed-once`; a missing approval channel, a non-grant, or an
agent-less call becomes a denial. Async gates must observe `exec.signal`.
`PostToolDecision` is `{ kind: 'accept'; content?; additionalContexts? } |
{ kind: 'accept'; value; additionalContexts? } | { kind: 'block'; feedback;
additionalContexts? }`.

**Honesty note:** don't invoke an extension-point string that isn't in
the confirmed lists above or in a doc you've just re-fetched; if a
plugin's intent needs a hook point these lists don't cover, that's a gap
in DSH's own docs (or a signal the event doesn't exist yet), not
something to fill by guessing a plausible-sounding name. Log it with
`hedgehog friction add` and pick a confirmed event or a different shape
instead. `ToolExecution`'s full field list (`callId`, `rootCallId`,
`name`, `arguments`, `agent`, `signal`, …) is in `tools.md`'s "Execution"
section — read it there rather than assuming a field exists.

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

**Confirmed as of `dsh-v0.1.7-rc.1`: `ctx.agents` also creates and looks
up agents**, not just attribution reads. A plugin that needs to spin up a
fresh agent (a background-job or workflow plugin's own subordinate agent,
for example) has a doc-verified path:

```ts
export const inject = ['agents']
export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'spawn-worker',
    async execute() {
      const handle = await ctx.agents.create({
        /* shared identity, optional live parent, session seed/metadata,
           agent options — see CreateAgentOptions in core.md */
      })
      return handle.agent.id
    },
  }))
}
```

Confirmed methods: `create(options: CreateAgentOptions): Promise<AgentHandle>`
(construct a fresh agent and session through the registered factory,
returning a handle the owner can tear down), `resume(options:
ResumeAgentOptions): Promise<AgentHandle>` (load a persisted session and
resume an agent on it — rejects if persistence isn't configured), `get(id:
SessionId): Agent | undefined` (look up a live agent by id), `list():
Agent[]` (every live agent, registration order), `isOwnedBy(id, owner):
boolean` (whether a live agent was created through one exact parent's
scoped context). `ctx.agentLoop` (`AgentLoop`, a separate confirmed
service — `inject = ['agentLoop']`) is the concrete factory these calls
delegate to, with its own `create(id, options, meta)`, `createAgent(ownerCtx,
options)`, and `resume(ownerCtx, options)` — reach for `ctx.agents.create`/
`resume` first; use `ctx.agentLoop` directly only when a plugin is
implementing agent creation itself rather than requesting it.

**Honesty note:** `register(agent)`, `enter(agent, owner)`, and
`announce(agent, source, signal?)` are also confirmed methods on
`ctx.agents`, but the doc frames them as an "advanced ordered-lifecycle
primitive" for a plugin implementing its own `AgentFactory` via
`setFactory()` — "ordinary callers use `register`" is the doc's own
guidance for `enter`, and `register` itself is for recording an
already-constructed agent, not the common case. Reach for `create`/
`resume` above unless a plugin's whole purpose is providing an alternative
agent factory (the Shape 4 class-form pattern, applied to
`AgentFactory`); `CreateAgentOptions`, `ResumeAgentOptions`, `AgentHandle`,
and `AgentFactory`'s exact field shapes aren't transcribed here — read
`docs/subsystems/core.md`'s `ctx.agents`/`ctx.agentLoop` sections and
`packages/core/agent-loop/src/index.ts` directly before constructing one.

**Confirmed `ctx.agentDefaultModel`** (`AgentDefaultModelConfig`, a small,
separate service) owns the default model selection independently of any
Host or transport: `currentSelection(): ModelSelection` and `async
saveSelection(next: ModelSelection): Promise<void>`. Saves commit in
submission order; a failed save rejects its own caller without blocking
later saves. `ModelSelection`'s
exact fields (provider, model, optional reasoning selection) aren't
transcribed here — confirm them against the doc or source before
constructing one.

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
`drainContinuableChildren(parent, childIds)`. `listDescendants` walks
parent-owned subagent catalogs recursively in stable pre-order — each row
carries its catalog `parentId` and root-relative `depth` — so a Session
absent from every reachable catalog (an ordinary Session fork, and any
subagent below one) is not discovered; an unreadable child catalog
yields a `corrupt`/`unavailable` diagnostic and stops only that branch,
while a root read failure or cancellation rejects the whole listing.
Don't use it as a complete Session-tree walk; `ctx.sessionQuery`'s
`traceSession` (Shape 9) is the ancestry/descendant tracer. A plugin that implements its
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

**Confirmed `subagent/*` events** (per `docs/subsystems/subagent.md` as of
`dsh-v0.1.7-rc.1`), all Shape 2's `ctx.on` pattern: `subagent/start` (emit
— a provider established a published child; for in-process providers
`ctx.agents.get(info.id)` resolves during this notification),
`subagent/end` (emit — a published child settled, paired with
`subagent/start`), `subagent/provider-added` and `subagent/provider-removed`
(emit — a provider entered or left the registry). Scope-filtered dispatch
on `start`/`end` keys the carrier by the delegating parent, so a
parent-scoped listener sees only its own delegations.

**Confirmed `ctx.subagentModelSelection`** (`SubagentModelSelectionConfig`,
same doc) — a singleton settings owner read when delegation tools are
composed for a Session, with one confirmed method: `current()` returns
`SubagentModelSelectionSettings` (enabled state and allowed routes). Its
exact settings shape isn't transcribed here; read
`packages/subagent/tool-subagent/src/model-selection-settings.ts` before
depending on a specific field.

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
      const id = ctx.jobs.start(/* spec: identity, owner session id, output sources, synchronous starter */)
      return id
    },
  }))
}
```

Confirmed methods on `ctx.jobs`: `start(spec)`, `list(caller?)`,
`get(id, caller?)`, `read(id, caller?)` (consumes the ring from the
model's own cursor), `readAt(id, from, caller?)` (non-consuming, resumes
from a prior read's offset), `kill(id, caller?, reason?)`,
`wait(id, timeoutMs, caller?, signal?)`, `remove(id, caller?)`,
`attachController(name)` — each optional `caller` a `SessionId`, not an
`Agent` (ownership is fenced by session id, not by an explicit-agent
pass). Rather than callback-style `onJobDone`/`onJobsChanged` listeners,
consumers subscribe to one filtered `events` stream carrying lifecycle
events (`registered`, `progress`, `stopping`, `removed`, `settled`) and
`output` events (id + new ring total only, so an observer schedules its
own `readAt`). "Ids are predictable, so authorization — not secrecy — is
the boundary," per the doc. A job controller (something that can
read/stop jobs for a scope of owners) calls `attachController(name)` —
`start` refuses work for an owner no attached controller serves.

The starter (`spec.run`) receives a `JobHandle` — `{ id, append(text,
options?), updateProgress(line) }` — instead of returning a
`readOutput()` closure: a streaming producer calls `handle.append()` as
output arrives, and `updateProgress()` replaces the live progress line.
A job whose result is a single value rather than a stream (a subagent's
report, a workflow's rendered result) returns it as `JobOutcome.result`,
delivered once on the model's next `read()`. `spec.output` can instead
list pull sources (`JobOutputSource`, the subprocess `readFrom` family)
that the registry pumps into the ring on its own cadence — a producer
using pull sources folds nothing into `done`.

**Honesty note:** `JobSpec`'s exact fields (including `owner?: SessionId`
and `output?: readonly JobOutputSource[]`), `JobView`, `JobRead`,
`JobOutputRead`, `JobOutcome`, and `JobEvent`'s full variant shapes are
declared in `packages/jobs/jobs/src/types.ts` and the client-safe
`packages/jobs/jobs/src/view.ts`, not fully restated in this skill.
Confirm field names against the doc or source before constructing a
`JobSpec` or handling a `JobEvent`.

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
`readTitle(sessionId, signal?)`, `listEvents(sessionId)`. As of
`dsh-v0.1.6-alpha.1` the doc also confirms `readTitleSnapshot(...)` and
`readTitleSnapshots(...)` (title plus source header, and title-folding
across a cancellable multi-session observation), `filterEvents(...)`
(semantic event search with provider-independent filters), `readSurface(...)`
(one session's complete current model surface), `traceSession(...)` and
`traceEvent(...)` (ancestry/descendant and event-replacement tracing), and
`readEvent(...)` (one event plus a bounded raw-log context window) — exact
parameter shapes for all of these, old and new, are not transcribed here.
No mutation methods are documented on this service — treat it as read-only.

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
(inherits the surrounding Provider binding but stays renderable without
one; Session values optional), `session` (requires a resolved surrounding
Provider binding, receiving definite Session values). `priority` is a
shadowing rank for `single`/`list`/`keyed` and an election order for
`chain` — lower values run or render first.

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
`useSessionStatus`, `useSessionRetainInfo`, `useWorkspaces`, `usePanelInfo`
(every scope), and — for `session`/`session-maybe` — `sessionId`,
`useSession`, `useProjection`, `useConversation`, `useInput`,
`inputActions`.

**The shipped hierarchy** (per `slots.md`'s "Current hierarchy") is the
authoritative list of registrable slot keys — a plugin registers only
into a key that appears here; guessing a plausible-sounding key is the
same mistake Shape 2's honesty note warns against for event names:

```text
root
├─ sidebar
│  ├─ sidebar.brand.mark
│  ├─ sidebar.brand.name
│  ├─ sidebar.panellist
│  ├─ sidebar.footer.action
│  ├─ sidebar.workspaces
│  │  ├─ sidebar.workspaces.directoryFlow
│  │  ├─ sidebar.workspaces.session.menu.item
│  │  └─ sidebar.workspaces.session.row.action
│  └─ sidebar.settings
│     ├─ settings.trigger
│     ├─ settings.header
│     ├─ settings.action
│     ├─ settings.close
│     ├─ settings.onboarding
│     └─ settings.section
│        ├─ settings.general.item
│        ├─ settings.models.provider-card
│        ├─ settings.models.footer
│        └─ settings.plugins.tab
├─ main
│  ├─ plugins.item
│  ├─ plugins.bundle.config
│  ├─ plugins.row.config
│  ├─ plugins.detail.actions
│  ├─ plugins.detail.badge
│  ├─ plugins.detail.section
│  └─ main.conversation
│     ├─ conversation.session
│     │  └─ conversation.view
│     │     ├─ conversation.chat.node
│     │     │  ├─ conversation.chat.assistant-actions
│     │     │  ├─ conversation.chat.commandview
│     │     │  ├─ conversation.chat.turnTail
│     │     │  └─ tool.call.toolview
│     │     │     ├─ tool.call.images
│     │     │     └─ tool.view.cordis
│     │     ├─ conversation.message.images
│     │     └─ conversation.trajectory.images
│     ├─ conversation.header
│     │  ├─ conversation.header.leading
│     │  └─ conversation.session.header
│     │     ├─ conversation.session.header.lineage
│     │     ├─ conversation.session.header.actions
│     │     ├─ conversation.session.header.utilities
│     │     └─ conversation.session.header.corner
│     ├─ conversation.composer
│     │  ├─ conversation.approval.detail
│     │  └─ conversation.plan-review.actions
│     ├─ conversation.composer.bar
│     │  ├─ conversation.input.attachments
│     │  ├─ conversation.input.permission
│     │  ├─ conversation.input.plan
│     │  └─ conversation.input.model
│     ├─ conversation.input.overlay
│     ├─ conversation.input.dock
│     ├─ conversation.composer.dock
│     ├─ conversation.input.left
│     ├─ conversation.input.right
│     ├─ conversation.hero.brand.mark
│     ├─ conversation.hero.workspace
│     │  └─ conversation.hero.workspace.directoryFlow
│     └─ conversation.hero.agentPreset
├─ rightbar
│  └─ rightbar.session
│     ├─ sidebar.right.pane.tab
│     │  ├─ sidebar.right.tab.guide
│     │  └─ sidebar.right.tab.guide.entry
│     ├─ sidebar.right.pane.tab.title
│     └─ sidebar.right.tab.menu.item
├─ shell.leading
└─ shell.overlay
   └─ shell.quota-notice
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
risk. The tree above is transcribed verbatim from `slots.md` at the
pinned tag; the generated catalog remains the authority for each key's
contract.

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

For an action that must run against the page the user was looking at —
a keyboard command, a deferred menu action — capture the target first and
check it before executing: `focusedTarget(element?)` captures the visible
page under live DOM focus (including an embedding iframe; outside or stale
sidebar markup yields no target), `commandTarget(element?)` additionally
permits the mounted Session's active dock pane for an action initiated
outside the sidebar, and `isTargetCurrent(target)` confirms the captured
`SidebarRightTarget` (Session, pane, host, tab occurrence, navigation
revision) still identifies that page. Reopening or navigating the record
invalidates a captured target; it never retargets to another page.

A tab body can contribute commands for its mounted lifetime through
`useTabInfo()`'s `tab.actions.bindCommands(commands)`:
`SidebarRightTabCommands` is currently an optional `refresh` callback, the
returned disposer releases the registration without removing a newer
body's commands, and the tab lifetime also releases it.
`tab.refreshShortcut` (optional) supplies the effective refresh
shortcut-catalog entry for page controls.

**Honesty note:** the tab-type `definition`'s exact TypeScript shape
beyond the fields listed above, the full `SidebarRightResourceParamsMap`/
`SidebarRightTabParamsMap` merge-extensible param types, and
`useTabInfo()`'s complete return shape are not transcribed here — see
`sidebar-right.md`'s "Tab-type registration" and "Slots and owner props"
sections directly before constructing a definition object.

**`ctx.resources` — the client resource model, confirmed as of
`dsh-v0.1.7-rc.1` per `docs/subsystems/client-resources.md`.** Turns an
address (`dsh-resource://<protocol>/…`) into live data for any Web Client
component, independent of registering a Sidebar tab type. The owner of a
protocol declares its value type on `ResourceProtocolMap` and registers
one provider inside its own `ctx.effect` — a protocol has exactly one
provider; a second registration throws:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-client-resources/client'

interface NoteView { readonly title: string; readonly updatedAt: string }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface ResourceProtocolMap { note: NoteView }
}

export const inject = ['resources', 'remote']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.resources.register<'note'>({
    protocol: 'note',
    async *open(address, { signal }): AsyncIterable<RemoteResult<NoteView>> {
      const id = new URL(address).pathname.slice(1)
      yield await ctx.remote.notes.read(id, signal)
      for await (const change of ctx.remote.notes.follow(id, signal)) yield change
    },
  }), 'my-notes: note resource provider')
}
```

`open(address, { signal })` returns a stream of `RemoteResult` frames —
the current state first, then one frame per change — and must stop when
`signal` aborts; a failure is an `ok: false` frame carrying a
`RemoteFailure`, and a throw inside the stream is a programming error, not
caught by the model. Confirmed methods beyond `register(provider)`:
`ctx.resources.pin(address, signal)` (keeps a resource open without
subscribing, until `signal` aborts — an already-aborted signal pins
nothing) and `ctx.resources.source(address)` (the bare, reference-stable
observable behind the read-side hook below, for callers outside React;
reading its snapshot does not hold the resource).

Every slot component receives `useResource` in its standard props
regardless of scope: `useResource<P>(address)` names the protocol as a
type argument and returns the address's current snapshot — `status: 'none'
| 'loading' | 'live' | 'failed'`, `value` (the latest `ok` value, kept
across a failure), and `failure` (the `RemoteFailure`, only set when
`status` is `'failed'`). Subscribing is what holds the resource open; a
component that mounts while another holder keeps it alive reads the
latest value at once without reopening the stream.

**Honesty note:** `ResourceProtocolMap`'s built-in protocol entries beyond
the doc's own `file`/`subagentchat` examples, and the exact
`RemoteFailure`/`RemoteResult` type shapes, aren't transcribed here —
confirm them against `client-resources.md` or
`packages/client/resources/README.md` before depending on a specific
provider's value shape.

## Shape 11: Agent preset plugin (`ctx.agentPresets`)

A plugin that declares a reusable, YAML-backed Agent composition — the
mechanism `dsh-v0.1.7-rc.1`'s release notes describe as "Agent presets
declared and installed through plugin bundles." Confirmed against
`docs/subsystems/core.md`'s `ctx.agentPresets` (`AgentPresetRegistry`)
section, newly complete enough at this tag to catalog (earlier tags gave
method signatures without enough surrounding context to responsibly
document a worked example):

```ts
export const inject = ['agentPresets']
export function apply(ctx: Context) {
  const dispose = ctx.agentPresets.register(/* PresetDefinition — see honesty note */)
  // dispose() later removes this plugin's registration
}
```

Confirmed methods on `ctx.agentPresets`: `register(definition)` (registers
and eagerly loads a definition; returns a disposer — "the declaring plugin
owns it"; activation failure stays visible in the roster rather than
throwing), `list()` (every declared preset including activation
failures), `remoteExportList()` (the selection roster — current presets,
each marked when it is the default; `@Remote`, for the Web chooser),
`resolve(id?)` (resolve an identity without starting an Agent),
`readDocument(agentPreset)` (a declaration's child-plugin list as YAML,
view-only), `mount(ctx, id?)` (bind an unpublished Agent to the current
preset revision, called from a Agent's own `setup` callback — see the
`CreateAgentOptions`/`AgentSetup` material in the Agent-passing section
above for when `setup` runs), `composeFrom(ctx, parent)` (join a child to
its parent's exact retained revision), `composedPreset(ctx)` (read the
preset id a live Agent is bound to), `serviceFor(agent, name)` (read a
service scoped inside an Agent's isolated preset group),
`recompose(ctx, id)` (rebind a blank Agent — the caller owns the
blank-session check), `select(agent, agentPreset)` (select a preset before
a session's first turn), `acquireScope(id?)` (a disposable revision lease
for cold transcript presentation), and `compositionInventory()` (plugin
rows without creating an Agent).

**Honesty note:** `PresetDefinition`'s exact field shape is still not
spelled out in prose in `core.md` — the doc's JSDoc for `register()` calls
it only "parsed configuration supplied by the declaring plugin." Read
`packages/preset/agent-preset-registry/src/types.ts` directly before
constructing one rather than guessing field names, and log friction via
`hedgehog friction add` if that source file doesn't cleanly resolve the
shape either. Likewise `AgentPreset`, `AgentPresetRoster`,
`AgentPresetDocument`, and `AgentPresetComposition` are named as return
types but not expanded here.

## Shape 12: Scheduled-reminder plugin (`ctx.schedule`)

A plugin that schedules a future follow-up message into a Session — a
one-shot reminder, a fixed-rate check, or a wall-clock recurrence —
without keeping the Session's Agent alive. Confirmed against
`docs/subsystems/schedule.md`'s generated Cordis surface
(`ScheduleService`, package `@deepseek-ai/dsh-schedule`).

**`ctx.schedule` is optional composition.** The shipped Web composition
carries no `schedule` row; it's mounted by the optional experimental
bundle `@deepseek-ai/dsh-experimental-schedule-bundle` (enabled from the
Plugins page, or listed in a profile's `dsh.profile.bundles`) alongside
storage-domain and the Session controller. A plugin that must still load
without it uses `ctx.get('schedule')` (Shape 4's optional-dependency
pattern) rather than `inject`.

```ts
export const inject = ['schedule']
export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'remind-later',
    // ...
    async execute(args, exec) {
      if (!exec.agent) throw new Error('remind-later needs a calling agent')
      const record = await ctx.schedule.create(exec.agent.id, {
        prompt: 'Re-run the flaky integration suite and report.',
        title: 'Flaky suite re-run',
        after_seconds: 1800,
      }, exec.signal)
      return record.id
    },
  }))
}
```

`create(sessionId, request, signal?)` is the one plugin-callable write:
it binds a reminder to the given Session without activating it and
resolves to the durably stored `ScheduleRecord`. `ScheduleCreateRequest`
requires a non-empty `prompt` (the reminder text delivered later), a
`title` (trimmed, non-empty, at most 120 characters — a missing, blank, or
over-long title rejects with `invalid_prompt`; it's never derived from
the prompt), and **exactly one** of six mutually exclusive selectors:
`after_seconds` (positive safe-integer delay), `at` (a strictly future
offset-bearing RFC 3339 string, or `{ date, time, time_zone }`),
`every_seconds` (safe integer ≥ 60, aligned to creation time — elapsed
time, not wall-clock), `daily` (`{ time: 'HH:mm:ss', time_zone }`),
`weekly` (`{ time, time_zone, weekdays }`, ISO weekdays), or `cron`
(`{ expression, time_zone }`, five-field Vixie cron). Wall-clock selectors
require an explicit IANA zone; Schedule never reads browser, Session,
process, or model time-zone context. Cancellation is checked before
persistence begins and does not roll back a write already in flight.

The remaining methods are `@Remote`-decorated management surface the Web
task views call — `list({ sessionId })` (a Session's active tasks),
`catalog()` (every Host task with its Session binding), `history(...)`
(saved deliveries, newest first, `limit` 1-100), `delete({ ... })`, and
`update({ ... })` (replace name, instruction, or timing in place; not
offered for `after`). A plugin may call them, but a plugin whose job is
"show or edit the task list" is duplicating shipped UI. A plugin that
needs to react to task changes listens for **`schedule/changed`** (emit,
no payload — refetch rather than expecting a diff).

**Delivery semantics a plugin must not assume away:** at the due time the
Host resolves the original Session (restoring it cold if needed) and
appends the prompt as a plugin-sourced `followup()` — delivered as a
clearly labelled scheduled user message. It never steers or cancels the
current turn and doesn't wait for model completion. There is no
model-result acknowledgement, execution cancellation, or external
notification channel, and a crash between inbox persistence and the task
write can repeat a delivery — design the reminder prompt to be safe to
receive twice. Delivery requires a Session persistence backend
(`sessionPersistence` is a load-order requirement of this service).

**Honesty note:** `ScheduleRecord`'s per-selector variants,
`ScheduleDeleteRequest`/`ScheduleUpdateRequest`/`ScheduleDeliveryHistoryRequest`'s
fields, and `ScheduleUpdateResult`'s outcome union are declared in
`packages/schedule/schedule/src/types.ts` and `schedule.md`'s "Durable
records"/"Timing edits" sections — not transcribed here. The example
relies on two doc-confirmed facts: `execute`'s second argument is a
`ToolRunContext`, which extends `ToolExecution` and so carries the
optional calling `agent` and required `signal` (`tools.md`); and
`Agent.id` is the agent's `SessionId` (`core.md`).

## Shape 13: User-question plugin (`ctx.userQuestions`)

A plugin that needs a human answer before an agent continues — a
permission gate, a plan-review step, a clarifying choice inside a tool —
or that supplies an alternative answering surface. Confirmed against
`docs/subsystems/user-questions.md`'s generated Cordis surface
(`UserQuestionService`, package `@deepseek-ai/dsh-user-questions`).

**Asking** — `ask(request)` runs the scoped answerer waterfall and waits
for the answer; `askTimed(request, callId, timeoutMs)` waits for a bounded
foreground window and then returns `{ pending: true, callId }` so the
agent can continue independent work (the question stays answerable, and a
late reply arrives as a new user message):

```ts
export const inject = ['userQuestions']
export function apply(ctx: Context) {
  ctx.tools.register(defineTool({
    name: 'pick-target',
    // ...
    async execute(args, exec) {
      const { answers } = await ctx.userQuestions.ask({
        agent: exec.agent,
        signal: exec.signal,
        questions: [{
          id: 'env',
          question: 'Which environment should this deploy to?',
          options: [{ label: 'staging' }, { label: 'production' }],
        }],
      })
      const env = answers.find(a => a.id === 'env')
      return env?.custom ?? env?.selected[0] ?? 'staging'
    },
  }))
}
```

Confirmed request shape: `AskUserQuestionRequest` carries `questions:
AskUserQuestionItem[]`, optional `agent`, optional `signal`, and optional
`wait: { callId, timed? }` (card-keying for Client answerers). Each item
is `{ id, question, detail?, header?, options?: { label, description? }[],
multiSelect?, intent? }`; `intent` is currently only `{ kind:
'plan-review', approve: <option label>, callId? }`, requires `detail`, and
changes presentation only. The answer is `{ answers: { id, selected:
string[], custom?: string }[] }` — for single-select, `custom` overrides
and `selected` is empty; an item with empty `selected` and no `custom` is
a skipped question.

**Who may ask:** when `agent` is supplied it must be the registry's exact
live **runtime root** — an owned child (a subagent) has no human answerer
and is rejected with `DELEGATED_CALLER`; a stale instance with
`CALLER_NOT_LIVE`; an aborted signal with `ASK_ABORTED`. `askTimed`
rejects a non-integer, non-positive, or oversized wait with
`BAD_TIMEOUT`. `UserQuestionError` extends `HarnessError`, so a tool that
lets it propagate surfaces `{ name, code }` to the model.

**Answering** — a plugin providing its own answer surface listens on the
**`user-questions/request`** waterfall (agent-scoped): return an
`AskUserQuestionAnswer` to claim the request, or `next()` to delegate to
the next answerer:

```ts
ctx.on('user-questions/request', async (request, next) => {
  if (!canAnswerHere(request)) return next()
  return { answers: await collectAnswers(request.questions, request.signal) }
})
```

A timed request arrives with `wait: { callId, timed: true }`; a UI
answerer claims the foreground wait through the `@Remote` `attachWait`
stream before starting its own countdown. `answer(agent, callId,
answer)` (also `@Remote`) is the late-reply path for a `continued`
question — Web app surface, not something a plugin normally calls.

**Honesty note:** the experimental asynchronous question mode
(`dsh-v0.2.0-rc.2`) needs manual configuration to enable, and its config
key isn't named in `user-questions.md` — don't assume `askTimed` is what
the shipped `ask_user_question` tool uses by default. The
`UserQuestionProjectionView` Session projection (active/settled timed
questions) is Client read surface, not transcribed here beyond its name.

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
  import-specifier gap, Shapes 5/6/7/8/9/10/12's unrestated request-type
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
  Client slots) is new to this skill as of `dsh-v0.1.5-alpha.2` and still
  has a large surface — the `client-resources.md` provider contract is
  now confirmed as of `dsh-v0.1.7-rc.1`, but the full owner-props table
  per slot key is still not exhaustively transcribed — treat remaining
  gaps there the same as any other honesty-note gap, not as settled.
  Shape 11 (Agent presets) is new as of `dsh-v0.1.7-rc.1` and leaves
  `PresetDefinition`'s field shape unresolved — treat it the same way.
  The `ctx.agents.create`/`resume` and `ctx.agentLoop` surface added to
  the Agent-passing section at the same tag likewise leaves
  `CreateAgentOptions`/`ResumeAgentOptions`/`AgentHandle`/`AgentFactory`
  unresolved beyond their method signatures. Shape 12 (Schedule) is
  mounted only by an optional *experimental* bundle, and Shape 13's timed
  questions sit behind an experimental, manually enabled mode — treat
  both as more likely to move between tags than Shapes 1-4.
- Doesn't cover the bundle/manifest wrapper (`package.json`'s `dsh.bundle`
  block, `files`, `cordis.patch.yml`'s `insert` entry) — that wrapper is
  the same across every shape and is the generator's concern, not this
  skill's.
