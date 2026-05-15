# RDC (0x70) — Tyre Pressure Control / Deflation Warning

**Status:** Stub.

**Role:** Tyre-pressure monitoring — Reifendruckkontrolle. Pre-TPMS-direct-sensor systems used the ABS wheel-speed sensors to detect a slow leak (RDC / DWS); later systems added direct-pressure sensors. The RDC module compares wheel-rotation speeds and warns the driver of a deflation.

**Buses:** K.

**Chassis coverage:** Optional across most chassis.

**Variants:** Two names — RDC ("Reifendruckkontrolle") and DWS ("Deflation Warning System") — likely the same module under different marketing labels.

---

## Address

`0x70`. *Sources:* Wilhelm `README.md:141`, Wilhelm `address.md:53`, bimmerz `devices.ts:54` — agreed. BlueBus does not declare an RDC constant.

---

## Messages

No per-command documentation exists in the surveyed sources.

> *TBC:* Capture RDC traffic. Expected: a status / fault broadcast and a "reset / re-initialise" command sent from the user via the settings menu.

---

## Cross-cutting subsystems

- Likely reports a tyre-warning via the LCM / CCM check-control message chain (`0x1A`).
- May be activated by a menu item on the GT / BMBT for reset / re-init.

---

## Open questions / TBC

- **Per-command catalogue.** Wilhelm has no `rdc/` directory.

---

## Sources

### Wilhelm-docs
- `README.md:141` — device-table entry.
- `address.md:53` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:54` — address.
