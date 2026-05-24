# Changelog

All notable changes to **xbusx** are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
loosely — minor version bumps may carry small breaking changes
until 1.0.

## 0.1.0 — 2026-05-24

Initial public release. The protocol library, devices, transports,
CLI, and browser app are all in place and end-to-end usable against
real hardware.

### Added

#### Protocol & devices

- **`@emdzej/ikbus-protocol`** — frame parsing, addressing tables,
  checksums for the BMW I-Bus and K-Bus serial protocols.
- **`@emdzej/ikbus-commands`** — per-command codecs covering the
  message catalogue used by the IKE, lights, radio, doors, and
  steering-wheel-button devices on E31 / E38 / E39 / E46 / E52 /
  E53 / E83 / E85 / E86 / E87.
- **`@emdzej/ikbus-devices`** — device twins with reactive state
  and reflective controls (declare a `Control` once, get a typed
  invoke + UI binding for free).
- **`@emdzej/dbus-protocol`** + **`@emdzej/dbus-commands`** +
  **`@emdzej/dbus-devices`** — same shape for the BMW D-bus
  (diagnostic protocol, KWP-style framing).
- **`@emdzej/ibusx-core`** — shared `IKBus` / `Vehicle` / `Device`
  classes, the event emitter, the sender abstraction.

#### Transports

- **`@emdzej/transport-serial`** — Node serial transport for the
  CLI.
- **`@emdzej/transport-web-serial`** — browser Web Serial transport
  for the web app.

#### Apps

- **`@emdzej/ibusx-cli`** — `ibusx list / identify / log /
  invoke` against a USB-serial bus tap. Configurable log level +
  destination via `XBUSX_LOG_LEVEL` / `XBUSX_LOG_DESTINATION` /
  `XBUSX_LOG_FORMAT` / `XBUSX_LOG_CATEGORIES`.
- **`@emdzej/ibusx-web`** — browser dashboard:
  - Connect screen picks I/K-bus vs D-bus + the right baud rate.
  - Device list shows everything that's announced itself on the
    bus with reactive state.
  - State pane + command bar let you invoke any declared control.
  - Event log streams the raw frame traffic.
  - Light + dark theme with an OS-following "system" default,
    persisted to `localStorage`.
  - Settings dialog with Theme + Developer (logging) tabs.
  - Top-bar version pill linking to the release tag + GitHub icon
    linking to the repo.

#### Tooling

- **`@emdzej/bimmerz-logger`** integration across all packages
  (peer-dep pattern for libraries, regular dep for apps —
  preserves singleton semantics). Hierarchical `XBUSX.*`
  categories — `XBUSX.ikbus` / `XBUSX.dbus` / `XBUSX.transport` /
  `XBUSX.web` / `XBUSX.cli`.
- GitHub Actions CI (Biome lint + tests + build + typecheck on
  every push and PR) and a manual `workflow_dispatch` deploy to
  GitHub Pages (`xbusx.bimmerz.app`).

### Documentation

- **`docs/`** — the citation-aware protocol reference, synthesising
  BlueBus, wilhelm-docs, and bimmerz into a single markdown source
  of truth. Covers framing, addressing, devices, message catalogues,
  and choreography on the I/K bus.
- **`README.md`** — project overview, layout, scope, quick start.
- **`ARCHITECTURE.md`** — design intent + extension points.
