# DSPC (0xEA) — DSP Controller

**Status:** Stub.

**Role:** A separate DSP-controller module specific to **E38**. Likely a coordinator / parent of the audio DSP (`0x6A`), exposing higher-level configuration (mode select, surround mode) while the DSP at `0x6A` handles the actual audio routing.

**Buses:** K.

**Chassis coverage:** E38 only.

**Variants:** None known.

---

## Address

`0xEA`. *Sources:* Wilhelm `README.md:168`, Wilhelm `address.md:76`, bimmerz `devices.ts:39` — agreed.

BlueBus's `ibus.h` does not declare a `DSPC` device constant — the address is recognised only by Wilhelm and bimmerz.

Wilhelm `README.md` marks the bus as `I`; Wilhelm `address.md` marks it `K`. Resolution: **K** — DSPC is an E38-era body / comfort module, consistent with `address.md`'s assignment and the fact that the E38 has both K and I but most non-nav-stack devices live on K.

---

## Messages

Not documented in any surveyed source. Wilhelm `README.md` does not surface DSPC-specific commands in its command-index section.

---

## Cross-cutting subsystems

- Relationship to **DSP** (`0x6A`) is unclear — see [`dsp.md`](dsp.md). The DSP audio-routing commands (`0x36` config-set) target `0x6A`; the DSPC at `0xEA` likely sits one level up but the boundary is undocumented.

---

## Open questions / TBC

- **DSPC vs DSP coordination.** How do `0xEA` and `0x6A` divide responsibility? Does the DSPC drive the DSP's `0x36` commands, or does the radio drive both directly?
- **Surround / mode selection.** The E38 DSP-equipped audio systems offer surround modes (Concert Hall, Cathedral, etc.). Where is the mode-selection protocol surfaced — `0xEA`, `0x6A`, or both?
- **Per-command catalogue.** No source has documented DSPC commands.

---

## Sources

### Wilhelm-docs
- `README.md:168` — device-table entry.
- `address.md:76` — older device-table entry (K-bus assignment).

### bimmerz
- `packages/bus/src/devices.ts:39` — address (`DSPC`).
