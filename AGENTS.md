# AGENTS.md

Orientation for AI coding agents (Claude Code, similar). Read this in full before
making changes. The user-facing pitch is in `README.md`; this file is the
operating manual.

---

## 1. What this repo is

A monorepo with **two halves that share a working directory but have different
rules**:

1. **`docs/`** — a reference manual for the BMW I/K-bus protocol synthesised
   from community sources. Every claim is cited. Conflicts are surfaced, not
   smoothed. Reference-manual prose, not tutorial.
2. **A TypeScript implementation** (`packages/`, `apps/`) — codecs, device
   twins, transports, and CLI/TUI/web apps built on top of those docs.

Scope: **I-bus and K-bus only**. The diagnostic protocol (KWP2000 / EDIABAS),
D-bus, M-bus, P-bus are **out of scope**.

---

## 2. Current layout

```
docs/                                 # Markdown reference manual
  conventions.md                      # Citation + conflict-block format
  protocol/                           # Framing, addressing, timing, ARQ
  devices/                            # Per-device pages (one file per device)
  subsystems/                         # Cross-cutting (CDC emulation, OBC, etc.)
  examples/                           # Worked frame dumps
  ...

packages/
  protocol/                           # @emdzej/ikbus-protocol  — framing, addresses, checksum
  commands/                           # @emdzej/ikbus-commands  — per-command codecs (parseX / buildX)
  core/                               # @emdzej/ibusx-core      — IKBus, Vehicle, Device, TypedEmitter, MemoryTransport
  devices/                            # @emdzej/ikbus-devices   — typed device twins + stubs.ts (~40 placeholders)
  transport-serial/                   # @emdzej/transport-serial      — Node serialport adapter
  transport-web-serial/               # @emdzej/transport-web-serial  — browser Web Serial adapter

apps/
  cli/                                # @emdzej/ibusx-cli       — single `ibusx` bin (Commander + Ink TUI embedded)
  web/                                # @emdzej/ibusx-web       — Svelte 5 + Vite + Web Serial

tooling/tsconfig/                     # @emdzej/ibusx-tsconfig — shared TS presets (base.json, library.json)
```

The TUI lives inside the CLI (`apps/cli/src/tui/`) and ships in the `ibusx`
bin — there is **no separate TUI app**. Running `ibusx` with no args launches
the TUI with a port picker.

---

## 3. Running the project

```bash
pnpm install
pnpm typecheck   # turbo: tsc --noEmit across all packages + svelte-check for web
pnpm test        # turbo: vitest run across all packages
pnpm build       # turbo: tsc -p tsconfig.build.json + vite build for web
pnpm exec biome check --write .   # format + lint (svelte files excluded)

# Filtered:
pnpm --filter @emdzej/ikbus-protocol test
pnpm --filter @emdzej/ibusx-web dev          # http://localhost:5173 (needs Chromium for Web Serial)
node apps/cli/dist/bin/ibusx.js --help
```

**Always run typecheck + test + biome before committing.** All three must
pass. `pnpm build` is implied by the others via turbo's `dependsOn: ['^build']`.

---

## 4. Hard conventions

These are **rules**, accumulated from prior sessions. Treat them as
non-negotiable unless the user overrides one in the current turn.

### 4.1 Tooling versions — always use context7

Before pinning **any** library version in any `package.json`, query
`mcp__context7__resolve-library-id` + `mcp__context7__query-docs` for the
current major.minor. Do not rely on training data; the user runs latest.

Pin with caret ranges (`^X.Y.Z`), never bare patch.

### 4.2 Code style (Biome 2.x, root `biome.json`)

- Single quotes, no semicolons, trailing commas all, always-arrow-parens.
- 100-char line width, 2-space indent.
- `.svelte` files are excluded from Biome (it parses them as JS and
  misreports template-used vars as unused). Do not re-include them.
- `noExplicitAny: warn` globally, `off` in `*.test.ts` / `*.spec.ts`.

### 4.3 TypeScript

