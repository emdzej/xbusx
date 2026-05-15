# RF/IR (0xB9) — Compact Remote Control

**Status:** Stub.

**Role:** A compact RF / IR receiver — handles signals from older fob-style remotes that use radio-frequency or infrared rather than the modern integrated keys handled directly by the GM.

**Buses:** K. **Chassis coverage:** Older chassis.

## Address

`0xB9`. *Sources:* Wilhelm `README.md:157`, Wilhelm `address.md:65` — agreed. BlueBus and bimmerz do not declare this address.

## Messages

No per-command documentation in surveyed sources. Likely emits fob-button events to the GM / EWS / DWA.

## Cross-cutting subsystems

- Predecessor to the integrated remote-key entry handled by the GM (`0x72`). See [`gm.md`](gm.md#messages-where-gm-is-src).
- Cousin of the FBZV at `0x40`. See [`fbzv.md`](fbzv.md).

## Sources

### Wilhelm-docs
- `README.md:157` — device-table entry.
- `address.md:65` — older device-table entry.
