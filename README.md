# ibusx

A reference manual **and** TypeScript implementation for **BMW I-Bus and K-Bus** — the in-vehicle communication protocol used on E31, E38, E39, E46, E52, E53, E83, E85, E86, E87 (and related chassis) from 1989 through roughly 2013.

This repository synthesises three community sources — [BlueBus](https://github.com/blueBusProject/BlueBus), [wilhelm-docs](https://github.com/piersholt/wilhelm-docs), and bimmerz — into a single, citation-aware reference, and builds a TypeScript implementation on top that lets you observe, decode, and interact with the bus from CLI, TUI, and web tools.

## Layout

This is a pnpm + turborepo monorepo containing both docs and code:

- [`docs/`](docs/) — the protocol reference (markdown).
- [`packages/`](packages/) — the implementation:
  - [`@ibusx/protocol`](packages/protocol) — framing, addressing, checksums.
  - `@ibusx/commands` *(planned)* — per-command codecs.
  - `@ibusx/core` *(planned)* — IBus class, Vehicle context, Device base.
  - `@ibusx/devices` *(planned)* — device twins with state and reflective controls.
  - `@ibusx/transport-*` *(planned)* — serial, web-serial, gateway client.
- [`apps/`](apps/) *(planned)*:
  - `cli` (Commander) — list / identify / log / invoke controls.
  - `tui` (Ink) — same actions wrapped in an interactive terminal UI.
  - `web` (Svelte 5) — same actions in the browser, with per-device skins.
  - `gateway` — TCP + WebSocket server fronting a single serial connection.
- [`tooling/`](tooling/) — shared TS configs.

## Quick start

```bash
pnpm install
pnpm build
pnpm test
```

## Scope

- **In scope:** I-Bus and K-Bus message-level protocol — framing, addressing, devices, messages, choreography.
- **Out of scope:** the diagnostic protocol (KWP2000, EDIABAS jobs), D-Bus, M-Bus, P-Bus.

## Documentation

See [`docs/README.md`](docs/README.md) for the table of contents and reading paths.

## Status

Work in progress. Each documentation claim is cited to its source; disagreements between sources are surfaced rather than smoothed over. See [`docs/conventions.md`](docs/conventions.md) for the citation format.

## Contributing

Corrections welcome. Cite your source. If a claim disagrees with what's documented here, surface the disagreement in a conflict block rather than overwriting silently — the format is described in `docs/conventions.md`.
