# FMBT (0x47) — Rear Compartment Monitor / Control Panel

**Status:** Stub.

**Role:** Rear-seat counterpart to the BMBT — the button panel for the rear entertainment screen. Wilhelm uses **FMBT** ("Fond MBT" — rear BMBT); Wilhelm `address.md` also refers to it as **RCM** (Rear Compartment Monitor).

**Buses:** I. **Chassis coverage:** E38 with rear-entertainment package.

## Address

`0x47`. *Sources:* Wilhelm `README.md:129` (FMBT, `I`), Wilhelm `address.md:42` (RCM, `K`), bimmerz `devices.ts:60` (FMBT) — agreed on address. BlueBus does not declare a constant.

Wilhelm bus disagreement resolved: **I** — the FMBT is part of the nav / entertainment stack on E38 high.

## Messages

No per-command documentation specific to the FMBT. Likely mirrors the BMBT's button-event surface (`0x47`, `0x48`, `0x49`) but addressed for the rear screen.

## Cross-cutting subsystems

- Rear-screen analogue of the BMBT. See [`bmbt.md`](bmbt.md).
- Pairs with the GTF (`0x43`) — rear-screen graphics stage.

## Sources

### Wilhelm-docs
- `README.md:129` — device-table entry (FMBT).
- `address.md:42` — older device-table entry (RCM).

### bimmerz
- `packages/bus/src/devices.ts:60` — address.
