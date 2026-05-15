# FHK (0xA7) — Rear Compartment Climate Control

**Status:** Stub.

**Role:** A second climate-control unit for rear-seat passengers — Fond Heizung und Klimatisierung. Independent temperature and air-distribution control for the back seats. Found on long-wheelbase E38s.

**Buses:** K. **Chassis coverage:** E38 with rear-compartment climate option.

## Address

`0xA7`. *Sources:* Wilhelm `README.md:154`, Wilhelm `address.md:62`, bimmerz `devices.ts:7` — agreed.

## Messages

No per-command documentation in surveyed sources.

## Cross-cutting subsystems

- Companion to the main climate module IHKA (`0x5B`). See [`ihka.md`](ihka.md).
- Likely also rides M-Bus for its own stepper-motor control (out of scope).

## Sources

### Wilhelm-docs
- `README.md:154` — device-table entry.
- `address.md:62` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:7` — address.
