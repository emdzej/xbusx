# HKM (0x24) — Trunk Lid Module

**Status:** Stub.

**Role:** The boot / trunk lid control unit. Manages soft-close, remote release, and possibly the trunk-internal courtesy lamp on chassis equipped with the option.

**Buses:** K. **Chassis coverage:** E38, E39.

## Address

`0x24`. *Sources:* Wilhelm `README.md:118`, Wilhelm `address.md:29` — agreed. BlueBus and bimmerz do not declare HKM at `0x24`. (bimmerz has `HKM 0x0F`, which appears to be a different module — see [`devices/README.md`](README.md#bimmerz-one-off-outliers).)

## Messages

No per-command documentation in surveyed sources.

> *TBC:* Capture and characterise. Likely receives commands from the GM (`0x00`) for remote trunk release (cf. `IBUS_CMD_ZKE5_JOB_UNLOCK_TRUNK 0x06` in [`gm.md`](gm.md)).

## Cross-cutting subsystems

- Receives remote-trunk-release intent from the GM as part of the door-locks subsystem — see [`gm.md`](gm.md#zke5-job-codes-3-byte-payload-0c-job-01).

## Sources

### Wilhelm-docs
- `README.md:118` — device-table entry.
- `address.md:29` — older device-table entry.
