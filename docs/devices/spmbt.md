# SPMBT (0x51) — Mirror Memory, Passenger

**Status:** Stub.

**Role:** Passenger-side mirror-position memory module — stores and recalls preset mirror positions per key.

**Buses:** K. **Chassis coverage:** E46 and later chassis with the memory-mirror option.

## Address

`0x51`. *Sources:* Wilhelm `README.md:132` (SPMBT), Wilhelm `address.md:45`, bimmerz `devices.ts:34` (`MML`) — agreed on address; name varies (SPMBT vs MML — "Mirror Memory Left").

## Messages

No per-command documentation in surveyed sources.

> *TBC:* Capture mirror-position store and recall frames.

## Cross-cutting subsystems

- Companion to the driver-side seat memory (`0x71` / `0x72`, see [`sm-driver.md`](sm-driver.md)) and the passenger-side seat memory (`0xDA`, see [`smb.md`](smb.md)).
- Recall is keyed off the inserted key — EWS authentication may gate it. See [`ews.md`](ews.md).

## Sources

### Wilhelm-docs
- `README.md:132` — device-table entry.
- `address.md:45` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:34` — address.
