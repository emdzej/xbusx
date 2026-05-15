# TEL (0xC8) — Telephone

**Status:** Draft.

**Role:** The in-vehicle cellular module. Handles voice calls (incoming, outgoing, hands-free), SMS, emergency / SOS calls, signal-strength reporting, and the entire **telephone UI** — 16+ distinct display modes rendered on the GT, MID, and (for status indicators) the IKE. After the BMW Assist generation, certain TEL functionality is co-resident with the **TCU** at `0xCA`; see [`tcu.md`](tcu.md) for that.

**Buses:** K/I.

**Chassis coverage:** Optional across most chassis. Where present, the TEL is the host of the telephone UI; the MID or GT (or both) handle rendering.

**Variants:** Three known announce variants — see below.

---

## Address

`0xC8`. *Sources:* BlueBus `ibus.h:37`, Wilhelm `README.md:161`, bimmerz `devices.ts:51` — agreed.

---

## Variants

The variant byte sits in bits 3–7 of the announce signature (`VARIANT = 0b1111_1000`):

| Variant | Signature | Wilhelm name | Announce frame |
|---|---|---|---|
| CMT3000 | `0x00` | `TEL_CMT` | `C8 04 FF 02 01 30` |
| Motorola V-Series | `0x30` | `TEL_MOTO_V` | `C8 04 FF 02 31 00` |
| Everest / Bluetooth | `0x38` | `TEL_TCU` | `C8 04 BF 02 38 49` |

> *Source:* Wilhelm `02.md:38–40, 100–105`; BlueBus `ibus.h:410` (`IBUS_TEL_SIG_EVEREST 0x38`).

The TEL and the TCU at `0xCA` are **separate addresses** even when both are physically present. On chassis with BMW Assist installed, the TCU appends location / vehicle data to emergency SMS, while the TEL handles the basic call session. The protocol boundary between them is not fully documented in the surveyed sources.

---

## Announce / Pong

```
C8 04 FF 02 31 00      # Motorola V-Series announce (broadcast LOC)
C8 04 BF 02 38 49      # Everest / Bluetooth announce (broadcast GLO)
```

Pong reply to a ping has the announce-bit clear:

```
50 03 C8 01 9A         # MFL pings TEL
C8 04 50 02 30 AE      # TEL pongs back to MFL  (variant 0x30, announce bit 0)
```

> *Sources:* Wilhelm `02.md:59–71, 100–105`.

---

## Messages where TEL is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x02` | Announce / Pong | broadcast / source-specific | Variant identification. | W `02.md` |
| `0x21` | Menu text | GT `0x3B`, MID `0xC0` | Layout + function-type + options + string. Drives dial / directory / TOP-8 / SMS list / BT pairing menus. | W `telephone/21.md` · BB `ibus.h:421` (`IBUS_TEL_CMD_MENU_TEXT`) |
| `0x23` | Title text | GT `0x3B`, MID `0xC0`, IKE `0x80`, displays `0xE7` | Layout-type + options + string. Drives PIN / DIR / DIAL / TOP-8 / SOS / on-call titles. | W `telephone/23.md` · BB `ibus.h:424` (`IBUS_TEL_CMD_TITLE_TEXT`) |
| `0x24` | Property text | GT `0x3B`, MID `0xC0` | Numeric field update: signal-strength bars, call cost (current / total), call time (min / sec). | W `telephone/24.md` · BB `ibus.h:422` (`IBUS_TEL_CMD_PROPERTY_TEXT`) |
| `0x2B` | LED status | displays `0xE7` | 1-byte bitfield: red / yellow / green, on / blink. | W `telephone/2b.md` · BB `ibus.h:405, 455–461` |
| `0x2C` | Telephone status | displays `0xE7` | 1-byte bitfield: handsfree / establishing call / power / on-call. | W `telephone/2c.md` · BB `ibus.h:406, 486–489` |
| `0xA5` | Body text | GT `0x3B`, MID `0xC0` | Extended body text with cursor offset. Used for SMS / SOS multi-part messages that exceed a frame's capacity. | W `telephone/a5.md` · BB `ibus.h:420` (`IBUS_TEL_CMD_BODY_TEXT`) |
| `0xA6` | SMS icon | displays `0xE7` | 1-byte toggle: `0x00` = hide, `0x01` = show unread-SMS icon. | W `telephone/a6.md` · BB `ibus.h:423` (`IBUS_TEL_CMD_SMS_ICON`) |

