# MRS (0xA4) — Multiple Restraint System (Airbag)

**Status:** Stub.

**Role:** The airbag / pretensioner control unit — Mehrfach-Rückhalte-System. Monitors crash sensors and deploys airbags and seatbelt pretensioners. Also reports occupant-detection / seatbelt-status to the cluster.

**Buses:** K. **Chassis coverage:** All chassis.

## Address

`0xA4`. *Sources:* Wilhelm `README.md:153`, Wilhelm `address.md:61`, bimmerz `devices.ts:19` (`ABG` — Airbag) — agreed.

## Messages

The Wilhelm command index lists `0x70` as "MRS → GLO (TBC)" (`README.md:277`) — likely an MRS status broadcast. No detail page exists.

## Cross-cutting subsystems

- The MRS reports seatbelt-fastened status that drives the cluster's seatbelt warning lamp. May feed the LCM `0x51` check-control-status (`FASTEN_SEATBELT` bit, see [`lcm.md`](lcm.md#0x51--check-control-status-1-byte-low-cluster-chassis-only)).
- Crash detection on BMW Assist-equipped chassis may trigger emergency-call activation via TEL / TCU.

## Open questions / TBC

- **`0x70` payload.** Not documented.
- **Crash signalling.** Where on the bus does the MRS report a crash event? Likely a high-priority broadcast.

## Sources

### Wilhelm-docs
- `README.md:153, 277` — device-table entry and command-index hook.
- `address.md:61` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:19` — address (`ABG`).
