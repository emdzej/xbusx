# ALWR (0x9A) — Automatic Headlight Vertical Aim Control

**Status:** Stub.

**Role:** Self-levelling headlight aim — keeps the headlight beam at constant elevation regardless of vehicle load. Mandatory on xenon-equipped chassis (so that the high-intensity beam doesn't blind oncoming drivers as the rear of the car settles under load).

BMW abbreviation **ALWR** ("Automatische Leuchtweitenregulierung"); also referred to as **LWR** in older documentation; bimmerz calls it **HAC** ("Headlight Aim Control").

**Buses:** K/I.

**Chassis coverage:** All xenon-equipped chassis.

**Variants:** None known.

---

## Address

`0x9A`. *Sources:* Wilhelm `README.md:147` (`ALWR`), Wilhelm `address.md:59` (`LWR`), bimmerz `devices.ts:9` (`HAC`) — agreed on address; name varies. BlueBus does not declare a constant.

---

## Messages

No per-command documentation exists in the surveyed sources.

> *TBC:* Capture ALWR traffic. Expected inputs: vehicle pitch / rear-axle position (from a sensor that the LCM reads, see `IBUS_LM_IO_LOAD_REAR_OFFSET` in [`lcm.md`](lcm.md)). Expected outputs: headlight aim-motor drive commands.

---

## Cross-cutting subsystems

- The **LCM**'s `0x90` IO-status frame includes a `IBUS_LM_IO_LOAD_REAR_OFFSET` byte that reads rear ballast / xenon-load feedback — likely the same signal ALWR uses. See [`lcm.md`](lcm.md#diagnostic-packet-byte-offsets).

---

## Open questions / TBC

- **Per-command catalogue.** No source has it.
- **ALWR vs LCM integration.** Is ALWR a separate physical module, or is it integrated into later LCM firmware with the dedicated address used only for diagnostic addressing?

---

## Sources

### Wilhelm-docs
- `README.md:147` — device-table entry (`ALWR`).
- `address.md:59` — older device-table entry (`LWR`).

### bimmerz
- `packages/bus/src/devices.ts:9` — address (`HAC`).
