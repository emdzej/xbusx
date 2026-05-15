# EHC (0xAC) — Electronic Height Control

**Status:** Stub.

**Role:** The self-levelling air-suspension controller — Elektronische Höhenstand-Kontrolle. Maintains constant ride height under load by controlling the air-spring compressor and valves. Used on E38, E39 wagon, and chassis with the heavy-load option.

**Buses:** K.

**Chassis coverage:** E38 (sedan with self-levelling rear), E39 wagon.

**Variants:** None known.

---

## Address

`0xAC`. *Sources:* Wilhelm `README.md:155`, Wilhelm `address.md:63`, bimmerz `devices.ts:4` — agreed. BlueBus does not declare an EHC constant.

---

## Messages

The Wilhelm command index lists `0x61` as "EHC → GLO (TBC)" (`README.md:276`) — a status broadcast — but no detail page exists.

> *TBC:* Capture and characterise `0x61` from EHC. Likely carries current ride height + compressor state.

---

## Announce / Pong

```
AC 04 BF 02 01 14
```

> *Source:* Wilhelm `02.md:132`.

---

## Cross-cutting subsystems

- Likely reports ride-height-fault check-control messages via the LCM / CCM chain.

---

## Open questions / TBC

- **`0x61` payload.** Not documented.
- **Compressor activation protocol.** Whether the EHC initiates compressor activation directly or via a body-module command is unknown.

---

## Sources

### Wilhelm-docs
- `README.md:155, 276` — device-table entry, command-index hook.
- `address.md:63` — older device-table entry.
- `02.md:132` — announce frame.

### bimmerz
- `packages/bus/src/devices.ts:4` — address.
