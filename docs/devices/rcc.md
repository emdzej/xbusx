# RCC / FUH (0x28) — Radio Controlled Clock

**Status:** Stub.

**Role:** Atomic-clock receiver — receives the German DCF77 long-wave time signal and provides absolute time to the IKE. Found on early E38s.

**Buses:** K. **Chassis coverage:** E38 (early).

## Address

`0x28`. *Sources:* BlueBus `ibus.h:16` (`IBUS_DEVICE_FUH`), Wilhelm `README.md:119`, Wilhelm `address.md:30`, bimmerz `devices.ts:24` — agreed on address.

Name varies: BlueBus uses **FUH** (Funkuhr); Wilhelm and bimmerz use **RCC** (Radio Clock Control). Same device.

Wilhelm `README.md` marks bus as `I`, `address.md` marks `K`. **Resolution: K** (consistent with the chassis-applicability of early E38, and BlueBus's grouping of the constant with body devices).

## Messages

No per-command documentation in surveyed sources.

> *TBC:* The RCC likely emits a time / date frame consumed by the IKE for its display. Once GPS-derived time (`0x1F` from the NAV) became available, the RCC fell out of use.

## Cross-cutting subsystems

- See [`gt.md`](gt.md#0x1f--gps-time-received-from-nav) for the GPS-driven replacement signal that supersedes the RCC.

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:16` — address (`IBUS_DEVICE_FUH`).

### Wilhelm-docs
- `README.md:119` — device-table entry.
- `address.md:30` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:24` — address (`RCC`).