Shared base (`tooling/tsconfig/base.json`) sets `strict: true` plus:
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`useUnknownInCatchVariables`, `verbatimModuleSyntax`, `isolatedModules`.
`module: NodeNext` for libraries and Node apps; `Bundler` for the web app
(Vite handles resolution).

ESM-only. No CJS dual builds. Use `.js` import specifiers in `.ts` source
(NodeNext requirement) — yes, even when importing a `.tsx`: write `.js`.

### 4.4 Package naming

`@emdzej/ibusx-*`. Never use `@ibusx/*` (that was the initial scope, renamed
on 2026-05-15). The `@emdzej` scope is the GitHub org.

### 4.5 Web app configuration → localStorage only

No config file, no server-side store. Any user preference (baud rate,
active-mode flag, vehicle profile, pane widths, theme) persists via
`localStorage` under the `ibusx.*` namespace. See
`apps/web/src/lib/storage.ts` for the helper.

### 4.6 Documentation citation format

See `docs/conventions.md` for the full spec. Summary:

- **Sources agree** → one compact `path:line` citation per source.
- **Sources disagree** → Markdown table (`Source | Claim | Cite`) followed by
  a **Resolution:** line and a **Why:** line.

Source precedence (highest to lowest):

1. **BlueBus** (`/Users/mjaskols/Projects/my/ext-BlueBus`) — C firmware,
   actively maintained. Authoritative for framing / timing / ARQ / collision,
   LM and GT variants, vehicle-type branching.
2. **Wilhelm-docs** (`/Users/mjaskols/Projects/my/ext-wilhelm-docs`) —
   curated community docs. Authoritative for layer-2 semantics, UI
   choreography, charset, model genealogy, real frame dumps.
3. **Bimmerz** (`/Users/mjaskols/Projects/my/bimmerz`) — TS SDK, partly
   derivative. Use for OBC property IDs, gear nibbles, modern parser
   patterns. Lower weight. **Do not cite from `bimmerz/ref/`** — go to the
   upstream repo.
4. **EDIABAS PRG** (`/Users/mjaskols/Downloads/inpa/EDIABAS/Ecu`) — last
   resort, disassemble only for I/K-bus device-ID disambiguation.

Lean toward BlueBus for runtime/timing, Wilhelm for semantics/UI/variants.

When a Wilhelm-docs example comment contradicts its own encoding key,
trust the encoding (it matches BlueBus). Comment errors have happened.

### 4.7 No scripted simulation

Interactivity comes from **controls invoked by the user** via CLI / TUI /
web. Do not introduce timed scripts, fake traffic generators, or scenario
runners that pretend to be devices. The `MemoryTransport.pair()` helper
exists for tests; it is not a UX surface.

---

## 5. Architecture cheat sheet

### 5.1 Package layering

```
protocol ─┬─> commands ─> core ─┬─> devices ──> apps/*
          │                     ├─> transport-serial
          │                     └─> transport-web-serial
          └────────────────────────────────────────────
```

Lower packages never import higher. `core` doesn't know about specific
devices; `devices` doesn't know about transports.

### 5.2 Two-layer event model

- **Wire layer** (`IKBus.events`): `frame`, `txFrame`, `error`. Every
  parsed/sent IKBusMessage.
- **Semantic layer** (`Device.events`): per-device typed events like
  `ignitionChanged`, `lockAll`, `volumeUp`. Defined by each device's
  `EventMap`.

Shared cross-device state lives on `Vehicle` (chassis, ignition state,
variants). Devices mutate it via `this.vehicle.setX(...)`; other devices
observe via the same.

### 5.3 Device twin pattern

Every implemented device extends `Device<TState, TEvents>` and exports:

1. The class with typed `state` and `events`.
2. A const-asserted `XControls` matching `ControlsManifest<X>` — the
   reflective manifest that CLI/TUI/web walk to generate UI for invokable
   methods. Each control declares `params: ControlParams` (enum/number/
   string/boolean) and an `invoke(device, args)` function. Active-mode
   controls set `requires: 'active'`.

