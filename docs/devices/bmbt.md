# BMBT (0xF0) — On-Board Monitor Control Panel

**Status:** Draft.

**Role:** The physical control panel of the navigation / on-board monitor — the row of hard buttons and the rotary navigation dial directly under the screen. The BMBT originates user-input events (button presses, dial rotations, volume changes) and receives control commands from the GT (monitor power, video source, encoding, aspect) and from the radio (tape transport, LED state).

**Buses:** I.

**Chassis coverage:** E38, E39, E53 (High) — chassis equipped with a high-cluster navigation system. Absent on K-only chassis (E46, E83/E85, E87).

**Variants:** 4 — distinguished only at announce.

---

## Address

`0xF0`. *Sources:* BlueBus `ibus.h:43`, Wilhelm `README.md:170`, bimmerz `devices.ts:59` — agreed.

---

## Variants

| Variant | Announce signature | Wilhelm name | Example announce frame |
|---|---|---|---|
| BMBT 4×3 (tape) | `0x00` | `BMBT_4_3` | `F0 04 BF 02 01 48` |
| BMBT 16×9 (tape) | `0x30` | `BMBT_16_9` | `F0 04 BF 02 31 78` |
| BMBT 16×9 CD | `0x70` | `BMBT_16_9_CD` | *(inferred from variant byte)* |
| BMBT 16×9 MD | `0xB0` | `BMBT_16_9_MD` | *(inferred from variant byte)* |

> *Source:* Wilhelm `02.md:42–45, 108–114`. The variant byte sits in bits 3–7 of the announce signature (`VARIANT = 0b1111_1000`). GT and video module use this byte to choose the correct aspect ratio and video encoding (`02.md:75–79`).

After the announce, the 16×9 sub-variants (tape / CD / MD) are not distinguishable from the wire — there's no protocol-level "what kind of 16×9 are you?" probe. Software has to remember the variant byte from announce.

---

## Announce / Pong

```
F0 04 BF 02 01 48      # 4x3
F0 04 BF 02 31 78      # 16x9 tape
```

> *Source:* Wilhelm `02.md:108–114`.

The BMBT broadcasts on power-up to `0xBF`, allowing the GT and VM (video module) to discover the screen geometry and configure their output accordingly.

---

## Messages where BMBT is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x06` | Service-mode reply | GT `0x3B` | Diagnostic identity response: part number, hardware level, MFG date, software level. | W `bmbt/06.md` |
| `0x32` | Volume (rotary dial) | RAD `0x68` *or* TEL `0xC8` | 1-byte direction + step-count. Routes like the MFL: TEL if a hands-free call is active, RAD otherwise. | W `bmbt/32.md` · BB `ibus.h:169` |
| `0x47` | Soft buttons (widescreen) | `0xBF` (broadcast) | Info / Select soft buttons; widescreen only. Press / hold / release. | W `bmbt/47.md` · BB `ibus.h:142` |
| `0x48` | Hard buttons | GT `0x3B`, RAD `0x68`, or `0xFF` | Preset / mode / power / tape / tone / radio / band / tel / menu / confirm. Press / hold / release. | W `bmbt/48.md` · BB `ibus.h:122–141, 143` |
| `0x49` | Navigation dial | GT `0x3B` | Rotary dial direction (bit 7) + step count (lower 4 bits, `0x01..0x0F`). | W `bmbt/49.md` |
| `0x4F` | Monitor control (reply) | GT `0x3B` | BMBT echoes monitor state back to GT. | W `bmbt/4f.md` |

---

## Messages where BMBT is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x05` | Service-mode request | GT `0x3B` | Diagnostic probe; BMBT answers with `0x06`. | W `bmbt/06.md:13–16` |
| `0x4A` | Tape / LED control | RAD `0x68` | LED on/off, tape eject, play / stop / FF / RW, dolby, side select. | W `bmbt/4a.md` |
| `0x4F` | Monitor control (command) | GT `0x3B`, VID `0xED` | Power, video source, encoding (NTSC / PAL), aspect (4:3 / 16:9 / Zoom). | W `bmbt/4f.md` |

---

## Bit fields and enums

### Button-state encoding (`0x47` and `0x48`)

The upper two bits of the button byte encode state; the lower six bits identify the button.

| State | Upper-bit mask | Encoding |
|---|---|---|
| PRESS | `0b00_xxxxxx` | `0x00` OR-ed with button-ID |
| HOLD | `0b01_xxxxxx` | `0x40` OR-ed with button-ID |
| RELEASE | `0b10_xxxxxx` | `0x80` OR-ed with button-ID |

So `BUTTON_TEL_PRESS 0x08`, `BUTTON_TEL_HOLD 0x48`, `BUTTON_TEL_RELEASE 0x88` are all the *same* button (TEL = `0x08`) with three different states.

> *Source:* Wilhelm `bmbt/48.md:23–62`; BlueBus `ibus.h:121–141` (comment: "All button presses are triggered on the 'Push' message" — i.e. the BMBT does fire press / hold / release distinctly).

### Hard-button IDs (`0x48`)

