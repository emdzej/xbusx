# ibusx — Documentation

A reference manual for BMW I-Bus and K-Bus.

## Reading paths

- **First contact with the bus:** [overview](overview.md) → [protocol/framing](protocol/framing.md) → [protocol/addressing](protocol/addressing.md) → [devices/](devices/README.md).
- **Writing a passive logger:** [protocol/framing](protocol/framing.md) → [protocol/link-and-timing](protocol/link-and-timing.md) → [examples/passive-logger](examples/passive-logger.md).
- **Emulating a CD changer (or similar device):** [protocol/framing](protocol/framing.md) → [devices/cdc](devices/cdc.md) → [subsystems/cdc-emulation](subsystems/cdc-emulation.md).
- **Looking up a single message you saw on the wire:** [message-index](message-index.md).

## Contents

### Meta

- [overview](overview.md) — what is I/K-bus, scope, scope exclusions.
- [conventions](conventions.md) — citation format, conflict-resolution rules.
- [sources-and-provenance](sources-and-provenance.md) — source list and precedence policy.
- [glossary](glossary.md) — acronyms and terms.

### Protocol layer

- [protocol/physical](protocol/physical.md) — wiring, single-wire 12 V, transceiver, K-bus vs I-bus electrical.
- [protocol/link-and-timing](protocol/link-and-timing.md) — UART parameters, idle wait, arbitration, collision, ARQ.
- [protocol/framing](protocol/framing.md) — `SRC | LEN | DST | DATA… | XOR`.
- [protocol/addressing](protocol/addressing.md) — source/destination semantics, broadcast, multicast, gateway routing.
- [protocol/error-handling](protocol/error-handling.md) — checksums, timeouts, retries, malformed frames.

### Devices

- [devices/](devices/README.md) — canonical address table with one page per device. Templates and stubs included so the address space is fully navigable even where coverage is sparse.

### Messages

- [message-index](message-index.md) — sortable view of every known command byte → name → source → destination → device-page link.

### Cross-cutting subsystems

These cover choreography that involves more than one device. Per-device pages link in.

- [subsystems/ignition-state](subsystems/ignition-state.md)
- [subsystems/radio-gt-arbitration](subsystems/radio-gt-arbitration.md)
- [subsystems/cdc-emulation](subsystems/cdc-emulation.md)
- [subsystems/door-locks-zke3-vs-zke5](subsystems/door-locks-zke3-vs-zke5.md)
- [subsystems/obc-display](subsystems/obc-display.md)
- [subsystems/telephone-ui](subsystems/telephone-ui.md)

### Reference data

- [charset](charset.md) — I-Bus character encoding (special glyphs, blank `0x9D`, etc.).
- [model-coverage](model-coverage.md) — what varies across E38 / E39 / E46 / E52 / E53 / E83 / E85 / E86 / E87 / R50.

### Examples

- [examples/passive-logger](examples/passive-logger.md)
- [examples/reading-vehicle-state](examples/reading-vehicle-state.md)
- [examples/displaying-text-on-cluster](examples/displaying-text-on-cluster.md)
- [examples/cdc-emulation-walkthrough](examples/cdc-emulation-walkthrough.md)

## Page status

Each page header carries a status:

- **Stable** — sources agree (or conflicts are resolved) and the page has been reviewed.
- **Draft** — content present but not fully cross-checked.
- **Stub** — placeholder; address or message ID known but body TBC.

Pages not yet written are absent from disk; their entries above are aspirational links until they're filled.
