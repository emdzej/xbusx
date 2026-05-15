# CID (0x46) — Central Information Display

**Status:** Stub.

**Role:** The flip-up LCD screen in the centre dash on E83 (X3) and E85 (Z4). A smaller display than the BMBT / GT — used on chassis without a navigation computer but with a central info display.

**Buses:** K. **Chassis coverage:** E83, E85.

## Address

`0x46`. *Sources:* BlueBus `ibus.h:22`, Wilhelm `README.md:128`, Wilhelm `address.md:41`, bimmerz `devices.ts:32` — agreed.

Wilhelm `README.md` marks bus as `I`, `address.md` marks `K`. **Resolution: K** — E83 and E85 are K-only chassis (per [`../overview.md`](../overview.md)) and so a CID on these chassis must be on K.

## Messages

No per-command documentation specific to the CID in surveyed sources. The CID likely consumes radio / OBC display writes (`0x23`, `0x24`) similar to the MID.

## Cross-cutting subsystems

- Probably receives the same display-write traffic the MID receives on its chassis. See [`mid.md`](mid.md#messages-where-mid-is-dst).

## Open questions / TBC

- **Per-command coverage.** No `cid/` directory in Wilhelm.
- **Multicast subscription.** Does the CID listen on the `0xE7` displays multicast?

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:22` — address.

### Wilhelm-docs
- `README.md:128` — device-table entry.
- `address.md:41` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:32` — address.
