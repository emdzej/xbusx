# ARCHITECTURE.md

Implementation-level companion to `AGENTS.md`. Pins the cross-cutting
design decisions so future passes don't re-derive them. **For long-lived
"why this shape" decisions only.** Short-lived implementation notes
belong in commit messages or PR descriptions, not here.

The reference-manual side of the project (`docs/`) is governed by its
own conventions (`docs/conventions.md`); this file covers the TypeScript
monorepo (`packages/`, `apps/`).

---

## 1. Dual-bus support (I/K-bus and D-Bus)

**Decision (2026-05-19):** support both protocols, share the wire and a
small set of obvious primitives, but **keep frame shape, command tables,
and runtime model separate**. Do not try to unify the bus types behind a
single `Bus` interface.

The reverse-engineering of `navcoder.exe` (see
[`docs/protocol/dbus.md`](docs/protocol/dbus.md)) confirmed that:

- Both buses use the same 9600 8E1 single-wire UART. The same transport
  bytes-in/bytes-out interface serves both.
- Both buses XOR-checksum identically.
- The 8-bit address registry is the same on both — a given byte names
  the same canonical ECU regardless of which bus the traffic arrived
  on.
- But the frame header is different (D-Bus has no `SRC` byte), the
  `LEN` byte means a different thing (total frame vs. tail length), and
  the command-byte spaces are entirely different vocabularies on each
  bus.
- The runtime model is different: I/K-bus is **unsolicited broadcasts
  → reactive events**. D-Bus is **tester request → ECU response → done**.
  Forcing both through one event-emitter abstraction would leak the
  request/response semantics into reactive code that doesn't want them.

### Package layout

```
packages/
  protocol/                # I/K-bus framing — UNCHANGED
                           # + new sibling module: dbus-framing.ts
                           #   (DBusMessage, encodeDBus, decodeDBus,
                           #    DBusFrameStream)
                           # checksum.ts and addresses.ts are reused.

  commands/                # I/K-bus per-command codecs — UNCHANGED.

  commands-dbus/           # NEW.  DS2 codecs: response-code table,
                           # read-by-block, write-coding, identification,
                           # terminate-diagnostic.  Mirrors the
                           # parseX/buildX pattern from `commands/`.

  core/                    # IBus orchestrator — UNCHANGED.

  dbus/                    # NEW.  Session-oriented runtime for D-Bus:
                           # DiagSession (open/close, send-and-wait,
                           # timeout handling), DiagECU base class
                           # (typed, request/response methods, no
                           # broadcast events).

  devices/                 # I/K-bus Device twins — UNCHANGED.
                           # Continues to host stub addresses (the same
                           # 8-bit address registry covers D-Bus ECUs
                           # too, so the stub table doesn't need to
                           # fork — only the typed twins do).

  devices-dbus/            # NEW (optional, defer).  Typed DiagECU
                           # subclasses for ECUs we want first-class
                           # support for (DME, EGS, IKE-as-diag, etc.).

  transport-serial/        # UNCHANGED.  Bus-agnostic.
  transport-web-serial/    # UNCHANGED.  Bus-agnostic.
```

### What we DO NOT do

- **No `Frame` superclass / discriminated union** spanning both bus
  types in `protocol/`. The I/K-bus `IBusMessage` and the D-Bus
  `DBusMessage` are sibling types in the same package; nothing
  attempts to abstract over them. Code that processes both protocols
  switches at the API boundary (`IBus` vs. `DiagSession`), not via a
  polymorphic `Frame.kind` field.
- **No `protocol: 'ikbus' | 'dbus'` argument on `IBus.send`** or
  similar generalisation. The existing `IBus` continues to be
  I/K-bus-only.
- **No event-emitter API on `DiagECU`.** Diagnostic ECUs don't
  broadcast; pretending they do (via a fake event for every response
  we receive) would mislead consumers into writing reactive code that
  doesn't make sense for request/response. Methods on `DiagECU`
  return `Promise<DiagResponse>`.

### Runtime model — comparison

