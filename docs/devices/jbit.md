# JBIT (0x48) — Telephone (Japan)

**Status:** Stub.

**Role:** Japanese-market telephone variant. Distinct address from the global TEL (`0xC8`) because of regulatory and frequency-band differences.

**Buses:** K. **Chassis coverage:** JP-spec.

## Address

`0x48`. *Sources:* Wilhelm `README.md:130`, Wilhelm `address.md:43` — agreed. BlueBus and bimmerz do not declare JBIT.

## Messages

No per-command documentation in surveyed sources. Likely a subset / variant of the TEL command surface — see [`tel.md`](tel.md).

## Cross-cutting subsystems

- See [`tel.md`](tel.md) — JBIT presumably participates in the same telephone-UI subsystem with locale-specific differences.

## Sources

### Wilhelm-docs
- `README.md:130` — device-table entry.
- `address.md:43` — older device-table entry.