The `mode: 'passive' | 'active' | 'disabled'` field on `Device` gates
sending. Default is `passive`; `active` must be armed explicitly.
`disabled` means the device is registered but inert.

### 5.4 Stub devices (`devices/src/stubs.ts`)

About 40 known device addresses (SHD, HKM, DIA, …) have stub classes
generated by a `stub(name, address)` factory. They appear in the registry
and accept frames addressed to them but expose no typed state or controls.
Each is a placeholder for incremental codec coverage — see the comments
above each entry.

### 5.5 App device registry

Both `apps/cli/src/registry.ts` and `apps/web/src/lib/registry.ts` enumerate
the **implemented** devices (currently 13). The registry's `registerAll(bus)`
constructs each device, registers it on the bus, and returns the instances
so callers can read state off them later. If the registry list grows, it
may be worth extracting to a shared `@emdzej/ibusx-app-registry` package.

### 5.6 Safety gate

Active-mode controls refuse to invoke unless the device is in `active`
mode. The CLI gates this with `--active` on `ibusx invoke`; the TUI with
the `a` keypress; the web app with the toolbar toggle. All three call
`device.mode = 'active'` before invoking. Do not bypass.

---

## 6. Current implementation status (as of last commit)

### Implemented device twins (full state + events + controls)

IKE, MFL, GM, CDC, RAD, BMBT, LCM, GT, TEL, MID, PDC, RLS, EWS — 13 of ~53
known addresses.

### Stub-only devices (~40)

Listed in `packages/devices/src/stubs.ts`. They accept frames but have no
decoded state. Each maps 1:1 to a `docs/devices/<name>.md` page (or should).

### Codec coverage (`packages/commands/`)

Organised by device subdirectory. To add a new command, see §8.

### Transports

- `transport-serial` — Node serial via `serialport@13`, 9600 8E1 by default.
- `transport-web-serial` — browser, requires Chromium + HTTPS or localhost.
  Caller passes an already-`requestPort()`-ed `SerialPort` (because that
  call must happen inside a user gesture).

### Apps

- **CLI** (`apps/cli`) — single `ibusx` bin. Subcommands: `list-ports`,
  `list-devices`, `monitor`, `invoke <DEV> <ctl>`, `tui`. Bare `ibusx`
  launches the TUI with a port picker.
- **TUI** — embedded in CLI under `src/tui/`. Three-pane Ink layout:
  device list / state+controls / event log. Renders no-param controls
  inline; param controls direct the user to the CLI for now.
- **Web** (`apps/web`) — Svelte 5 + Vite, mirrors the TUI layout in a
  browser, generates param forms for every control kind.

### Test count

~194 tests across protocol / core / commands / devices / transport-serial
/ transport-web-serial / cli.

---

## 7. Known gaps (next-up candidates)

- **TX timing layer** — `IKBus.send()` writes straight to the transport. The
  documented 8 ms idle wait + ARQ retries (`docs/protocol/link-and-timing.md`)
  isn't implemented yet.
- **Active-mode arming UX** — there's no scoped/temporary arm; once
  toggled, all active controls fire. A per-invocation confirmation might
  be safer for hardware-touching controls.
- **Gateway server** — a TCP + WebSocket server fronting a single serial
  port so multiple clients can share one adapter. Designed, not built.
- **Param prompting in the TUI** — currently steers users to the CLI for
  parameterised controls. An Ink form would be nicer.
- **Shared registry package** — `apps/cli/src/registry.ts` and
  `apps/web/src/lib/registry.ts` are near-duplicates. Extract when adding
  the next consumer (gateway, mobile, etc.).
- **Headless web smoke test** — the web app has no Playwright/Vitest
  browser test; only unit tests on `transport-web-serial`.

---

## 8. Cookbook: adding things

### 8.1 Add a new codec (parser + builder) for an existing device

1. Find the command's spec by chasing the source-precedence chain
   (BlueBus → Wilhelm → bimmerz). Pick a directory under
   `packages/commands/src/<device>/` and add `<command-name>.ts`.
