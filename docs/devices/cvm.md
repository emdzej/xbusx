# CVM (0x9C) — Convertible Soft Top Module

**Status:** Stub.

**Role:** The convertible-top controller on E46 convertibles — Cabriolet-Verdeck-Modul. Manages the soft-top motor, latches, and trunk-divider behaviour during roof operation.

**Buses:** K. **Chassis coverage:** E46.

## Address

`0x9C`. *Sources:* Wilhelm `README.md:150`, bimmerz `devices.ts:46` (`MM3`) — agreed on address; name disagreement.

bimmerz `MM3` ("Mirror Memory 3") at `0x9C` does not match Wilhelm's CVM identification. The address itself is agreed; the device identity is contested.

> *TBC:* Capture and characterise frames originating at `0x9C` from an E46 with the top down to confirm which identity matches the live device.

## Cross-cutting subsystems

- The E36 CVM is at `0x9B` ([`9b.md`](9b.md)) — different chassis, different address.

## Sources

### Wilhelm-docs
- `README.md:150` — device-table entry (CVM).

### bimmerz
- `packages/bus/src/devices.ts:46` — address (`MM3`).
