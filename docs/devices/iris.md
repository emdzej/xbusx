# IRIS (0xE0) — Integrated Radio Information System

**Status:** Stub.

**Role:** An integrated radio-and-information module specific to **E39**. Combines tuner functions with an information display in a unified housing. On non-IRIS E39s the radio (`0x68`) and the MID (`0xC0`) are separate; on IRIS-equipped E39s the IRIS subsumes both.

**Buses:** K.

**Chassis coverage:** E39 (specific trim levels).

**Variants:** None known.

---

## Address

`0xE0`. *Sources:* BlueBus `ibus.h:40`, Wilhelm `README.md:165`, bimmerz `devices.ts:53` — agreed.

---

## Messages

No per-command documentation exists in the surveyed sources. BlueBus tracks IRIS at the module-status level (`moduleStatus.IRIS` in the IBus context, `ibus.h:684`) but exposes no IRIS-specific commands.

> *TBC:* Capture and characterise IRIS traffic on an E39 with IRIS installed. It is likely the IRIS responds to the same write surface used by the radio and MID (`0x21`, `0x23`, `0x24`) — but as the destination rather than as two separate addresses.

---

## Cross-cutting subsystems

- On IRIS-equipped E39s, the **radio↔GT arbitration** (where it exists at all — IRIS implies a non-nav configuration) may simplify because radio and display are unified.
- *subsystems/obc-display (planned)* may need an IRIS-specific note: the IKE-driven OBC display would target IRIS rather than MID.

---

## Open questions / TBC

- **Address overlap with the radio.** The radio (`0x68`) and IRIS (`0xE0`) are distinct addresses on the same bus. On an IRIS-equipped E39, does the radio at `0x68` still respond, or is its address absorbed into IRIS?
- **Per-command catalogue.** Wilhelm has no `iris/` directory.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:40` — address.
- `firmware/application/lib/ibus.h:684` — module-status tracking.

### Wilhelm-docs
- `README.md:165` — device-table entry. No per-command pages.

### bimmerz
- `packages/bus/src/devices.ts:53` — address.