---

## Messages where TEL is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x01` | Ping | any | Liveness probe. TEL replies with `0x02`. | W `02.md:59–71` |
| `0x20` | Mode (button) | GT `0x3B` | Open Telephone / Top-8 display mode. Differentiates main menu vs. submenu via session state. | W `telephone/20.md` |
| `0x2D` | Direct dial | GT `0x3B` | Dial a specific number directly, without going through the dial UI. Restricted to Motorola HW 06+ / BIT HW 02+ phones. | W `telephone/2d.md` |
| `0x31` | Menu button | GT `0x3B`, MID `0xC0` | Layout-type + function-type + action byte. Drives the contact / digit / SOS / navigation / info button presses across all 16 display modes. | W `telephone/dial.md`, `directory.md`, etc. |
| `0x32` | Volume | MFL `0x50`, BMBT `0xF0` | Direction + step. Routes to TEL when status has `HANDSFREE + ACTIVE` set. | W `bmbt/32.md`, `mfl/32.md` · BB `ibus.h:169` |
| `0x3B` | MFL buttons | MFL `0x50` | TEL-routed MFL button events (after the MFL R/T toggle is on TEL). | W `mfl/3b.md` |

---

## Bit fields and enums

### `0x2B` — LED status (1 byte)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_LED_OFF` | `0x00` | All off. |
| `IBUS_TEL_LED_RED_ON` | `0x01` | Red on. |
| `IBUS_TEL_LED_RED_BLINK` | `0x03` | Red blinking. |
| `IBUS_TEL_LED_YELLOW_ON` | `0x04` | Yellow on. |
| `IBUS_TEL_LED_YELLOW_BLINK` | `0x0C` | Yellow blinking. |
| `IBUS_TEL_LED_GREEN_ON` | `0x10` | Green on. |
| `IBUS_TEL_LED_GREEN_BLINK` | `0x30` | Green blinking. |

> *Source:* BlueBus `ibus.h:455–461`.

### `0x2C` — Status (1 byte)

| Mask / Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_STATUS_HANDSFREE` | `0x01` | Audio routed to speakers (not handset). |
| `IBUS_TEL_STATUS_ESTABLISHING_CALL` | `0x04` | Incoming or outgoing call ringing. |
| `IBUS_TEL_STATUS_POWER` | `0x10` | TEL powered on. |
| `IBUS_TEL_STATUS_ON_CALL` | `0x20` | Active call. |

Composite enums used by BlueBus:

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_STATUS_NONE` | `0x00` | Power off. |
| `IBUS_TEL_STATUS_ACTIVE_POWER_HANDSFREE` | `0x10` | Powered, idle. |
| `IBUS_TEL_STATUS_ACTIVE_POWER_CALL_HANDSFREE` | `0x35` | Powered + establishing + handsfree + on-call. |

> *Source:* BlueBus `ibus.h:407–410, 486–489`.

### Special characters

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_CHAR_FIELD_DELIMITER` | `0x06` | Line feed / next menu field. |
| `IBUS_TEL_CHAR_FLASH_PREFIX` | `0x01` | Prefix marker for flashing text (default layout). |
| `IBUS_TEL_CHAR_HANDSFREE_ICON` | `0xC6` | Speaker icon. |
| `IBUS_TEL_CHAR_ON_CALL_LEFT` | `0xC7` | Left call indicator. |
| `IBUS_TEL_CHAR_ON_CALL_RIGHT` | `0xC8` | Right call indicator. |

> *Source:* BlueBus `ibus.h:412–417`.

### Layout types (`0x21`, `0xA5`)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_LAYOUT_DIAL` | `0x42` | Dial pad. |
| `IBUS_TEL_LAYOUT_DIRECTORY` | `0x43` | Contact directory. |
| `IBUS_TEL_LAYOUT_TOP_8` | `0x80` | Top-8 favourites. |
| `IBUS_TEL_LAYOUT_LIST` | `0xF0` | SMS index / Bluetooth pairing list. |
| `IBUS_TEL_LAYOUT_DETAIL` | `0xF1` | SMS message / SOS detail. |

> *Source:* BlueBus `ibus.h:447–452`.

