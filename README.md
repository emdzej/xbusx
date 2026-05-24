# ibusx

A reference manual **and** TypeScript implementation for **BMW I-Bus and K-Bus** — the in-vehicle communication protocol used on E31, E38, E39, E46, E52, E53, E83, E85, E86, E87 (and related chassis) from 1989 through roughly 2013.

This repository synthesises three community sources — [BlueBus](https://github.com/blueBusProject/BlueBus), [wilhelm-docs](https://github.com/piersholt/wilhelm-docs), and bimmerz — into a single, citation-aware reference, and builds a TypeScript implementation on top that lets you observe, decode, and interact with the bus from CLI, TUI, and web tools.

## Layout

This is a pnpm + turborepo monorepo containing both docs and code:

- [`docs/`](docs/) — the protocol reference (markdown).
- [`packages/`](packages/) — the implementation:
  - [`@emdzej/ikbus-protocol`](packages/protocol) — framing, addressing, checksums.
  - `@emdzej/ikbus-commands` *(planned)* — per-command codecs.
  - `@emdzej/ibusx-core` *(planned)* — IKBus class, Vehicle context, Device base.
  - `@emdzej/ikbus-devices` *(planned)* — device twins with state and reflective controls.
  - `@emdzej/ibusx-transport-*` *(planned)* — serial, web-serial, gateway client.
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

## Logging

Powered by [`@emdzej/bimmerz-logger`](https://github.com/emdzej/bimmerz/tree/main/packages/logger).
The library never reads `process.env`; the CLI translates env vars
into the central logger config at boot, and the web app applies
persisted settings from `localStorage["ibusx.config"]`'s `logging`
field.

CLI env namespace:

| Variable | Values | Effect |
|---|---|---|
| `XBUSX_LOG_LEVEL` | `trace\|debug\|info\|warn\|error\|fatal\|silent` | Default level |
| `XBUSX_LOG_CATEGORIES` | `cat=lvl,cat=lvl,…` | Per-category overrides (hierarchical) |
| `XBUSX_LOG_DESTINATION` | path | Write to file instead of stdout |
| `XBUSX_LOG_FORMAT` | `pretty\|json` | Output format |

Examples:

```bash
XBUSX_LOG_LEVEL=debug ibusx                       # bump default to debug
XBUSX_LOG_CATEGORIES="XBUSX.ikbus=trace" ibusx    # only ikbus subsystem
XBUSX_LOG_FORMAT=json XBUSX_LOG_DESTINATION=/tmp/x.log ibusx
```

Currently-active categories (hierarchical — a rule for `XBUSX`
covers every subcategory unless overridden):

- `XBUSX` — catch-all
- `XBUSX.ikbus` — I/K-bus protocol stack
- `XBUSX.dbus` — D-bus (DS2) protocol stack
- `XBUSX.transport` — serial transport
- `XBUSX.web` — web app (connection lifecycle, registry events)
- `XBUSX.cli` — CLI app

The web app reads its level + categories from
`localStorage["ibusx.config"]` (under the `logging` key). No
Settings UI yet — a future dialog will surface it.

## Status

Work in progress. Each documentation claim is cited to its source; disagreements between sources are surfaced rather than smoothed over. See [`docs/conventions.md`](docs/conventions.md) for the citation format.

## Contributing

Corrections welcome. Cite your source. If a claim disagrees with what's documented here, surface the disagreement in a conflict block rather than overwriting silently — the format is described in `docs/conventions.md`.
