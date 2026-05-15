# SES (0xB0) — Speech Input / Recognition System

**Status:** Stub.

**Role:** The speech-recognition module — accepts voice commands from the steering-wheel voice button (MFL TEL/voice press), interprets them, and emits control commands to the navigation, telephone, and audio stacks. Optional on most chassis.

**Buses:** K/I.

**Chassis coverage:** Optional. Where present, integrates with the MFL voice button.

**Variants:** None known.

---

## Address

`0xB0`. *Sources:* BlueBus `ibus.h:33`, Wilhelm `README.md:156`, bimmerz `devices.ts:15` — agreed.

---

## Known constants

The only protocol-level surface BlueBus exposes for SES is **navigation control** — the SES drives the nav map / silence / zoom / route-fuel actions over a single command (`0xAA`):

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_SES_CMD_NAV_CTRL` | `0xAA` | Navigation-control command (matches GT's `0xAA` to NAV). |
| `IBUS_SES_DATA_NAV_CTRL_SHOWMAP` | `0x04` | Show map. |
| `IBUS_SES_DATA_NAV_CTRL_SILENCE` | `0x06` | Silence the nav voice guidance. |
| `IBUS_SES_DATA_NAV_CTRL_SETZOOM` | `0x10` | Set zoom (followed by a zoom-level byte; valid range `0..7`). |
| `IBUS_SES_DATA_NAV_CTRL_ROUTEFUEL` | `0x20` | Route to fuel station. |
| `IBUS_SES_ZOOM_LEVELS` | `8` | Number of zoom levels (`0..7`). |

> *Source:* BlueBus `ibus.h:543–548`.

---

## Messages

### `0xAA` — Navigation control

**Direction:** SES `0xB0` → NAV `0x7F`.

Same command byte as the GT's navigation-control message — the SES and GT are both legitimate sources. The data byte selects the action; zoom additionally takes a level byte.

> *Source:* BlueBus `ibus.h:544–547`. Wilhelm `nav/aa.md` documents the broader `0xAA` from GT / GTF; the SES variant uses the same byte layout.

---

## Cross-cutting subsystems

- The SES sits adjacent to *subsystems/telephone-ui (planned)* — voice activation routes through the SES, which then drives the telephone via TEL-bound commands.
- The navigation-control surface overlaps with GT — see [`gt.md`](gt.md#0xaa--navigation-control).

---

## Open questions / TBC

- **Inputs.** How does the SES receive the voice-activation request from the MFL? Direct (MFL→SES) or indirect (MFL→TEL→SES)? Not documented.
- **Audio path.** The SES must mute the radio audio while listening — what is the protocol-level mechanism? Likely a DSP or RAD command, but not documented.
- **Recognition feedback.** Does the SES emit any text-display update (e.g., "Listening…") or is the UI handled entirely by GT? Unknown.
- **Per-command catalogue.** Wilhelm has no `ses/` directory. BlueBus exposes only the navigation-control surface.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:33` — address.
- `firmware/application/lib/ibus.h:543–548` — navigation-control constants.

### Wilhelm-docs
- `README.md:156` — device-table entry. No per-command pages.
- `nav/aa.md` — `0xAA` Navigation Control (documents the GT side; the SES uses the same command).

### bimmerz
- `packages/bus/src/devices.ts:15` — address.
