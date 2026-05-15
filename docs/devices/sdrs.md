# SDRS (0x73) — Sirius Satellite Radio

**Status:** Stub.

**Role:** Sirius satellite-radio receiver. US-spec only. Presents itself to the head unit (RAD `0x68`) as an additional media source, similar in role to the CDC but for streaming satellite audio.

**Buses:** K/I (assumed — sat-radio integration sits on the audio bus alongside the radio and CDC).

**Chassis coverage:** US-market only, optional. E39, E46, E53 — chassis-specific.

**Variants:** None known.

---

## Address

`0x73`. *Sources:* BlueBus `ibus.h:29`, bimmerz `devices.ts:41` — agreed. Wilhelm does not list `0x73` in `README.md:113–174` or `address.md:1–80`.

---

## Messages

No per-command documentation exists in the surveyed sources. The SDRS protocol is presumed to mirror the CDC pattern at `0x18` (status / request choreography on `0x38` / `0x39`), but addressed to `0x73` instead. The radio would treat the SDRS as a parallel media source.

> *TBC:* Capture SDRS traffic on a US-spec E39 / E46 with the option installed. The Sirius CCC controller's diagnostic surface is documented in EDIABAS-related materials but those are out of scope for this reference.

---

## Cross-cutting subsystems

- Likely parallels *subsystems/cdc-emulation (planned)* but with `0x73` as the source / destination.

---

## Open questions / TBC

- **Command set.** Whether SDRS shares the `0x38` / `0x39` CDC command convention or uses its own opcodes is undocumented. Address-pool conventions suggest reuse, but capture is needed.
- **Channel and metadata.** Sirius supports channel numbers, channel names, and song metadata — the protocol surface that drives the radio's display string is undocumented.
- **Wilhelm gap.** No `sdrs/` directory. No `0x73` reference in Wilhelm's address tables.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:29` — address.

### bimmerz
- `packages/bus/src/devices.ts:41` — address.

### Wilhelm-docs
- Not present in surveyed device tables.
