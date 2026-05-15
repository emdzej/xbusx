# ibusx — Documentation

A reference manual for BMW I-Bus and K-Bus.

## Reading paths

- **First contact with the bus:** [overview](overview.md) → [protocol/framing](protocol/framing.md) → [protocol/addressing](protocol/addressing.md) → [devices/](devices/README.md).
- **Writing a passive logger:** [protocol/framing](protocol/framing.md) → *protocol/link-and-timing (planned)* → *examples/passive-logger (planned)*.
- **Emulating a CD changer (or similar device):** [protocol/framing](protocol/framing.md) → *devices/cdc (planned)* → *subsystems/cdc-emulation (planned)*.
- **Looking up a single message you saw on the wire:** *message-index (planned)*.

## Contents

### Meta

- [overview](overview.md) — what is I/K-bus, scope, scope exclusions.
- [conventions](conventions.md) — citation format, conflict-resolution rules.
- [sources-and-provenance](sources-and-provenance.md) — source list and precedence policy.
- *glossary (planned)* — acronyms and terms.

### Protocol layer

- *protocol/physical (planned)* — wiring, single-wire 12 V, transceiver, K-bus vs I-bus electrical.
- *protocol/link-and-timing (planned)* — UART parameters, idle wait, arbitration, collision, ARQ.
- [protocol/framing](protocol/framing.md) — `SRC | LEN | DST | DATA… | XOR`.
- [protocol/addressing](protocol/addressing.md) — source/destination semantics, broadcast, multicast, gateway routing.
- *protocol/error-handling (planned)* — checksums, timeouts, retries, malformed frames.

### Devices

- [devices/](devices/README.md) — canonical address table with one page per device. The address table itself links to each device page; unwritten device pages are marked there.

### Messages

- *message-index (planned)* — sortable view of every known command byte → name → source → destination → device-page link.

### Cross-cutting subsystems

These cover choreography that involves more than one device. Per-device pages link in.

- *subsystems/ignition-state (planned)*
- *subsystems/radio-gt-arbitration (planned)*
- *subsystems/cdc-emulation (planned)*
- *subsystems/door-locks-zke3-vs-zke5 (planned)*
- *subsystems/obc-display (planned)*
- *subsystems/telephone-ui (planned)*

### Reference data

- *charset (planned)* — I-Bus character encoding (special glyphs, blank `0x9D`, etc.).
- *model-coverage (planned)* — what varies across E38 / E39 / E46 / E52 / E53 / E83 / E85 / E86 / E87 / R50.

### Examples

- *examples/passive-logger (planned)*
- *examples/reading-vehicle-state (planned)*
- *examples/displaying-text-on-cluster (planned)*
- *examples/cdc-emulation-walkthrough (planned)*

## Page status

Each page header carries a status:

- **Stable** — sources agree (or conflicts are resolved) and the page has been reviewed.
- **Draft** — content present but not fully cross-checked.
- **Stub** — placeholder; address or message ID known but body TBC.

Italicised entries marked *(planned)* are not yet on disk — the links above are aspirational until they fill in. See per-batch commits for what's been added recently.
