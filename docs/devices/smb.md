# SMB (0xDA) — Seat Memory, Passenger

**Status:** Stub.

**Role:** Passenger-side seat-memory module — stores and recalls preset passenger seat positions per key (where the option includes passenger-side memory).

**Buses:** K. **Chassis coverage:** E46 with the memory option.

## Address

`0xDA`. *Sources:* Wilhelm `README.md:163` (`SMB`), Wilhelm `address.md:72`, bimmerz `devices.ts:64` (`SMAD` — Seat Memory Assistant Driver) — agreed on address; name varies.

SMB stands for "Seat Memory, Beifahrer" (passenger side, in German). bimmerz's `SMAD` is a different mnemonic for the same module.

## Messages

No per-command documentation in surveyed sources.

## Cross-cutting subsystems

- Companion to the driver seat memory (`0x71` / `0x72`). See [`sm-driver.md`](sm-driver.md).

## Sources

### Wilhelm-docs
- `README.md:163` — device-table entry.
- `address.md:72` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:64` — address (`SMAD`).