| ID | Button | Notes |
|---|---|---|
| `0x00` | Next track | |
| `0x01` | Preset 2 | |
| `0x02` | Preset 4 | |
| `0x03` | Preset 6 | |
| `0x04` | Tone | |
| `0x05` | Confirm (nav dial press) | |
| `0x06` | Power (volume-dial press) | |
| `0x07` | Aux heat / Clock | |
| `0x08` | TEL | |
| `0x10` | Previous track | |
| `0x11` | Preset 1 | |
| `0x12` | Preset 3 | |
| `0x13` | Preset 5 | |
| `0x14` | Tape side | |
| `0x20` | Select | 4×3 only. |
| `0x21` | AM | |
| `0x22` | Dolby B / RDS | |
| `0x23` | Mode (prev) | |
| `0x24` | Tape eject | |
| `0x30` | Overlay | |
| `0x31` | FM | |
| `0x32` | Dolby C / TP | |
| `0x33` | Mode (next) | 4×3 only. |
| `0x34` | Menu | |

> *Source:* Wilhelm `bmbt/48.md:29–56`. BlueBus encodes most of these as flat constants (e.g. `IBUS_DEVICE_BMBT_BUTTON_TEL_PRESS 0x08`, `..._HOLD 0x48`, `..._RELEASE 0x88` at `ibus.h:136–138`) — but only for the buttons BlueBus needs to react to.

BlueBus also defines `IBUS_DEVICE_BMBT_BUTTON_MENU_RELEASE 0xB4` (`ibus.h:139`) — that's button-ID `0x34` (Menu) with the RELEASE bits set (`0x80 | 0x34`). See [Open questions](#open-questions--tbc) on BlueBus's menu-release injection workaround.

### Soft-button IDs (`0x47`)

| Mask | Button |
|---|---|
| `0b0000_1111` | Select |
| `0b0011_1000` | Info |

> *Source:* Wilhelm `bmbt/47.md:28–37`.

### Video source (`0x4F` byte 1)

| Mask | Source |
|---|---|
| `0b00` | NAV / GT (`IBUS_VIDEO_SOURCE_NAV_GT 0`) |
| `0b01` | TV (`IBUS_VIDEO_SOURCE_TV 1`) |
| `0b10` | VID GT (`IBUS_VIDEO_SOURCE_VM_GT 2`) |

> *Source:* BlueBus `ibus.h:108–110`; Wilhelm `bmbt/4f.md:38–42`. Agreed.

### Monitor power, encoding, aspect

**Byte 1 — power and source:**

| Mask | Meaning |
|---|---|
| `0x10` | Power ON (clear = OFF). |
| bits 1–0 | Source (see table above). |

**Byte 2 — encoding and aspect (optional):**

| Mask | Meaning |
|---|---|
| `0x01` | NTSC |
| `0x02` | PAL |
| `0x10` | 16:9 |
| `0x30` | Zoom |
| (none) | 4:3 |

> *Source:* Wilhelm `bmbt/4f.md:46–65`.

BlueBus exposes the GT-side monitor-control constants at `ibus.h:258–259` (`IBUS_GT_MONITOR_OFF 0x00`, `IBUS_GT_MONITOR_AT_KL_R 0x10`).

### Volume (`0x32`)

| Mask | Meaning |
|---|---|
| bit 0 | Direction (0 = down, 1 = up). |
| upper nibble | Step count (`0x1`–`0xF`). |

Unlike the MFL — which only emits 1-step volume bytes — the BMBT rotary dial sends multi-step bytes proportional to rotation speed.

> *Source:* Wilhelm `bmbt/32.md:1–67`.

---

## Per-message detail

### `0x48` — Hard buttons

**Direction:** BMBT → GT `0x3B`, RAD `0x68`, or `0xFF`.

The destination depends on the button:
- Radio-related buttons (presets, AM/FM, tone, tape) → RAD.
- Nav-related buttons (confirm, menu) → GT.
- Some global buttons → broadcast.

**Example frames:**

```
F0 04 3B 48 05 82     # confirm (nav-dial press), to GT
F0 04 68 48 11 C5     # preset 1 press, to RAD
F0 04 68 48 51 85     # preset 1 hold (button 0x11 | state 0x40)
F0 04 68 48 91 45     # preset 1 release (button 0x11 | state 0x80)
```

### `0x47` — Soft buttons (widescreen only)

**Direction:** BMBT → `0xBF` (broadcast).

**Example frames:**

```
F0 05 FF 47 00 38 75     # Info press
F0 05 FF 47 00 B8 F5     # Info release
```

> *Source:* Wilhelm `bmbt/47.md:16–60`.

### `0x49` — Navigation dial

**Direction:** BMBT → GT `0x3B`.

**Byte format:** bit 7 = direction (0 left, 1 right); bits 3–0 = step count (`0x01`–`0x0F`).

**Example frames:**

```
F0 04 3B 49 01 87     # one click left
F0 04 3B 49 81 07     # one click right
F0 04 3B 49 05 83     # five clicks left (rapid spin)
```

> *Source:* Wilhelm `bmbt/49.md:1–26`.

