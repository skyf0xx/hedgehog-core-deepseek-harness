# Hedgehog DSH Core ⭐

### For: DeepSeek DSH Plugins That are Built to Last

DSH moves fast, and its pre-1.0 APIs shift underneath you. Next week's
release can break a plugin you built freehand today.

This core builds DSH plugins against a pinned, tested version, through
the same six-layer discipline every Hedgehog build uses. A plugin ships
working and keeps working.

```mermaid
flowchart LR
    A[Scaffold] --> B[Logic]
    B --> C[Wiring]
    C --> D[Smoke]
    D --> E[Bundle]
    E --> F[Join]
```

## What you get

- **A pinned DSH/Cordis workspace**, tested against an exact release
  tag instead of a moving caret range.
- **A tool-plugin generator**, so a generator writes the plugin
  boilerplate instead of you typing it by hand.
- **Friction logging built in** (undocumented behavior and breaking
  changes get recorded as you build, instead of lost to a Slack thread).

## Built for DSH plugin work

Reach for this core when you're building a tool, hook, or extension for
an existing DSH installation through its plugin/bundle system.

## Easy to install and use

Ask your agent:
*"Install Hedgehog and build me a DSH plugin for [what it should do]"*

<details>
<summary>For your agent</summary>

```
npx @skyf0xx/hedgehog init
```

```
npx @skyf0xx/hedgehog init --deepseek-harness
```

Technical details: [ARCHITECTURE.md](ARCHITECTURE.md)