2. Pattern: export `parseX(message: IKBusMessage): X` and
   `buildX(args): IKBusMessage`. Use the helpers in
   `packages/commands/src/internal.ts` (`assertCommand`,
   `assertMinPayloadLength`, `makeMessage`). Throw `ProtocolError`
   subclasses for bad input.
3. Re-export from `packages/commands/src/<device>/index.ts`, which is
   itself re-exported from `packages/commands/src/index.ts`.
4. Add unit tests in `packages/commands/test/<device>/<command-name>.test.ts`.
   Test round-trip parse/build against at least one citable real-world
   frame from the source repos.

### 8.2 Promote a stub device to a full twin

1. Find the device in `packages/devices/src/stubs.ts`, note its address.
2. Add codecs (§8.1) for whatever commands you need.
3. Create `packages/devices/src/<name>.ts` extending `Device<TState, TEvents>`.
   Mirror the shape of an existing device (e.g. `pdc.ts` is small and
   covers both passive observation and an active-mode request).
4. Export a const-asserted `XControls satisfies ControlsManifest<X>`
   even if empty (web/TUI/CLI tolerate empty manifests).
5. Re-export from `packages/devices/src/index.ts`. Remove the stub entry.
6. Add the device to **all three** app registries (CLI, TUI shares CLI's,
   web has its own).
7. Write unit tests in `packages/devices/test/<name>.test.ts` using
   `MemoryTransport.pair()` to drive frames at the twin.

### 8.3 Add a new app-level subcommand to the CLI

`apps/cli/src/commands/<name>.ts` exports a `registerXCommand(program)` that
calls `program.command(...)`. Wire it in `apps/cli/src/bin/ibusx.ts`. Match
the existing `list-ports` / `monitor` shape — minimal, output via stdout,
exit codes via thrown errors.

### 8.4 Add a new transport

Implement the `Transport` interface (`packages/core/src/transport.ts`):
emit `data` / `error` / `open` / `close` events, expose `open()`, `close()`,
`write()`. Live in `packages/transport-<name>/`. Reference
`transport-serial` and `transport-web-serial`. Keep the package
Node-agnostic if possible; if browser-only, declare it in the package's
README and `tsconfig.json` `lib`.

---

## 9. Working rhythm

- **Iterate, don't bulk-generate.** Propose a skeleton or batch outline,
  get an "ok" or "carry on", then execute. Especially for docs.
- **Plan visible work with TaskCreate / TaskUpdate.** Mark in-progress
  before starting, completed immediately when done — don't batch updates.
- **Show your text output.** Tool calls aren't visible to the user; brief
  text updates between batches are.
- **Verify before claiming done.** Run typecheck + test + biome and report
  the numbers. The user has caught regressions by reading them.
- **Commit messages: imperative, no `(planned)` or roadmap items.** Match
  the existing log: `Add @emdzej/...`, `Merge TUI into CLI`,
  `Add full device coverage: …`. Avoid AI-coauthor signatures.
- **Don't push without being asked.** Commit when told; push only on an
  explicit request (`commit and push`, `ship it`, etc.). The user
  reviews on GitHub.

---

## 10. Things NOT to do

- ❌ Pin library versions from training data — always context7 first.
- ❌ Use `@ibusx/*` package names — the scope is `@emdzej/ibusx-*`.
- ❌ Add a server-side config file for the web app — localStorage only.
- ❌ Add scripted simulators or scenario runners.
- ❌ Cite from `bimmerz/ref/` — chase upstream.
- ❌ Smooth over source conflicts — surface them with a table + winner + why.
- ❌ Use `pnpm 9.x` or older — repo expects `packageManager: pnpm@11.x`.
- ❌ Bulk-generate the doc tree in one pass — iterate section-by-section.
- ❌ Re-include `*.svelte` in Biome — it misreports.
- ❌ Bypass the active-mode safety gate when adding new controls.
- ❌ Run destructive git operations (`reset --hard`, `push --force`,
  `branch -D`, `clean -fd`) without explicit user approval each time.
- ❌ Drift from the established commit-message style (no AI signatures,
  no roadmap noise, no `(planned)` tags).
