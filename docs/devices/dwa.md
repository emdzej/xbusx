# DWA (0x45) — Anti-Theft System

**Status:** Stub.

**Role:** The alarm / anti-theft module — Diebstahl-Warn-Anlage. Monitors door / hood / boot states, ultrasonic interior sensors, and tilt sensors; triggers the alarm horn and hazard lights on intrusion.

**Buses:** K.

**Chassis coverage:** Optional across most chassis.

**Variants:** None known.

---

## Address

`0x45`. *Sources:* Wilhelm `README.md:127`, Wilhelm `address.md:40` — agreed. BlueBus does not declare a `DWA` constant. bimmerz does not list `0x45`.

---

## Messages

No per-command documentation exists in the surveyed sources.

> *TBC:* Capture and characterise DWA traffic — likely interacts with GM (`0x00`) for arm / disarm coordinated with central locking, and with the IKE for alarm-state display.

---

## Cross-cutting subsystems

- Likely consumes GM door / lid status (`0x7A`) and the `0x72` remote-key-entry frames to drive arm / disarm.
- May write check-control alarm messages via the LCM / CCM chain (`0x1A`).

---

## Open questions / TBC

- **Per-command catalogue.** Wilhelm has no `dwa/` directory; neither BlueBus nor bimmerz expose DWA-specific commands.
- **Arm / disarm protocol.** Probably driven by GM's remote-key-entry frame; needs confirmation.
- **Alarm-trigger output.** What does the DWA emit when the alarm fires?

---

## Sources

### Wilhelm-docs
- `README.md:127` — device-table entry.
- `address.md:40` — older device-table entry.
