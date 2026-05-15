# GT (0x3B) — Graphics Stage / Graphics Terminal

**Status:** Draft.

**Role:** The navigation computer's display interface — the layer that draws menus, lists, titles, indices, and overlays on the main on-board monitor. The GT is also the locus of two major cross-cutting protocols: the **radio↔GT UI arbitration** (`0x46` / `0x45` choreography), and the **OBC display flow** (forwards OBC inputs and controls to the IKE on behalf of the user). Telematics data (GPS time, coordinates, location strings) flows through this address too.

**Buses:** I.

**Chassis coverage:** E38, E39, E53 High. Absent on K-only chassis (E46, E83/E85, E87). The rear-screen variant lives at `0x43` (GTF — see [`gtf`](gtf.md) *(planned)*).

**Variants:** 6 — MK1 through MK4_STATIC. The variant changes feature support significantly.

---

## Address

`0x3B`. *Sources:* BlueBus `ibus.h:18`, Wilhelm `README.md:122`, bimmerz `devices.ts:26` — agreed on the address. Wilhelm `README.md` marks it `I`, Wilhelm `address.md:36` marks it `K`; the canonical assignment is **I** (see the systematic-discrepancy section in [`README.md`](README.md)).

---

## Variants

| Constant | Value | Notes |
|---|---|---|
| `IBUS_GT_DETECT_ERROR` | 0 | Variant detection failed — fall-through sentinel. |
| `IBUS_GT_MKI` | 1 | First-generation navigation. Single-line indices. |
| `IBUS_GT_MKII` | 2 | Second-generation. |
| `IBUS_GT_MKIII` | 3 | Third-generation, standard UI. |
| `IBUS_GT_MKIII_NEW_UI` | 4 | MKIII with the **new UI** introduced at software version 40+. |
| `IBUS_GT_MKIV` | 5 | Fourth-generation. |
| `IBUS_GT_MKIV_STATIC` | 6 | MKIV with software version ≥ 40 — supports static screens. |

> *Source:* BlueBus `ibus.h:241–249`.

### Detection

The GT variant is determined by reading the diagnostic ident response at fixed byte offsets:

| Constant | Offset | Meaning |
|---|---|---|
| `IBUS_GT_HW_ID_OFFSET` | 11 | Hardware ID. |
| `IBUS_GT_DI_ID_OFFSET` | 15 | Diagnostic ID. |
| `IBUS_GT_SW_ID_OFFSET` | 33 | Software version. |

> *Source:* BlueBus `ibus.h:250–252`.

The MKIII → MKIII_NEW_UI and MKIV → MKIV_STATIC transitions are gated on software version ≥ 40 (per inline comments at `ibus.h:245, 248`).

### Capability differences

