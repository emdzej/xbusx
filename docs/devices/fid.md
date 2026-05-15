# FID (0xA0) — Rear Multi-Functional Display

**Status:** Stub.

**Role:** A rear-seat multi-info display — the rear-cabin analogue of the MID. On long-wheelbase E38s and some E39 wagons, the rear passengers had their own information display.

**Buses:** I. **Chassis coverage:** E38, E39.

## Address

`0xA0`. *Sources:* Wilhelm `README.md:152` (`I`), Wilhelm `address.md:60` (`K`), bimmerz `devices.ts:47` — agreed on address; bus disagreement resolved as **I** (rear-info display is part of the I-bus entertainment stack on E38 high).

## Messages

No per-command documentation specific to the FID. Likely consumes display writes similar to the MID (`0x21`, `0x23`, `0x24`, `0xA5`) — see [`mid.md`](mid.md#messages-where-mid-is-dst).

## Cross-cutting subsystems

- Rear analogue of the MID. See [`mid.md`](mid.md).

## Sources

### Wilhelm-docs
- `README.md:152` — device-table entry.
- `address.md:60` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:47` — address (`FID`).