### Detail-layout indices (used inside `0xF1` body / button writes)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_DETAIL_LINE_0` … `LINE_5` | `0x40` – `0x45` | Text lines 0–5. |
| `IBUS_TEL_DETAIL_GREYED_LINE` | `0x60` | Disabled / greyed line. |
| `IBUS_TEL_DETAIL_BTN_BACK` | `0x50` | Back button. |
| `IBUS_TEL_DETAIL_BTN_LEFT` | `0x51` | Left button. |
| `IBUS_TEL_DETAIL_BTN_RIGHT` | `0x52` | Right button. |
| `IBUS_TEL_DETAIL_BTN_CENTER` | `0x53` | Centre button. |

> *Source:* BlueBus `ibus.h:426–437`.

### Function types (`0x31` input)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_FUNC_NULL` | `0x00` | Null. |
| `IBUS_TEL_FUNC_CONTACT` | `0x01` | Contact selection. |
| `IBUS_TEL_FUNC_DIGIT` | `0x02` | Digit entry. |
| `IBUS_TEL_FUNC_SOS` | `0x05` | Emergency. |
| `IBUS_TEL_FUNC_NAVIGATION` | `0x07` | Menu navigation (e.g., pagination). |
| `IBUS_TEL_FUNC_INFO` | `0x08` | Info screen. |

> *Source:* BlueBus `ibus.h:439–445`.

### Title-layout types (`0x23`)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_TITLE_DEFAULT` | `0x00` | Default. |
| `IBUS_TEL_TITLE_ON_CALL` | `0x01` | On call. |
| `IBUS_TEL_TITLE_ON_CALL_HFS` | `0x02` | On call, hands-free. |
| `IBUS_TEL_TITLE_PIN_DIGITS` | `0x05` | PIN-entry digit echo. |
| `IBUS_TEL_TITLE_DIR_NAME` | `0x52` | Directory: name. |
| `IBUS_TEL_TITLE_DIR_NUMBER` | `0x53` | Directory: number. |
| `IBUS_TEL_TITLE_DIAL_CLEAR` | `0x61` | Dial clear. |
| `IBUS_TEL_TITLE_DIAL_NUMBER` | `0x63` | Dial number-being-entered. |
| `IBUS_TEL_TITLE_TOP_8_CLEAR` | `0x80` | Top-8 clear. |
| `IBUS_TEL_TITLE_TOP_8_NAME` | `0x81` | Top-8 name. |
| `IBUS_TEL_TITLE_TOP_8_NUMBER` | `0x82` | Top-8 number. |
| `IBUS_TEL_TITLE_SOS` | `0xC0` | SOS. |

Title options (byte after layout):

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_TITLE_OPT_UPDATE` | `0x20` | Update existing title. |
| `IBUS_TEL_TITLE_OPT_SET` | `0x30` | Set / replace. |

> *Source:* BlueBus `ibus.h:491–507`.

### Property-layout types (`0x24`)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_PROP_SIGNAL_STRENGTH` | `0x91` | Signal-bar region. |
| `IBUS_TEL_PROP_CALL_COST_CURRENT` | `0x93` | Current-call cost. |
| `IBUS_TEL_PROP_CALL_COST_TOTAL` | `0x94` | Total cost. |
| `IBUS_TEL_PROP_CALL_TIME_MINUTES` | `0x96` | Call time, minutes. |
| `IBUS_TEL_PROP_CALL_TIME_SECONDS` | `0x97` | Call time, seconds. |

> *Source:* BlueBus `ibus.h:469–474`.

