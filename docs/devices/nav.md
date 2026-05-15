# NAV (0x7F) — Navigation Computer (Europe)

**Status:** Stub.

**Role:** The European-spec navigation computer — the brain behind the GT's display. Holds the route, computes turn-by-turn, sources GPS time and coordinates, and drives the GT's render.

**Buses:** K/I. **Chassis coverage:** E38, E39, E53 High — chassis equipped with navigation.

**Variants:** MK1 / MK2 / MK3 / MK4 generations match the corresponding GT generations — see [`gt.md`](gt.md#variants).

---

## Address

`0x7F`. *Sources:* BlueBus `ibus.h:31` (`IBUS_DEVICE_NAVE`), Wilhelm `README.md:145`, Wilhelm `address.md:57`, bimmerz `devices.ts:43` (`NAVE`) — agreed.

(The Japanese-spec variant is at `0xBB` — see [`naj.md`](naj.md).)

---

## Announce / Pong

Wilhelm `02.md:88–93` lists two variant signatures for `0x7F`:

| Variant | Signature | Frame |
|---|---|---|
| Nav MK4? | `0x40` | `7F 04 BF 02 41 87` |
| Nav MK4? + BMW Assist | `0xC0` | `7F 04 BF 02 C1 07` |

The BMW Assist variant configures the telephone (TCU) and may affect MRS / impact-notification behaviour.

> *Source:* Wilhelm `02.md:88–96`.

---

## Messages where NAV is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x1F` | GPS time | IKE `0x80` | UTC, 24-hour, packed BCD, broadcast at the top of each minute. | W `nav/1f.md` |
| `0xA2` | Telematics coordinates | TEL `0xC8` | GPS lat / lon / altitude. 18-byte fixed payload. | W `nav/a2.md` · BB `ibus.h:592` |
| `0xA4` | Telematics location | TEL `0xC8` | Address string (street / city). 31-byte fixed payload. | W `nav/a4.md` · BB `ibus.h:593` |
| `0xAB` | Navigation view status | GTF `0x43` | NAV reports nav / radio focus state. | W `nav/ab.md` |

---

## Messages where NAV is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0xAA` | Navigation control | GT `0x3B`, GTF `0x43`, SES `0xB0` | Map scale, POI focus, voice silence, route to fuel. | W `nav/aa.md` · BB `ibus.h:544` (`IBUS_SES_CMD_NAV_CTRL`) |

---

## Per-message detail

See [`gt.md`](gt.md#0x1f--gps-time-received-from-nav) for `0x1F`, [`gt.md`](gt.md#0xa2--telematics-coordinates-forwarded) for `0xA2`, and [`gt.md`](gt.md#0xa4--telematics-location-forwarded) for `0xA4` — those are the GT-side documentation of the same frames the NAV originates.

## Cross-cutting subsystems

- *subsystems/radio-gt-arbitration (planned)* — NAV's GT drives the display; it's not the radio's arbitration counterparty, but the GT (`0x3B`) it powers is.
- *subsystems/telephone-ui (planned)* — telematics flow originates here.

## Open questions / TBC

- **`0xAB` NAV view status.** Wilhelm has a page (`nav/ab.md`) that wasn't surveyed in depth in this draft. Fold in.
- **Route guidance audio cue protocol.** How does NAV ask the radio / DSP to attenuate music for a voice cue?

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:31` — address.
- `firmware/application/lib/ibus.h:591–593` — `IBUS_TCU_SINGLE_LINE_UI_MAX_LEN`, `IBUS_TELEMATICS_COORDS_LEN 18`, `IBUS_TELEMATICS_LOCATION_LEN 31`.
- `firmware/application/lib/ibus.h:544–548` — SES → NAV `0xAA` constants.

### Wilhelm-docs
- `02.md:88–96` — variant announce frames.
- `nav/1f.md`, `nav/a2.md`, `nav/a4.md`, `nav/aa.md`, `nav/ab.md` — per-command pages.
- `README.md:145` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:43` — address (`NAVE`).
