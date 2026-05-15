# FBZV (0x40) — Remote Control for Central Locking (Early)

**Status:** Stub.

**Role:** The early key-fob receiver — Funk-Bedienteil Zentralverriegelung. Predates the integrated remote-key entry in the GM. Used on E31 and very early E38.

**Buses:** K. **Chassis coverage:** E31, older E38.

## Address

`0x40`. *Sources:* Wilhelm `README.md:124`, Wilhelm `address.md:38`, bimmerz `devices.ts:30` — agreed. BlueBus does not declare FBZV.

## Messages

No per-command documentation in surveyed sources.

> *TBC:* On chassis with FBZV, fob-button events likely flow FBZV → GM rather than being processed in-GM. Capture and characterise.

## Cross-cutting subsystems

- Predecessor / parallel to the GM's `0x72` Remote Key Entry frame. See [`gm.md`](gm.md#messages-where-gm-is-src).

## Sources

### Wilhelm-docs
- `README.md:124` — device-table entry.
- `address.md:38` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:30` — address.
