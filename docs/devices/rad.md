# RAD (0x68) — Radio

**Status:** Draft.

**Role:** The car radio: tuner (AM/FM/RDS), media playback (cassette / built-in CD / connected CDC), audio routing through the DSP, and management of the audio-stack display. Talks to the GT for UI arbitration on chassis with a navigation display, drives the BMBT LED and tape transport, and exchanges play / pause / track commands with the CDC at `0x18` (or with the BlueBus impersonating one).

**Buses:** K/I.

**Chassis coverage:** All chassis listed in [`../overview.md`](../overview.md). Address `0x68` is universal across BMW chassis that use the I/K-bus.

**Variants:** Six radio types — see [Variants](#variants-1).

---

## Address

`0x68`. *Sources:* BlueBus `ibus.h:26`, Wilhelm `README.md:137`, bimmerz `devices.ts:37` — agreed.

---

## Variants

BlueBus enumerates six radio types at `ibus.h:519–525`. The variant changes which command bytes are valid (notably `0x21` C43 screen-update vs `0x46` screen-mode update), the display character limit, and feature set (NG-Radio extensions, station-list buffering).

| Variant | Constant | Notes |
|---|---|---|
| C43 | `IBUS_RADIO_TYPE_C43 1` | Early "Business" radio. Single tuner. Display limit 11 chars (CD53 driver). Uses legacy `0x21` C43 screen update and `0xC0` menu-mode. |
| BM53 | `IBUS_RADIO_TYPE_BM53 2` | Business radio with NG-Radio extensions. |
| BM54 | `IBUS_RADIO_TYPE_BM54 3` | Professional NG-Radio. Dual tuner. Supports `0xD4` buffered station list. Supports splitscreen on the updated UI (4-1/40+). |
| BRCD | `IBUS_RADIO_TYPE_BRCD 4` | Regional cassette/CD hybrid. Legacy `0x21` commands. |
| BRTP | `IBUS_RADIO_TYPE_BRTP 5` | Regional tuner. Legacy protocol. |
| BM24 | `IBUS_RADIO_TYPE_BM24 6` | Professional legacy. Shares `0x21` list infrastructure with BM23. Does *not* support splitscreen. |

> *Source:* BlueBus `ibus.h:519–525`. Wilhelm distinguishes only two announce variants — see below.

The variant is not signalled in the `0x02` announce — BlueBus infers it from observed message patterns (presence of `0xD4`, response to a `0x21` probe, etc.). The detection algorithm is in `handler_ibus.c` around `HandlerIBusRADMessageReceived` (`:1775–1784`).

---

## Announce / Pong

Wilhelm `02.md` lists two announce frames for `0x68`:

```
68 04 FF 02 01 90      # C23 BM   (broadcast LOC)
68 04 BF 02 01 D0      # BM53     (broadcast GLO)
```

> *Source:* Wilhelm `02.md:128–130`.

Note the different broadcast targets (`0xFF` vs `0xBF`) — see [Open questions](#open-questions--tbc).

---

## Messages where RAD is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x21` | C43 screen update | GT `0x3B` | C43-style 11-char display update. Overloaded — same byte is also used by RAD to write MID menus and by GT to write displays without cursor. Context disambiguates. | BB `ibus.h:233` (`IBUS_CMD_RAD_C43_SCREEN_UPDATE`), `:236` (`IBUS_CMD_RAD_WRITE_MID_MENU`) |
| `0x23` | Title text (update main area) | GT `0x3B`, IKE `0x80`, or `0xFF` | Title / mode / frequency / metadata display. Includes property (`0x03`/`0x04`) and discard (`0x07`/`0x08`) sub-string markers. | W `radio/23.md` · BB `ibus.h:232` (`IBUS_CMD_RAD_UPDATE_MAIN_AREA`), `:235` (`IBUS_CMD_RAD_WRITE_MID_DISPLAY`) |
| `0x32` | Volume set | broadcast | Volume update emitted by the radio (separate from the user-input `0x32` sent by MFL / BMBT). | BB `ibus.h:169, 238` |
| `0x33` | Playback control | broadcast | Play / pause / track / disc-change driver. | BB `ibus.h:239` (`IBUS_CMD_RAD_PLAYBACK_CTRL`) |
| `0x36` | EQ (Tone) | GT `0x3B` | Update EQ display (balance / bass / fader / treble). Signed-magnitude 5-bit values. | W `radio/36.md` |
| `0x37` | Tone / Select menu | GT `0x3B` | Tells GT which Tone or Select menu to load. NG-Radio encodes source (radio / CDC) and active state. | W `radio/37.md` |
| `0x46` | Screen mode update / Request UI | GT `0x3B` | The radio's side of the radio↔GT arbitration: priority bits, hide-body flags. | W `radio/46.md` · BB `ibus.h:231, 255–257` |
| `0x4A` | LED / tape control | BMBT `0xF0` | Drive the BMBT LED and tape transport (eject / play / FF / RW / dolby / side). | BB `ibus.h:229` (`IBUS_CMD_RAD_LED_TAPE_CTRL`) |
| `0xC0` | Set menu mode (C43) | GT `0x3B` | C43-only: enter menu mode. | BB `ibus.h:234` (`IBUS_CMD_RAD_C43_SET_MENU_MODE`) |
| `0xC4` | Title-mode flags (C43) | — | C43 title-text layout bitfield. | BB `ibus.h:517` (`IBUS_C43_TITLE_MODE`) |
| `0xD4` | NG-Radio station list | GT `0x3B` | BM54-only: buffered station-name list with selected marker. Split across multiple frames for >3 entries. | W `radio/d4.md` |

---

## Messages where RAD is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x32` | Volume control (user input) | MFL `0x50`, BMBT `0xF0` | Up / down + step. RAD applies the change and may emit a confirming `0x32` back. | W `mfl/32.md`, `bmbt/32.md` |
| `0x38` | CDC request | CDC `0x18` (or BlueBus impersonating CDC) | Play / pause / track / disc / status request. | BB `ibus.h:73` (`IBUS_COMMAND_CDC_REQUEST`) |
| `0x3B` | MFL buttons | MFL `0x50` | FORWARD / BACK button events (track skip on radio). | W `mfl/3b.md` |
| `0x45` | Set radio UI (GT reply) | GT `0x3B` | GT side of the `0x46`/`0x45` arbitration — forces the radio to background or sets display priority. | W `radio/46.md:7–12` · BB `ibus.h:180` (`IBUS_CMD_GT_SCREEN_MODE_SET`) |
| `0x47`, `0x48` | BMBT buttons | BMBT `0xF0` | Hard / soft button events relevant to radio (presets, tone, AM / FM, tape, mode). | W `bmbt/48.md` |
| `0x4E` | Input source | GT `0x3B` | Switch between radio and TV audio input. | W `radio/4e.md` |

---

## Bit fields and enums

### `0x32` — Volume (radio side)

Same layout as documented on the MFL and BMBT pages — bit 0 is direction, upper nibble is step count. The radio emits `0x32` to report its own volume changes (e.g. when an MFL-driven volume change is applied).

### `0x46` — Screen-mode-update / Request-UI bitfield (1 byte)

| Mask | Meaning |
|---|---|
| `0x01` | Priority — radio claiming foreground (`IBUS_RAD_PRIORITY_RAD`). |
| `0x02` | Priority — radio relinquishing to GT (`IBUS_RAD_PRIORITY_GT`). |
| `0x02` | Hide header. (Same mask as priority-GT — context disambiguates.) |
| `0x04` | Hide body — Select overlay. |
| `0x08` | Hide body — Tone overlay. |
| `0x0C` | Hide body — Menu overlay (`IBUS_RAD_HIDE_BODY`). |

> *Source:* Wilhelm `radio/46.md:23–29`; BlueBus `ibus.h:255–257`.

### Volume direction

| Constant | Value |
|---|---|
| `IBUS_RAD_VOLUME_DOWN` | `0x00` |
| `IBUS_RAD_VOLUME_UP` | `0x01` |

> *Source:* BlueBus `ibus.h:526–527`.

### Display character

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_RAD_SPACE_CHAR_ALT` | `0x9D` | Alternative blank character used in radio-driven displays. |

> *Source:* BlueBus `ibus.h:529`. See *[charset (planned)](../charset.md)* for the full character-encoding picture.

### `0x36` — EQ

One byte: bits 7–5 select the property (balance / bass / fader / treble), bits 4–0 are a signed-magnitude value. Bass / treble: ±6 steps. Fader / balance: ±10 steps.

> *Source:* Wilhelm `radio/36.md:32–84`.

### `0x37` — Tone / Select function bits

The high two bits (`0xC0`) distinguish:

| Value | Meaning |
|---|---|
| `0x00` | NG Select |
| `0x40` | Legacy Select |
| `0x80` | Tone Set |
| `0xC0` | Tone (display) |

NG-Select payloads additionally encode source (radio / CDC) and active state in the lower bits.

> *Source:* Wilhelm `radio/37.md:39–99`.

### `0x4E` — Input source

Two-byte payload. Byte 0 bit 0:

| Value | Source |
|---|---|
| `0x00` | Radio |
| `0x01` | TV |

Byte 1: unused.

> *Source:* Wilhelm `radio/4e.md:13–29`.

---

## Per-message detail

### `0x23` — Title text (update main area)

**Direction:** RAD → GT `0x3B`, RAD → IKE `0x80`, or RAD → `0xFF`.

**Frame:** `68 <len> <dst> 23 <layout> <options> <string...> <xor>`

The layout byte encodes the **source** (radio / CDC / tape) and configuration flags. The options byte selects update behaviour (e.g. set vs partial update).

The string region may contain in-band markers:

- `0x03` `<...>` `0x04` — a **property substring**, expected to be live-updated via `0x24` property frames.
- `0x07` `<...>` `0x08` — a **discard substring**, ignored by the GT / MID (used to fit the radio's notion of the string into a smaller display window).

**Example frame:**

```
68 13 FF 23 C4 20 07 20 20 20 20 20 08 43 44 20 31 2D 30 31 56
```

Decoded:
- Layout `0xC4` — CDC source.
- Options `0x20` — update.
- Discard region `0x07 20 20 20 20 20 0x08` — five spaces, to be ignored.
- Visible string `"CD 1-01"`.

> *Source:* Wilhelm `radio/23.md:20–38`.

### `0x46` — Screen-mode update / Request UI

**Direction:** RAD → GT `0x3B`.

**Frame:** `68 04 3B 46 <bitfield> <xor>`.

**Example frames:**

```
68 04 3B 46 01 10      # radio claiming foreground (priority = RAD)
68 04 3B 46 02 13      # radio relinquishing to GT (priority = GT)
68 04 3B 46 08 19      # hide tone overlay
68 04 3B 46 0C 1D      # hide menu overlay
```

> *Source:* Wilhelm `radio/46.md:15–29`.

The full arbitration choreography is in *subsystems/radio-gt-arbitration (planned)*; the long-form treatment is in Wilhelm's `radio/arbitration.md` (814 lines).

### `0x4A` — LED / tape control

**Direction:** RAD → BMBT `0xF0`. Single control byte. See [`bmbt.md`](bmbt.md#0x4a--tape--led-control-dst) for the full value table.

### `0x36` — EQ display

**Direction:** RAD → GT `0x3B`. One-byte payload — property bits and signed-magnitude value.

> *Source:* Wilhelm `radio/36.md`.

### `0x37` — Tone / Select menu

**Direction:** RAD → GT `0x3B`. Tells the GT which menu to render.

> *Source:* Wilhelm `radio/37.md`.

### `0xD4` — NG-Radio station list (BM54 only)

**Direction:** RAD `0x68` → GT `0x3B`.

Variable-length. Header carries message type (ACK / SET / LIST), station count, and message-index (for multi-frame splits). The body holds up to three null-terminated station names per frame, max 8 chars each. The string terminator with bit 4 set marks the **currently selected station**.

> *Source:* Wilhelm `radio/d4.md`.

---

## Cross-cutting subsystems

- *subsystems/radio-gt-arbitration (planned)* — the `0x46` / `0x45` dance. RAD claims the screen with `0x46 + 0x01`; GT replies with `0x45` to confirm or override; RAD relinquishes with `0x46 + 0x02`. Hide-body bits suppress the tone / select / menu overlays.
- *subsystems/cdc-emulation (planned)* — RAD drives the CDC at `0x18` via `0x38` requests and consumes `0x39` status. BlueBus masquerades as CDC; see [`cdc.md`](cdc.md) *(planned)*.
- DSP integration — RAD configures DSP input via `IBUS_DSP_CMD_CONFIG_SET 0x36` to `IBUS_DSP_CONFIG_SET_INPUT_RADIO 0xA1` (BlueBus `ibus.h:117–118`); this is documented under *[dsp](dsp.md) (planned)*.

---

## Open questions / TBC

- **Announce broadcast destination differs by variant.** C23 BM uses `0xFF` (LOC); BM53 uses `0xBF` (GLO). No source explains the rationale — possibly historical or related to whether the chassis has an I-Bus segment. Worth investigating across chassis captures.
- **Variant detection.** BlueBus infers the radio type from message patterns rather than from an explicit probe. Whether the inference is fully robust on edge cases (BM24 vs C43, BM54 with/without NG-UI) is unclear from the static code alone.
- **`0x21` overloading.** The byte `0x21` appears as `IBUS_CMD_RAD_C43_SCREEN_UPDATE`, `IBUS_CMD_RAD_WRITE_MID_MENU`, and `IBUS_CMD_GT_WRITE_NO_CURSOR` (`ibus.h:172, 175, 233, 236`). Context (source / dest) disambiguates, but a logger that displays by command byte alone will confuse them.
- **bimmerz RAD coverage is minimal.** Only `CD53_DISPLAY_TEXT_LENGTH 11` and a `BLANK_CHAR 0x9D` constant; one builder for display text; no parsers. Don't rely on bimmerz as a reference for radio interactions.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:26` — address.
- `firmware/application/lib/ibus.h:73–106` — CDC command set (for `0x38` requests RAD issues to CDC).
- `firmware/application/lib/ibus.h:169` — `IBUS_CMD_VOLUME_SET 0x32`.
- `firmware/application/lib/ibus.h:229–239` — RAD-specific command constants.
- `firmware/application/lib/ibus.h:255–257` — `IBUS_RAD_HIDE_BODY`, `IBUS_RAD_PRIORITY_RAD`, `IBUS_RAD_PRIORITY_GT`.
- `firmware/application/lib/ibus.h:517` — `IBUS_C43_TITLE_MODE 0xC4`.
- `firmware/application/lib/ibus.h:519–525` — radio-type enum.
- `firmware/application/lib/ibus.h:526–529` — volume and blank-char constants.
- `firmware/application/handler/handler_ibus.c:1775–1784` — `HandlerIBusRADMessageReceived` (state tracking for the radio).
- `firmware/application/ui/cd53.c` — UI emulating a C43-style radio display; the densest concrete example of how the radio-side protocol is used.

### Wilhelm-docs
- `radio/23.md` — title text.
- `radio/36.md` — EQ.
- `radio/37.md` — Tone / Select menu.
- `radio/46.md` — screen-mode update / request UI.
- `radio/4e.md` — input source.
- `radio/arbitration.md` — the 814-line radio↔GT arbitration treatment.
- `radio/d4.md` — NG-Radio station list.
- `radio/service_mode.md` — radio service mode.
- `02.md:128–130` — announce frames (C23 BM and BM53 variants).
- `README.md:137` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:37` — address.
- `packages/commands/src/devices/rad/types.ts:8–9` — `CD53_DISPLAY_TEXT_LENGTH 11`, `BLANK_CHAR 0x9D`. Minimal coverage.
- `packages/commands/src/devices/rad/builders.ts` — single display-text builder.