### Signal-strength bar characters

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_SIGNAL_BAR_0` | `0xB2` | 0 bars / empty. |
| `IBUS_TEL_SIGNAL_BAR_1` … `BAR_5` | `0xB3` – `0xB7` | 1 – 5 bars. |
| `IBUS_TEL_SIGNAL_BAR_FULL` | `0xB8` | All bars. |

> *Source:* BlueBus `ibus.h:476–483`.

### Options bitfield (`0x21`, `0xA5`)

| Mask / Constant | Value | Meaning |
|---|---|---|
| `IBUS_TEL_OPT_INDEX_MASK` | `0x1F` | Field index, 0–31. |
| `IBUS_TEL_OPT_CLEAR` | `0x20` | Clear layout before writing. |
| `IBUS_TEL_OPT_BUFFER` | `0x40` | Buffer the write; don't render until flush. |
| `IBUS_TEL_OPT_HIGHLIGHT` | `0x80` | Highlight this field. |

> *Source:* BlueBus `ibus.h:463–467`.

---

## Per-message detail

### `0x2B` — LED status

**Direction:** TEL → displays multicast `0xE7`.

```
C8 04 E7 2B <led_byte> <xor>
```

```
C8 04 E7 2B 00 00      # all off
C8 04 E7 2B 10 10      # green on
C8 04 E7 2B 30 30      # green blink
C8 04 E7 2B 01 01      # red on
C8 04 E7 2B 03 03      # red blink
```

> *Source:* Wilhelm `telephone/2b.md:14–55`.

### `0x2C` — Status

**Direction:** TEL → displays multicast `0xE7`.

```
C8 04 E7 2C <status_byte> <xor>
```

```
C8 04 E7 2C 00 07      # power off
C8 04 E7 2C 10 17      # power on, idle
C8 04 E7 2C 35 ...     # power + establishing + handsfree + on-call
```

> *Source:* Wilhelm `telephone/2c.md`.

### `0x21` — Menu text

**Direction:** TEL → GT `0x3B` or MID `0xC0`.

```
C8 <len> <dst> 21 <layout> <func> <options> <string...> <xor>
```

**Example:**

```
C8 06 3B 21 42 02 20 B4
# DIAL layout (0x42), DIGIT function (0x02), options 0x20 = CLEAR
```

> *Source:* Wilhelm `telephone/21.md:18–24`.

### `0x23` — Title text

**Direction:** TEL → GT `0x3B`, MID `0xC0`, IKE `0x80`, or displays `0xE7`.

```
C8 <len> <dst> 23 <layout> <options> <string...> <xor>
```

Examples:

```
C8 11 3B 23 00 20 49 4E 53 45 52 54 20 43 41 52 44 21 E3
# DEFAULT title (0x00) + UPDATE (0x20) + "INSERT CARD!"

C8 05 3B 23 80 20 75
# TOP_8_CLEAR (0x80) + UPDATE

C8 07 E7 23 01 00 C7 C8 05
# ON_CALL title to displays: 0xC7 + 0xC8 = call-active glyphs
```

> *Source:* Wilhelm `telephone/23.md`.

### `0x24` — Property text

**Direction:** TEL → GT `0x3B` or MID `0xC0`.

```
C8 <len> <dst> 24 <layout> 00 <string...> <xor>
```

```
C8 0C 3B 24 91 00 B8 B8 B8 B8 B8 B8 B8 F2
# SIGNAL_STRENGTH (0x91) + 7 full bars (0xB8)
```

> *Source:* Wilhelm `telephone/24.md:16–20`.

### `0xA5` — Body text (with cursor offset)

**Direction:** TEL → GT `0x3B`.

```
C8 <len> 3B A5 <layout> <offset> <options> <string...> <xor>
```

Used for SMS and SOS detail screens whose content exceeds a single frame's capacity. The offset field is a 5-bit cursor position into the detail layout.

> *Source:* Wilhelm `telephone/a5.md`.

### `0xA6` — SMS icon

**Direction:** TEL → displays `0xE7`.

```
C8 05 E7 A6 00 <0x00|0x01> <xor>
```

```
C8 05 E7 A6 00 01 8D      # show unread-SMS icon
C8 05 E7 A6 00 00 8D      # hide
```

> *Source:* Wilhelm `telephone/a6.md`.

### `0x2D` — Direct dial (DST)

**Direction:** GT `0x3B` → TEL `0xC8`.

```
3B <len> C8 2D 00 <digits...> <xor>
```

**Example:**

```
3B 13 C8 2D 00 11 2B 34 39 38 39 31 32 35 30 31 36 30 30 30 CA
# leading 0x11, then "+498912501600 0"
```

> *Source:* Wilhelm `telephone/2d.md`.

### `0x31` — Menu button (DST)

**Direction:** GT `0x3B` or MID `0xC0` → TEL `0xC8`.

```
<src> 06 C8 31 <layout> <func> <action> <xor>
```

**Example (digit press from dial pad):**

```
3B 06 C8 31 42 02 07
# DIAL layout (0x42), DIGIT function (0x02), digit '7' (0x07)
```

> *Source:* Wilhelm `telephone/dial.md:24–51`.

---

## Display modes (catalogue)

TEL drives 16+ distinct UI screens through layered combinations of `0x21` / `0x23` / `0x24` / `0xA5`. Brief catalogue with Wilhelm-page anchors:

| # | Mode | Layout | Notes |
|---|---|---|---|
| 1 | Default | — | Fallback / error screen. Flashing text via `0x01` prefix. (`telephone/default.md`) |
| 2 | Dial | `0x42` | Phone-number entry. Digits, `*`, `#`, backspace. (`telephone/dial.md`) |
| 3 | Directory | `0x43` | Contact list with field delimiters and pagination. (`telephone/directory.md`) |
| 4 | Last Numbers | — | Recent-call history. (`telephone/last_numbers.md`) |
| 5 | Top 8 | `0x80` | Favourite contacts. (`telephone/top_8.md`) |
| 6 | Info | — | Signal / cost / time properties; uses `0x24`. (`telephone/info.md`) |
| 7 | PIN | title `0x05` | SIM PIN entry. (`telephone/pin.md`) |
| 8 | SMS List | `0xF0` | SMS index. (`telephone/list.md`) |
| 9 | SMS Detail | `0xF1` | SMS message body via `0xA5`. (`telephone/detail.md`, `telephone/sms.md`) |
| 10 | SOS / Emergency | `0xF1` + title `0xC0` | Emergency call. (`telephone/detail.md`) |
| 11 | Bluetooth pairing | `0xF0` | BT-device pairing UI. (`telephone/list.md`) |
| 12–16 | IKE quick contacts | title `0x40`–`0x43` | Cluster-rendered call shortcuts. (`telephone/23.md:53–58`) |
| Plus: | On-call (foreground), Establishing-call, Voice-recognition feedback, Idle | — | Status overlays driven by `0x2C`. |

