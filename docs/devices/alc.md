# ALC (0x66) — Active / Adaptive Light Control

**Status:** Stub.

**Role:** Headlight steering — turns the headlight aim with the steering wheel for cornering illumination. On chassis with the "Adaptive Headlights" option. BMW's internal abbreviation is ALC ("Active Light Control"); the marketing term is AHL ("Adaptive Headlight").

**Buses:** K.

**Chassis coverage:** Optional, most chassis with high-end lighting packages.

**Variants:** None known.

---

## Address

`0x66`. *Sources:* Wilhelm `README.md:136` (`ALC`), Wilhelm `address.md:48`, bimmerz `devices.ts:16` (`AHL`) — agreed on address; name varies. BlueBus does not declare a constant for this address.

---

## Messages

No per-command documentation exists in the surveyed sources.

> *TBC:* Capture ALC traffic on a chassis with the option installed. Expected inputs: steering-angle from the steering-angle sensor (`0x57` on D-bus), vehicle speed from IKE (`0x18`). Expected outputs: headlight-position drive commands, likely on a sub-system that doesn't ride the K-bus directly.

---

## Cross-cutting subsystems

- Related to **ALWR** (Automatic headlight vertical aim, `0x9A`) — same general purpose, different axis. See [`alwr.md`](alwr.md).
- Steering-angle input lives on D-bus (`LWS 0x57`) — out of scope for this reference.

---

## Open questions / TBC

- **Per-command catalogue.** No source documents commands.
- **AHL vs ALC.** Same device, different names. Verify this isn't actually two different modules on different chassis.

---

## Sources

### Wilhelm-docs
- `README.md:136` — device-table entry (`ALC`).
- `address.md:48` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:16` — address (`AHL`).