```ts
// I/K-bus — broadcast / reactive
const bus = new IBus(transport, vehicle)
const { devices } = registerAll(bus)
await bus.start()
const ike = bus.device(0x80) as IKE
ike.events.on('ignitionChanged', (state) => { ... })
ike.events.on('speedRpmUpdate', ({ speed, rpm }) => { ... })

// D-Bus — request/response
const session = new DiagSession(transport)
await session.open()
const dme = session.ecu(0x12)                    // returns a DiagECU
const id  = await dme.identify()                 // typed result
const blk = await dme.readBlock(0x0B, 0x03)      // raw read
await session.close()
```

A single transport can host either, but **not both simultaneously** —
the bus mode is selected at session start, mirroring navcoder's UI.

### App integration

The CLI and web app currently expose a `passive | active` mode toggle.
Add **`diag`** as a third option:

| Mode | Bus class | Wire behaviour |
|---|---|---|
| `passive` | `IBus` | I/K-bus listen-only |
| `active` | `IBus` | I/K-bus listen + send (safety-gated) |
| `diag` | `DiagSession` | D-Bus request/response (safety-gated; coding writes are far more consequential than an active-mode I/K-bus button-press) |

CLI:
```
ibusx diag <ECU> identify             # one-shot diag-session call
ibusx diag <ECU> read-block 0B 03     # raw read of block (0x0B, 0x03)
```

Web app: the bus-protocol picker in `ConnectScreen.svelte` gets a third
option ("D-Bus / OBD diagnostic"). When that's picked, the app mounts a
diag-session view instead of the broadcast device-list view.

### Cost & ordering

Rough ordering, each step independently shippable:

1. **`protocol/dbus-framing.ts`** + tests. Mirror the shape of
   `framing.ts` — `encodeDBus(msg)`, `decodeDBus(bytes)`, plus a
   `DBusFrameStream` that scans for valid frames over a byte stream.
   ~half the size of the I/K-bus framing because there's no `SRC` and
   no false-positive detector.
2. **`commands-dbus`** with the response-code table + identification
   command (`0x00`) + a couple of read-block commands.
3. **`packages/dbus`** with `DiagSession` + `DiagECU` base.
4. **CLI `ibusx diag` subcommand** — initially just `identify`.
5. **Web app diag mode** — port picker → DiagSession → form-driven
   request UI.
6. **Per-ECU twins** as demand arises (DME, EGS, ABS, etc.).

Steps 1–4 are mostly mechanical given the framing nailed down in
`docs/protocol/dbus.md`. Step 6 is open-ended — only worth doing for
ECUs we actually need.

### What this implies for safety

D-Bus is **strictly more consequential** than I/K-bus active mode. An
active-mode I/K-bus control press might toggle a light or send a CDC
emulation reply — recoverable. A D-Bus write-coding to the DME can
brick the engine ECU if the data is wrong.

Therefore: the diag-mode safety gate is **per-write**, not per-session.
Even with diag mode enabled, write-coding-style commands must require a
fresh confirmation. Reads are free; writes need a separate arm. This
contrasts with active mode on I/K-bus where one toggle covers the whole
session.

The CLI / TUI / web app each express this differently — the principle
is what matters: a session with read access ≠ a session with write
access. Implementation detail TBD when we get to step 5.

---

## 2. Future entries

This file is for **architectural decisions that span multiple packages
or that future work would re-litigate without them**. Add entries
incrementally as decisions of that weight come up. Two-paragraph
entries are fine; three-page essays are not.

Examples of what *would* belong here later:

- TX timing layer / ARQ retry policy (multi-package: affects
  `core/IBus.send`, transports, and the active-mode safety story).
- Gateway server (`transports/gateway-client` + a Node server app —
  one bus, multiple clients).
- Vehicle-profile persistence and how it interacts with the
  `Vehicle` runtime context across reconnects.

Examples that would *not* belong here:

- Bug fixes, refactors, file-level reorganisations — those are
  in-line in the code or in commit messages.
- New device twins or new codecs following the existing recipe —
  those follow `AGENTS.md` §8 and don't need architectural
  documentation.