### `0x4A` — Tape / LED control (DST)

**Direction:** RAD `0x68` → BMBT `0xF0`.

Single control byte (no bitfield); the byte itself is the action:

| Value | Action |
|---|---|
| `0x00` | LED off |
| `0xFF` | LED on |
| `0x40` | Tape eject |
| `0x41` | Execute (after side-select) |
| `0x42` | Fast rewind |
| `0x43` | Fast forward |
| `0x44` | Forward |
| `0x45` | Rewind |
| `0x4A` | Stop |
| `0x4B` | Play |
| `0x5A` | Side 1 |
| `0x5B` | Side 2 |
| `0x5D` | Dolby B |
| `0x5E` | Dolby C |

> *Source:* Wilhelm `bmbt/4a.md:1–133`.

### `0x4F` — Monitor control

**Direction:** GT `0x3B` or VID `0xED` → BMBT `0xF0`; BMBT can also reply to GT with the same `0x4F` echoing state.

**Example frames:**

```
3B 04 F0 4F 10 90        # GT turning monitor on at KL-R, NAV GT source
ED 05 F0 4F 11 12 54     # VM telling BMBT to switch to TV input, 16:9, NTSC
```

> *Source:* Wilhelm `bmbt/4f.md:15–65`.

The byte 2 (encoding / aspect) is optional — some commands omit it and the BMBT keeps the previous encoding.

### `0x06` — Service-mode reply

**Direction:** BMBT → GT `0x3B`. Diagnostic identity payload (part number, HW level, CI, DI, BI, MFG date, supplier, SW level).

**Example frame:**

```
F0 13 3B 06 86 91 33 87 43 00 31 10 22 01 17 42 00 00 00 00 69
# part 8691-3387, HW level 0x43, CI 0x00, DI 0x31, BI 0x10, MFG 22/01,
# supplier 0x17, SW 0x42
```

There is also a brightness-only variant (BCD-encoded):

```
F0 04 3B 06 FF 36        # minimum brightness
F0 04 3B 06 7F B6        # maximum brightness
```

> *Source:* Wilhelm `bmbt/06.md:1–185`.

### `0x32` — Volume

**Direction:** BMBT → RAD `0x68` *or* TEL `0xC8`.

```
F0 04 68 32 10 BE        # one step down to radio
F0 04 C8 32 11 1F        # one step up to telephone
F0 04 68 32 50 FE        # five steps down to radio (fast turn)
```

> *Source:* Wilhelm `bmbt/32.md:1–67`.

---

## Cross-cutting subsystems

- *subsystems/radio-gt-arbitration (planned)* — BMBT button events and dial rotation feed into the GT's UI state machine; the GT then arbitrates with the radio (`0x46` / `0x45`).
- *subsystems/obc-display (planned)* — the Menu button and the confirm (dial press) drive the OBC menu shown on the GT.
- *subsystems/ignition-state (planned)* — BMBT power-on driven by `0x4F` from GT at KL-R; BlueBus also turns the monitor off again above 5 km/h (see [`ike.md`](ike.md)).

---

## Open questions / TBC

- **Menu-release injection.** BlueBus's `bmbt.c` UI module injects a synthetic `0xB4` (Menu release) via a timer because the GT does not reliably emit menu-select release events on its own (referenced in BlueBus commit `1294a91`). This is a runtime workaround — not a protocol detail — but software emulating a BMBT should be aware.
- **16×9 CD / MD distinguishability post-announce.** No protocol-level probe re-queries the variant once announced. GT firmware must remember the variant byte.
- **Hold-event firing rule.** Wilhelm documents press / hold / release as three discrete events on the upper-bit field; whether hold is fired only after a threshold time, or repeatedly while held, is not stated.
- **`0x06` request grammar.** Wilhelm notes the request (`0x05`) is "stateful" — its content varies — and replies are inferred from request. No formal request schema is documented.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:43` — address.
- `firmware/application/lib/ibus.h:107–110` — video-source constants.
- `firmware/application/lib/ibus.h:121–143` — BMBT button constants (press / hold / release combinations).
- `firmware/application/lib/ibus.h:169` — `IBUS_CMD_VOLUME_SET 0x32`.
- `firmware/application/lib/ibus.h:258–259` — GT-side monitor-control constants.
- `firmware/application/handler/handler_ibus.c:415–438` — `HandlerIBusBMBTButtonPress` (monitor-on-on-button workaround).
- `firmware/application/ui/bmbt.c` — large UI module that emulates BMBT interaction; calls `IBusCommandGTBMBTControl` etc.

### Wilhelm-docs
- `bmbt/06.md` — service-mode reply.
- `bmbt/32.md` — volume control.
- `bmbt/47.md` — soft buttons (widescreen).
- `bmbt/48.md` — hard buttons.
- `bmbt/49.md` — navigation dial.
- `bmbt/4a.md` — tape / LED control (DST).
- `bmbt/4f.md` — monitor control.
- `02.md:42–45, 108–114` — variant announce table.
- `README.md:170` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:59` — address.
- `packages/commands/src/devices/bmbt/` — present but minimal coverage at the time of survey.
