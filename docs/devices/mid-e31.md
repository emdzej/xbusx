# MID (0xCD) — E31 Multi-Information Display

**Status:** Stub.

**Role:** The on-board-computer display in the E31 (8 Series). Earlier than the main MID at `0xC0` — different address because the E31 predates the standardisation that came with the E38 generation.

**Buses:** K. **Chassis coverage:** E31.

## Address

`0xCD`. *Sources:* Wilhelm `README.md:162` ("Multi-functional Display, E31"), Wilhelm `address.md:70` ("Multi Information Display (OBC) [E31]") — agreed. BlueBus and bimmerz do not declare this address.

## Messages

No per-command documentation in surveyed sources. The E31-era display likely uses a subset of the later MID's write surface.

## Cross-cutting subsystems

- E31 counterpart to the main MID. See [`mid.md`](mid.md).

## Sources

### Wilhelm-docs
- `README.md:162` — device-table entry.
- `address.md:70` — older device-table entry.
