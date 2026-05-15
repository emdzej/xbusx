# NAJ (0xBB) — Navigation Computer (Japan)

**Status:** Stub.

**Role:** Japanese-market navigation computer — equivalent to the European NAV at `0x7F`, but with JP-spec mapping, charset, and possibly cellular bands.

**Buses:** K/I. **Chassis coverage:** JP-spec.

## Address

`0xBB`. *Sources:* BlueBus `ibus.h:34` (`IBUS_DEVICE_JNAV`), Wilhelm `README.md:158`, Wilhelm `address.md:66`, bimmerz `devices.ts:48` (`NAVJ`) — agreed on address; name varies.

## Messages

No per-command documentation specific to NAJ. Likely mirrors the NAV command surface — see [`nav.md`](nav.md).

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:34` — address (`IBUS_DEVICE_JNAV`).

### Wilhelm-docs
- `README.md:158` — device-table entry.
- `address.md:66` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:48` — address (`NAVJ`).
