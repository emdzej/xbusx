# MID (0xC0) — Multi-Information Display

**Status:** Draft.

**Role:** A small text display + button panel that lives in the radio fascia on chassis **without** a navigation screen. The MID renders radio metadata, OBC text, and telephone UI; its rows of buttons drive radio menus and telephone interactions. On chassis equipped with a GT (E38, E39, E53 High with navigation), the GT takes over most display duties — the MID still exists in some configurations but plays a smaller role.

**Buses:** K/I.

**Chassis coverage:** E38, E39, E53 — non-navigation variants principally. Wilhelm `README.md:160` lists those three chassis explicitly.

**Variants:** None at the protocol layer; the `0x02` announce carries no variant signature. Note that the **E31** has a separate, related display at `0xCD` (see [`mid-e31`](mid-e31.md) *(planned)*) and the **rear-cabin** display sits at `0xA0` (FID).

---

## Address

`0xC0`. *Sources:* BlueBus uses `IBUS_DEVICE_MID 0xC0` (`ibus.h:36`), Wilhelm `README.md:160`, bimmerz `devices.ts:50` — agreed.

The address space has two other "MID-like" entries:

| Address | Device | Chassis | Note |
|---|---|---|---|
| `0xA0` | FID | E38, E39 | Rear-cabin multi-info display. |
| `0xC0` | MID | E38, E39, E53 | Main one. |
| `0xCD` | MID | E31 | Early variant. |

> *Source:* Wilhelm `README.md:152, 160, 162`.

---

## Announce / Pong

Wilhelm `02.md` does not list a dedicated announce frame for `0xC0`. The MID is presumed to send the plain `0x02 0x01` announce on power-up like other modules, but the frame is not captured in the surveyed sources.

> *TBC:* Frame format for the MID announce — capture from real traffic on an E39 SE.

---

## Messages where MID is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x31` | Button press | RAD `0x68` *or* TEL `0xC8` | Soft-button press / release event. Destination depends on which application owns the MID display at the time. | BB `ibus.h:395` (`IBUS_MID_BUTTON_PRESS`) |

The MID is otherwise a passive display — almost all of its on-the-wire activity is *receiving* writes from peers.

---

## Messages where MID is `DST`

The MID is the most heavily-written-to display in the address space (on non-nav chassis). Writers include the radio, telephone, IKE, and (occasionally) the navigation computer.

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x20` | Mode (button) | TEL `0xC8` | Telephone requests an MID UI mode change (dial / menu / idle). | W `telephone/20.md` · BB `ibus.h:391` (`IBUS_MID_CMD_MODE`) |
| `0x21` | Menu text | RAD `0x68`, TEL `0xC8` | Write / update menu lines. 4-char per slot; field delimiter `0x06`. | W `telephone/21.md` · BB `ibus.h:236` (`IBUS_CMD_RAD_WRITE_MID_MENU`), `ibus.h:421` (`IBUS_TEL_CMD_MENU_TEXT`) |
| `0x23` | Title text | RAD `0x68`, TEL `0xC8`, IKE `0x80` | Write / update title line (≤ 11 chars). | W `telephone/23.md` · BB `ibus.h:235` (`IBUS_CMD_RAD_WRITE_MID_DISPLAY`), `ibus.h:424` (`IBUS_TEL_CMD_TITLE_TEXT`) |
| `0x24` | Property text | TEL `0xC8`, IKE `0x80` | Update dynamic property fields — signal strength, call time / cost, OBC metrics. | W `telephone/24.md` · BB `ibus.h:422` |
| `0x27` | Set mode | TEL `0xC8` | Telephone forces MID into a specific mode (`0x00` = idle, `0x02` = active). | BB `ibus.h:392` (`IBUS_MID_CMD_SET_MODE`) |
| `0xA5` | Body text | TEL `0xC8` | Extended body text with cursor offset (SMS, telematics, MP3 metadata). | W `telephone/a5.md` · BB `ibus.h:420` (`IBUS_TEL_CMD_BODY_TEXT`) |

---

## Bit fields and enums

### Display geometry

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_MID_MAX_CHARS` | 24 | Main display text width (characters). |
| `IBUS_MID_TITLE_MAX_CHARS` | 11 | Title line width. |
| `IBUS_MID_MENU_MAX_CHARS` | 4 | Menu-button field width. |

> *Source:* BlueBus `ibus.h:388–390`.

