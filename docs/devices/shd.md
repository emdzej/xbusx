# SHD (0x08) — Tilt / Slide Sunroof

**Status:** Stub.

**Role:** The sunroof / moonroof controller. Drives the tilt and slide motors and reports position.

**Buses:** K. **Chassis coverage:** All chassis with a sunroof.

## Address

`0x08`. *Sources:* Wilhelm `README.md:116`, Wilhelm `address.md:15`, bimmerz `devices.ts:22` — agreed. BlueBus does not declare an SHD constant.

## Messages

The Wilhelm command index lists `0x7C` ("SHD → GLO") and `0x7D` ("GM → SHD") as TBC (`README.md:288–289`). No detail pages.

> *TBC:* Capture and characterise the sunroof open / close / tilt / position-report frames.

## Open questions / TBC

- **No per-command coverage.** Even Wilhelm marks both SHD-related commands as TBC.
- **Position telemetry.** Whether the SHD reports continuous position or only discrete states is undocumented.

## Sources

### Wilhelm-docs
- `README.md:116, 288–289` — device-table entry and unindexed command references.
- `address.md:15` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:22` — address.