The full state-machine and per-screen choreography lives in *subsystems/telephone-ui (planned)*.

---

## Cross-cutting subsystems

- *subsystems/telephone-ui (planned)* — **primary host.** The full state machine for incoming / outgoing / SMS / SOS / pairing, with the per-mode write sequences.
- **Volume routing** — TEL receives `0x32` from MFL and BMBT when its status carries the HANDSFREE + ACTIVE bits.
- **Telematics** — NAV `0x7F` sends `0xA2` (coordinates) and `0xA4` (location) to TEL (and / or TCU). On BMW-Assist-equipped chassis, TEL augments emergency SMS with this data.
- **MFL voice button** — drives TEL via the `0x3B` button-press path (R/T-toggled).

---

## Open questions / TBC

- **TEL ↔ TCU coordination.** Both addresses are present on BMW-Assist-equipped chassis. The exact protocol that splits responsibility (TEL handles voice, TCU handles location-attached emergency SMS?) is undocumented.
- **`0x2D` Direct Dial compatibility.** Restricted to Motorola HW 06+ and BIT HW 02+. Whether the Everest variant supports it is unclear.
- **MID vs GT divergence.** MID treats the directory-index field differently (3 MSBs reserved for clear / buffer flags). Wilhelm `telephone/2c.md:37–45` flags this.
- **Property layouts `0x92`, `0x95`.** MID-only call-cost / call-time variants — mentioned in Wilhelm but not fully documented (Wilhelm `telephone/24.md:36, 40`).
- **MK3 v40+ / MK4 dial-screen redesign.** Replaces Top-8 as home screen — TEL emulation must maintain session state to return the correct default layout on `0x20`. Wilhelm `telephone/20.md:12–26`.
- **Last-Numbers close behaviour.** No `0x31` close event observed — last-written number persists. Marked TBC in Wilhelm.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:37` — address.
- `firmware/application/lib/ibus.h:405–507` — the largest per-device constant block in the file: command codes, LED bitfield, status bitfield, signature bytes, special characters, layout / detail / function / title / property types, signal-bar characters, options bitfield.
- `firmware/application/lib/ibus.h:591` — `IBUS_TCU_SINGLE_LINE_UI_MAX_LEN 11`.
- `firmware/application/handler/handler_ibus.c` — `HandlerIBusTEL*`, `HandlerSetIBusTELStatus`, MFL volume routing.

### Wilhelm-docs
- `telephone/20.md, 21.md, 23.md, 24.md, 2b.md, 2c.md, 2d.md, a5.md, a6.md` — primary command pages.
- `telephone/default.md, pin.md, dial.md, directory.md, last_numbers.md, top_8.md, info.md, list.md, detail.md, sms.md` — per-display-mode pages.
- `02.md:38–40, 100–105` — variant announce table.
- `README.md:161` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:51` — address.
- Coverage of TEL is minimal in bimmerz at the time of survey.