| Feature | MK1 | MK2 | MK3 | MK3 new UI | MK4 | MK4 static |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Indexed lists (`0x60`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Static screens (`0x63`) | | | | | | ✓ |
| Splitscreen + NG-Radio station list (`0xD4`) | | | | ✓ | ✓ | ✓ |
| Title with cursor (`0xA5`) | | | ✓ | ✓ | ✓ | ✓ |
| Telematics writes (`0xA2`, `0xA4`) | | | ✓ | ✓ | ✓ | ✓ |

> *Source:* inferred from BlueBus's per-variant branching across `ibus.c` and from the constants `IBUS_GT_TONE_MENU_OFF 0x08` / `IBUS_GT_SEL_MENU_OFF 0x04` (`ibus.h:253–254`), which apply to MKIII new-UI and above.

---

## Announce / Pong

Wilhelm `02.md:81–87` lists two variant signatures for `0x3B`:

| Variant | Signature | Frame |
|---|---|---|
| Video-Module GT (no nav) | `0x10` | `3B 04 FF 02 11 D3` |
| Nav GT (incl. MK1) | `0x40` | `3B 04 BF 02 41 C3` |

The signature sits in the high bits of byte 4 (`VARIANT = 0b1111_1000`). After announce, MK1/2/3/4 sub-variant discovery requires a diagnostic ident exchange — see [Detection](#detection).

---

## Messages where GT is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x20` | Change UI request | RAD `0x68` *or* BMBT `0xF0` | Request a UI-mode change (radio, nav, audio, OBC). | BB `ibus.h:174` |
| `0x21` | Write — no cursor | broadcast / displays | Write menu text (MKIII +). Overloaded — also used by the radio for MID writes; context disambiguates. | BB `ibus.h:172, 175` |
| `0x22` | Menu buffer status | broadcast | Notify that a menu buffer has been loaded or cleared. | BB `ibus.h:176` |
| `0x23` | Write title | broadcast | Set the menu title text. | BB `ibus.h:177` |
| `0x31` | Menu select | broadcast | Forward a menu-item selection (also used for brightness adjustments on some MK generations). | BB `ibus.h:178` · W `gt/05.md:69` |
| `0x37` | Display radio menu | RAD `0x68` | Forward the radio tone / select menu to the display. | BB `ibus.h:179` |
| `0x40` | OBC input | IKE `0x80` | Set time / date / distance / limit / code / aux. timer. | W `gt/40.md` |
| `0x41` | OBC control | IKE `0x80` | Request / activate / deactivate / recalculate OBC properties. | W `gt/41.md` |
| `0x45` | Set radio UI | RAD `0x68` | The **GT side of the arbitration handshake**. Drives radio foreground vs background, audio+OBC mode, new-UI mode. | W `gt/45.md` · BB `ibus.h:180` |
| `0x4E` | Radio audio input | RAD `0x68` | Signal a radio audio-input source change. | BB `ibus.h:181` |
| `0x4F` | Monitor control | BMBT `0xF0` | Power, video source, encoding (PAL/NTSC), aspect (4:3 / 16:9 / Zoom). | W `bmbt/4f.md` · BB `ibus.h:182` |
| `0x60` | Write index | broadcast | Indexed menu text (MKIII). | BB `ibus.h:183` |
| `0x61` | Write index TMC | broadcast | Traffic-Message-Channel indexed text. | BB `ibus.h:184` |
| `0x62` | Write zone | broadcast | Zone / region text. | BB `ibus.h:185` |
| `0x63` | Write static | broadcast | Static-screen text (MKIV_STATIC only). | BB `ibus.h:186` |
| `0xA2` | Telematics coordinates | TEL `0xC8` (forwarded from NAV) | GPS latitude / longitude / altitude. 18 bytes. | W `nav/a2.md` · BB `ibus.h:187` |
| `0xA4` | Telematics location | TEL `0xC8` (forwarded from NAV) | Address string (street / city). 31 bytes. | W `nav/a4.md` · BB `ibus.h:188` |
| `0xA5` | Write with cursor | broadcast | Indexed text with cursor position (MKIII). | BB `ibus.h:189` |
| `0xAA` | Navigation control | NAV `0x7F` | Map scale, POI focus. | W `nav/aa.md` |

---

## Messages where GT is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x01` | Ping | any | Liveness probe. GT replies with `0x02`. | W `02.md` |
| `0x06` | Service-mode reply | BMBT `0xF0` | Diagnostic identity (part number, HW level, MFG date, SW level). | W `bmbt/06.md` |
| `0x24` | OBC text | IKE `0x80` | Property text (time, date, range, temperature, …) — answer to GT's `0x41` request. | W `ike/24.md` |
| `0x46` | Request radio UI | RAD `0x68` | The **radio side of arbitration** — priority bit + hide-body flags. | W `radio/46.md` |
| `0x47` | Soft buttons | BMBT `0xF0` | Info / Select widescreen soft-button events. | W `bmbt/47.md` |
| `0x48` | Hard buttons | BMBT `0xF0` | Preset / mode / power / tape / tone / radio / band / tel / menu / confirm. | W `bmbt/48.md` |
| `0x49` | Navigation dial | BMBT `0xF0` | Rotary dial direction + step. | W `bmbt/49.md` |
| `0x4F` | Monitor control reply | BMBT `0xF0` | BMBT echoes monitor state back. | W `bmbt/4f.md` |
| `0xD4` | NG-Radio station list | RAD `0x68` | BM54-only buffered station-name list. | W `radio/d4.md` |

GT also receives ping (`0x01`) from any peer and replies with `0x02 0x00` Pong (no announce bit set).

---

## Bit fields and enums

### `0x45` Set Radio UI — byte layout

The single payload byte is a bitmask of priorities and overlay-hide flags:

| Mask | Meaning |
|---|---|
| `0x00` | Radio foreground, no audio+OBC. |
| `0x01` | Radio background (`PRIORITY_GT`). |
| `0x02` | Radio foreground + audio+OBC. |
| `0x10` | New-UI mode (MK3 v40+, MK4). |
| `0x91` | GT background, new-UI, new-UI-hide set (`0x80 | 0x10 | 0x01`). Used when MENU is pressed on a new-UI MK3/4. |

> *Source:* Wilhelm `gt/45.md:15–22`. BlueBus exposes the hide masks at `ibus.h:253–254`: `IBUS_GT_TONE_MENU_OFF 0x08`, `IBUS_GT_SEL_MENU_OFF 0x04`.

### Telematics constants

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TCU_SINGLE_LINE_UI_MAX_LEN` | 11 | Maximum characters for single-line telematics text. |
| `IBUS_TELEMATICS_COORDS_LEN` | 18 | Fixed length of the `0xA2` coordinate payload. |
| `IBUS_TELEMATICS_LOCATION_LEN` | 31 | Fixed length of the `0xA4` address payload. |
| `IBUS_DATA_GT_TELEMATICS_LOCALE` | `0x01` | Address type: city / locale. |
| `IBUS_DATA_GT_TELEMATICS_STREET` | `0x02` | Address type: street. |

> *Source:* BlueBus `ibus.h:260–261, 591–593`.

### MKIII size limits

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_DATA_GT_MKIII_MAX_IDX_LEN` | 14 | Max bytes per indexed-text entry. |
| `IBUS_DATA_GT_MKIII_MAX_TITLE_LEN` | 16 | Max title length. |

> *Source:* BlueBus `ibus.h:262–263`.

### Monitor control codes

The `0x4F` frame uses `IBUS_GT_MONITOR_OFF 0x00` and `IBUS_GT_MONITOR_AT_KL_R 0x10` (`ibus.h:258–259`) for the power field; see [`bmbt.md`](bmbt.md#0x4f--monitor-control) for the full byte layout.

---

## Per-message detail

### `0x45` — Set Radio UI

**Direction:** GT → RAD `0x68`.

**Frame:**

```
3B 04 68 45 <bitfield> <xor>
```

**Example:**

```
3B 04 68 45 91 83     # GT background + new-UI + hide — MENU pressed in MK3 new-UI
```

> *Source:* Wilhelm `radio/arbitration.md:62`. The full arbitration choreography is in *subsystems/radio-gt-arbitration (planned)*.

### `0x40` — OBC input

**Direction:** GT → IKE `0x80`.

```
3B <len> 80 40 <property_id> <data...> <xor>
```

Property IDs follow the OBC table on [`ike.md`](ike.md#obc-property-ids). Examples from Wilhelm `gt/40.md:8–15`:

```
3B 07 80 40 01 8A 2B 2D 71      # Time (property 0x01)
3B 07 80 40 02 19 03 14 F0      # Date (0x02)
3B 06 80 40 07 00 00 FA         # Distance (0x07)
3B 06 80 40 09 00 14 E0         # Speed limit (0x09)
3B 06 80 40 0D 27 0F D8         # Code (0x0D) "9999"
3B 06 80 40 0F 8B 00 79         # Aux. timer 1 (0x0F)
3B 06 80 40 10 02 36 D9         # Aux. timer 2 (0x10)
```

### `0x41` — OBC control

**Direction:** GT → IKE `0x80`.

Two-byte body: property ID + control bitfield.

| Mask | Action |
|---|---|
| `0x01` | Request string (IKE responds with `0x24`). |
| `0x02` | Request boolean (IKE responds with `0x2A`). |
| `0x04` | On / Start. |
| `0x08` | Off / Stop. |
| `0x10` | Recalculate (Consumption 1, Consumption 2, Avg Speed). |
| `0x20` | Set as current speed (Limit only). |

> *Source:* Wilhelm `gt/41.md` and `ike/properties.md:110–169`.

### `0x4F` — Monitor control

**Direction:** GT → BMBT `0xF0`. See [`bmbt.md`](bmbt.md#0x4f--monitor-control) for the full byte layout. Example:

```
3B 04 F0 4F 10 90      # power on at KL-R, NAV GT source
```

### `0xA2` — Telematics coordinates (forwarded)

**Direction:** NAV `0x7F` → TEL `0xC8` originally; GT receives a copy via the same channel (and may forward to the display).

**Frame layout:** 18-byte payload after the command byte.

```
7F 14 C8 A2 <signal> <lat:5> <lon:5> <alt:2> <reserved...> <xor>
```

> *Source:* Wilhelm `nav/a2.md:14–19`.

### `0xA4` — Telematics location (forwarded)

```
7F 23 C8 A4 <unused> <addr_type> <addr_str:30> <xor>
```

`addr_type` ∈ {`0x01` locale, `0x02` street}. The string is fixed-length 30 bytes (space-padded).

> *Source:* Wilhelm `nav/a4.md:14–19`.

### `0x1F` — GPS time (received from NAV)

**Direction:** NAV `0x7F` → IKE `0x80`. GT does not originate this; it may consume the IKE's display update derived from it.

```
7F 0B 80 1F 40 <hh_bcd> <mm_bcd> <dd_bcd> 00 <MM_bcd> <YYYY_bcd_hi> <YYYY_bcd_lo> <xor>
```

UTC, 24-hour, packed BCD. Sent at the top of every minute.

> *Source:* Wilhelm `nav/1f.md:13–16`.

### `0xAA` — Navigation control

**Direction:** GT *or* GTF `0x43` *or* SES `0xB0` → NAV `0x7F`.

Controls map scale, POI focus. Documented in Wilhelm `nav/aa.md:19–25`. Not fully cross-referenced here; see the planned `subsystems/` page on navigation interaction.

---

## Cross-cutting subsystems

- *subsystems/radio-gt-arbitration (planned)* — the `0x45`/`0x46` choreography. **GT's primary cross-device protocol.** The Wilhelm reference at `radio/arbitration.md` is 814 lines of test cases and state machines; this reference will lift the essentials.
- *subsystems/obc-display (planned)* — GT forwards user OBC inputs (`0x40`) and OBC control commands (`0x41`) to the IKE, and receives back property text (`0x24`) and booleans (`0x2A`) for rendering.
- *subsystems/telephone-ui (planned)* — telematics data flow (`0xA2`, `0xA4`) intersects the telephone UI. GT may render or forward.

---

## Open questions / TBC

- **Variant detection in practice.** BlueBus uses fixed offsets into the diagnostic ident response. Whether real-world MK1 and very-early-MK2 modules return clean ident responses at those offsets is not documented.
- **`0x21` overloading.** Used by GT (write-no-cursor), by RAD (C43 screen update), and by RAD (write to MID menu). Source / destination disambiguates, but loggers that key by command byte alone will mix the three.
- **`0xAA` GTF vs GT semantics.** GTF (rear graphics, `0x43`) can also send `0xAA` to NAV but with reduced scope ("focus navigation applet only"). Wilhelm hints at the difference but does not fully document.
- **Full `0x46` reply matrix.** The radio can set multiple hide-body flags simultaneously; the cross-product with GT priority bits is not exhaustively mapped.
- **bimmerz coverage of GT.** Sparse — no dedicated GT device folder at the time of survey. Don't use bimmerz as a GT reference.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:18` — address.
- `firmware/application/lib/ibus.h:172–189` — GT command constants.
- `firmware/application/lib/ibus.h:241–263` — variant enum, detection offsets, hide-menu masks, telematics constants, MKIII size limits.
- `firmware/application/lib/ibus.h:258–259` — monitor-control values.
- `firmware/application/lib/ibus.h:591–593` — telematics payload lengths.
- `firmware/application/handler/handler_ibus.c` — `HandlerIBusGT*` handlers (variant detection, ident response).

### Wilhelm-docs
- `gt/05.md` — service-mode request (GT → BMBT).
- `gt/40.md` — OBC input.
- `gt/41.md` — OBC control.
- `gt/45.md` — set radio UI (GT side of arbitration).
- `radio/arbitration.md` — 814-line treatment of the radio↔GT dance.
- `nav/1f.md` — GPS time.
- `nav/a2.md` — telematics coordinates.
- `nav/a4.md` — telematics location.
- `nav/aa.md` — navigation control.
- `nav/ab.md` — navigation view status.
- `bmbt/4f.md` — monitor control payload from the BMBT side.
- `02.md:81–87` — variant announce table.
- `README.md:122` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:26` — address.
- No dedicated GT device folder at the time of survey.
