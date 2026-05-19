# ibusx — Documentation

A reference manual for BMW I-Bus and K-Bus.

## Reading paths

- **First contact with the bus:** [overview](overview.md) → [protocol/framing](protocol/framing.md) → [protocol/addressing](protocol/addressing.md) → [devices/](devices/README.md).
- **Writing a passive logger:** [protocol/framing](protocol/framing.md) → [protocol/link-and-timing](protocol/link-and-timing.md) → [examples/passive-logger](examples/passive-logger.md).
- **Emulating a CD changer (or similar device):** [protocol/framing](protocol/framing.md) → [devices/cdc](devices/cdc.md) → [subsystems/cdc-emulation](subsystems/cdc-emulation.md) → [examples/cdc-emulation-walkthrough](examples/cdc-emulation-walkthrough.md).
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
- [protocol/dbus](protocol/dbus.md) — D-Bus diagnostic framing (`DST | LEN | DATA… | XOR`, no source byte). Draft, single-source (navcoder.exe).

### Devices

- [devices/](devices/README.md) — canonical address table with one page per device. Includes the per-device [_template](devices/_template.md) used for new pages.

### Messages

- [message-index](message-index.md) — sortable view of every known command byte → name → source → destination → device-page link.

### Cross-cutting subsystems

Choreography that involves more than one device. Per-device pages link in.

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

- [examples/passive-logger](examples/passive-logger.md) — listen + decode, no transmit.
- [examples/reading-vehicle-state](examples/reading-vehicle-state.md) — ignition / speed / sensors / temperature / odometer / doors decoders.
- [examples/displaying-text-on-cluster](examples/displaying-text-on-cluster.md) — `0x1A` CCM, `0x23` title, the four display surfaces and their trade-offs.
- [examples/cdc-emulation-walkthrough](examples/cdc-emulation-walkthrough.md) — byte-level trace of a BlueBus-style CDC emulator.

## Page status

Each page header carries a status:

- **Stable** — sources agree (or conflicts are resolved) and the page has been reviewed.
- **Draft** — content present but not fully cross-checked.
- **Stub** — placeholder; address or message ID known but body TBC.

Most pages are currently **Draft**; many small / chassis-specific device pages are **Stub** where the surveyed sources have minimal coverage. Per-page status is in each page's header. The `TBC` lists at the bottom of every page surface what's still missing.
