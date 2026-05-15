# CDCD (0x76) — CD Changer (DIN size)

**Status:** Stub.

**Role:** A DIN-size CD changer — distinct from the trunk-mounted CDC at `0x18`. Same general role (multi-disc audio source) but in a different physical form factor.

**Buses:** K. **Chassis coverage:** Optional across most chassis as a head-unit-integrated changer.

## Address

`0x76`. *Sources:* BlueBus `ibus.h:30` (`IBUS_DEVICE_CDCD`), Wilhelm `README.md:144`, Wilhelm `address.md:56`, bimmerz `devices.ts:42` — agreed.

## Messages

No per-command documentation specific to CDCD in surveyed sources. The CDCD likely uses a CDC-style request / response pair (`0x38` / `0x39`) like the CDC at `0x18`, addressed to `0x76` instead. See [`cdc.md`](cdc.md).

## Cross-cutting subsystems

- See [`cdc.md`](cdc.md) for the analogous protocol; the CDCD is likely a parallel implementation on a different address.

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:30` — address.

### Wilhelm-docs
- `README.md:144` — device-table entry.
- `address.md:56` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:42` — address.