### Special characters

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_MID_SYMBOL_NEXT` | `0xC9` | "Next" / forward navigation glyph. |
| `IBUS_MID_SYMBOL_BACK` | `0xCA` | "Back" glyph. |

> *Source:* BlueBus `ibus.h:385–386`. See *[charset (planned)](../charset.md)* for the full character map.

### UI mode codes (`0x27` byte)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_MID_UI_TEL_OPEN` | `0x8E` | Telephone display active. |
| `IBUS_MID_UI_TEL_CLOSE` | `0x8F` | Telephone display closed / idle. |
| `IBUS_MID_UI_RADIO_OPEN` | `0xB0` | Radio display active. |

> *Source:* BlueBus `ibus.h:399–401`.

### Mode-request-type byte (`0x20`)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_MID_MODE_REQUEST_TYPE_PHYSICAL` | `0x02` | Origin: physical button press. |
| `IBUS_MID_MODE_REQUEST_TYPE_SELF` | `0x00` | Origin: internal / autonomous. |

> *Source:* BlueBus `ibus.h:393–394`.

### Button-release codes (`0x31`)

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_MID_BTN_TEL_LEFT_RELEASE` | `0x4C` | Left telephone button release. |
| `IBUS_MID_BTN_TEL_RIGHT_RELEASE` | `0x4D` | Right telephone button release. |

> *Source:* BlueBus `ibus.h:396–397`.

---

## Per-message detail

### `0x31` — Button press

**Direction:** MID → RAD `0x68` *or* MID → TEL `0xC8`.

The destination follows the **mode** the MID is currently in — if the MID is in TEL mode (per the last `0x27`), button events route to TEL; if in radio mode, to RAD.

> *Source:* BlueBus `ui/mid.c:526, 605` — `IBusCommandMIDButtonPress(ibus, IBUS_DEVICE_RAD, …)` and `IBusCommandMIDButtonPress(ibus, IBUS_DEVICE_TEL, …)` callsites.

### `0x21` — Menu text (DST)

**Direction:** RAD `0x68` *or* TEL `0xC8` → MID `0xC0`.

**Frame layout:**

```
<src> <len> C0 21 <layout> <function> <options> <string...> <xor>
```

The menu line is divided into slots of 4 characters each, separated by `IBUS_TEL_CHAR_FIELD_DELIMITER 0x06` (BB `ibus.h:413`).

**Example frame:**

```
C8 19 C0 21 40 00 60 06 20 20 44 49 41 4C 20 20 06 20 20 44 49 52 2E 20 20 00 61
```

Decoded: TEL writes two menu slots: `"DIAL"` and `"DIR. "`.

> *Source:* Wilhelm `telephone/21.md:3–4`.

### `0x23` — Title text (DST)

**Direction:** RAD `0x68`, TEL `0xC8`, or IKE `0x80` → MID `0xC0`.

```
<src> <len> C0 23 <layout> <options> <string...> <xor>
```

Title layout-byte values are documented in Wilhelm `telephone/23.md:102` and BlueBus `ibus.h:492–503`:

| Layout | Constant | Meaning |
|---|---|---|
| `0x00` | `IBUS_TEL_TITLE_DEFAULT` | Default telephone title. |
| `0x01` | `IBUS_TEL_TITLE_ON_CALL` | "On call" title. |
| `0x02` | `IBUS_TEL_TITLE_ON_CALL_HFS` | "On call, hands-free" title. |
| `0x05` | `IBUS_TEL_TITLE_PIN_DIGITS` | PIN-entry digit echo. |
| `0x52` | `IBUS_TEL_TITLE_DIR_NAME` | Directory: contact name. |
| `0x53` | `IBUS_TEL_TITLE_DIR_NUMBER` | Directory: contact number. |
| `0x61` | `IBUS_TEL_TITLE_DIAL_CLEAR` | Dial title — clear. |
| `0x63` | `IBUS_TEL_TITLE_DIAL_NUMBER` | Dial title — number being entered. |
| `0x80–0x82` | `IBUS_TEL_TITLE_TOP_8_*` | Top-8 favourites layout variants. |
| `0xC0` | `IBUS_TEL_TITLE_SOS` | SOS / emergency. |

### `0x24` — Property text (DST)

**Direction:** TEL `0xC8` *or* IKE `0x80` → MID `0xC0`.

Used to update *small slots* (e.g., signal-strength bars, call timer) without redrawing the whole title.

Telephone property layout values from BlueBus `ibus.h:470–474`:

| Layout | Constant | Meaning |
|---|---|---|
| `0x91` | `IBUS_TEL_PROP_SIGNAL_STRENGTH` | Signal-strength bars region. |
| `0x93` | `IBUS_TEL_PROP_CALL_COST_CURRENT` | Current call cost. |
| `0x94` | `IBUS_TEL_PROP_CALL_COST_TOTAL` | Total call cost. |
| `0x96` | `IBUS_TEL_PROP_CALL_TIME_MINUTES` | Call time in minutes. |
| `0x97` | `IBUS_TEL_PROP_CALL_TIME_SECONDS` | Call time in seconds. |

**Example frame** (signal strength):

```
C8 0C C0 24 91 00 B8 B8 B8 B8 B8 B8 B8 F2
```

Bars are filled glyphs (`IBUS_TEL_SIGNAL_BAR_FULL 0xB8`).

> *Source:* Wilhelm `telephone/24.md:17–20`; BlueBus `ibus.h:477–483` (signal-bar characters).

The IKE also sends `0x24` to the *multicast* display address `0xE7` rather than directly to MID `0xC0` — see [`ike.md`](ike.md#0x24--obc-text-multicast). MIDs subscribed to the `0xE7` group receive those frames as part of the OBC text stream.

### `0x27` — Set mode (DST)

**Direction:** TEL `0xC8` → MID `0xC0`.

```
C8 <len> C0 27 <device> <mode>
```

BlueBus emits `0x27` from `ui/mid.c:363, 372, 378` with `device = IBUS_DEVICE_TEL` and `mode` ∈ {`0x00` idle, `0x02` active}.

### `0xA5` — Body text (DST)

**Direction:** TEL `0xC8` → MID `0xC0`.

Extended body text with cursor positioning — used for SMS rendering, top-8 contact lists, and detail views.

> *Source:* Wilhelm `telephone/a5.md`; BlueBus `ibus.h:420` (`IBUS_TEL_CMD_BODY_TEXT 0xA5`).

The full telephone-UI choreography around `0xA5` is documented in *subsystems/telephone-ui (planned)*.

---

## Cross-cutting subsystems

- *subsystems/telephone-ui (planned)* — MID is the **primary host** of the telephone UI on non-nav chassis. The TEL sends `0x20`, `0x21`, `0x23`, `0x24`, `0x27`, `0xA5` frames to render PIN, dial, directory, top-8, SMS, and call-status screens.
- *subsystems/obc-display (planned)* — IKE-driven OBC text routed via the `0xE7` displays multicast reaches the MID.
- *subsystems/radio-gt-arbitration (planned)* — on non-nav chassis the GT is absent; the MID and the radio arbitrate *directly* (no third party). The radio writes title text and menu lines via `0x23` and `0x21`; the telephone overlays by sending its own `0x21`/`0x23`/`0x27`. There is no formal priority byte at the MID layer.

---

## Open questions / TBC

- **MID announce frame.** Wilhelm `02.md` does not list `0xC0` — capture and confirm the signature byte.
- **Multicast subscription to `0xE7`.** Does the MID listen on the `0xE7` group address as well as its own `0xC0`, or does the IKE send to both separately? Not documented in any surveyed source.
- **Radio↔MID arbitration on non-nav chassis.** No formal protocol — observation suggests "last writer wins" with the telephone forcibly stealing the screen via `0x27`. Document the behaviour with a real-traffic capture in a future pass.
- **bimmerz coverage of MID.** Stubs exist; no parsers / builders. Not a useful reference for MID interactions.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:36` — address.
- `firmware/application/lib/ibus.h:235–236` — radio's MID display / menu write commands.
- `firmware/application/lib/ibus.h:385–402` — MID command constants, geometry, glyphs, UI modes, button-release codes.
- `firmware/application/lib/ibus.h:413` — `IBUS_TEL_CHAR_FIELD_DELIMITER 0x06`.
- `firmware/application/lib/ibus.h:420–424` — telephone-to-MID write commands.
- `firmware/application/lib/ibus.h:470–483, 492–507` — telephone property and title layout codes (most of which target MID).
- `firmware/application/handler/handler_ibus.c` — `HandlerIBusMID*` handlers (small set).
- `firmware/application/ui/mid.c` — UI module emulating MID interaction; ~726 lines.

### Wilhelm-docs
- `telephone/20.md, 21.md, 23.md, 24.md, a5.md` — primary MID-targeted message documentation. (Wilhelm groups MID-bound traffic under `telephone/` because telephone is its biggest user.)
- `radio/23.md` — radio's MID title-text writes.
- `02.md:113–174` — device-table entry.
- `README.md:160` — device-table row.

### bimmerz
- `packages/bus/src/devices.ts:50` — address.
- `packages/commands/src/devices/mid/` — present but minimal; stubs only.
