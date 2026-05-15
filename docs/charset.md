# Character encoding

**Status:** Draft.

Strings on the I/K-bus are 8-bit byte sequences interpreted as **mostly ASCII** for printable text, with a handful of **device-specific glyphs** mapped into the upper half of the byte range (0x80–0xFF). There is no single canonical character table that applies across all devices — each display module (IKE, MID, GT, BMBT) has its own glyph set, and the same byte value can render differently on different displays. This page documents the common cases and lists every special character surfaced by BlueBus.

## Base encoding

For byte values `0x20` through `0x7E` (the printable ASCII range), all surveyed displays render the standard glyph:

```
0x20 = ' '   space
0x21 = '!'
…
0x30 = '0'
0x31 = '1'
…
0x41 = 'A'
0x42 = 'B'
…
0x61 = 'a'
0x62 = 'b'
…
0x7E = '~'
```

> *Sources:* Wilhelm `ike/24.md`, `radio/23.md`, and many per-command frame dumps render ASCII strings without any decoder. The OBC text examples in `ike/24.md:65–127` use plain ASCII for date, time, range, distance, consumption, etc.

Bytes outside the printable-ASCII range (`< 0x20` or `> 0x7E`) are **special** — see below.

## Special characters

The full per-display glyph table is rendered as PNG images in Wilhelm `ike/charset/{1..13}.png` (not embedded here). The values below are the special characters explicitly surfaced as named constants in BlueBus's source — i.e., the ones with documented semantics rather than just "glyph at this codepoint".

### Control / formatting

| Byte | Constant | Meaning | Source |
|---|---|---|---|
| `0x01` | `IBUS_TEL_CHAR_FLASH_PREFIX` | Prefix for flashing text in the telephone "default" display mode. The byte that follows is the character to flash. | BB `ibus.h:413` |
| `0x06` | `IBUS_TEL_CHAR_FIELD_DELIMITER` | Field separator in menu rows — splits the row into 4-character menu slots on the MID. | BB `ibus.h:413` |
| `0x07` … `0x08` | (no name) | Wraps a **discard substring** in radio `0x23` title text. The GT / MID ignore everything between the pair. Used by the radio to fit a wider internal string into a narrower display window. | W `radio/23.md:180–189` |
| `0x03` … `0x04` | (no name) | Wraps a **property substring** in radio `0x23` title text. The bracketed region is expected to be live-updated via separate `0x24` property frames. | W `radio/23.md` |

### Display glyphs (BlueBus-named)

| Byte | Constant | Meaning | Source |
|---|---|---|---|
| `0x9D` | `IBUS_RAD_SPACE_CHAR_ALT` | Alternative blank character used by the radio when padding display text. Some displays render it as a slim space; others as a placeholder block. | BB `ibus.h:529` |
| `0xB2` | `IBUS_TEL_SIGNAL_BAR_0` | Signal-strength meter: 0 bars / empty cell. | BB `ibus.h:477` |
| `0xB3` | `IBUS_TEL_SIGNAL_BAR_1` | 1 bar. | BB `ibus.h:478` |
| `0xB4` | `IBUS_TEL_SIGNAL_BAR_2` | 2 bars. | BB `ibus.h:479` |
| `0xB5` | `IBUS_TEL_SIGNAL_BAR_3` | 3 bars. | BB `ibus.h:480` |
| `0xB6` | `IBUS_TEL_SIGNAL_BAR_4` | 4 bars. | BB `ibus.h:481` |
| `0xB7` | `IBUS_TEL_SIGNAL_BAR_5` | 5 bars. | BB `ibus.h:482` |
| `0xB8` | `IBUS_TEL_SIGNAL_BAR_FULL` | Full / filled cell. | BB `ibus.h:483` |
| `0xC6` | `IBUS_TEL_CHAR_HANDSFREE_ICON` | Speaker icon (hands-free indicator). | BB `ibus.h:415` |
| `0xC7` | `IBUS_TEL_CHAR_ON_CALL_LEFT` | Left half of the "on call" icon. | BB `ibus.h:416` |
| `0xC8` | `IBUS_TEL_CHAR_ON_CALL_RIGHT` | Right half of the "on call" icon. Together with `0xC7` forms the two-cell call-active glyph. | BB `ibus.h:417` |
| `0xC9` | `IBUS_MID_SYMBOL_NEXT` | "Next / forward" navigation symbol (MID). | BB `ibus.h:385` |
| `0xCA` | `IBUS_MID_SYMBOL_BACK` | "Back" navigation symbol (MID). | BB `ibus.h:386` |

## Per-display differences

The same byte can render differently on different displays:

- **High cluster (IKE / IKI):** wide glyph set, supports the lower-case ASCII characters, supports the special glyphs above for OBC display.
- **Low cluster (KOMBI):** narrower glyph set; many of the upper-half glyphs render as blanks or placeholder squares.
- **MID (`0xC0`):** has its own glyph set, with the `0xC9` / `0xCA` next / back symbols and (on telephone-mode displays) the `0xB2`–`0xB8` signal-bar set.
- **GT (`0x3B`):** widest glyph set; renders all of the above plus typography-quality character set for navigation prompts.

> *TBC:* the full glyph map per display module. Wilhelm's `ike/charset/` PNG charts are the closest published reference; reproducing them as tables would need a per-image transcription pass.

## String formatting conventions

Per-command pages document the conventions; the most common are:

- **Fixed-length, space-padded.** OBC text values (`0x24`) are fixed per property — e.g. Time is always exactly 7 chars: `" 8:31PM"`, including the leading space and the AM/PM marker. The display module relies on the fixed length; trailing junk after the expected character count is undefined behaviour.
- **Discard markers** (radio `0x23` only): `0x07 <bytes> 0x08` brackets a chunk the receiver should ignore. The radio uses this to ship a string padded for its own internal use; the GT skips the bracketed region.
- **Property markers** (radio `0x23` only): `0x03 <bytes> 0x04` brackets a chunk that will be live-updated via subsequent `0x24` frames.
- **Field delimiters** (TEL `0x21` menu text only): `0x06` separates 4-character menu slots.

## Numbers

Some commands carry numbers as **packed BCD** (binary-coded decimal) rather than ASCII:

- `0x1F` GPS time — packed BCD for hours, minutes, day, month, year (see [`gt.md`](devices/gt.md#0x1f--gps-time-received-from-nav)).
- IKE odometer (`0x17`) — three-byte little-endian binary, not BCD (see [`ike.md`](devices/ike.md#0x16--odometer-request--0x17--odometer)).
- IKE speed/RPM (`0x18`) — scaled binary (`speed_byte × 2`, `rpm_byte × 100`).

The format is per-command; the per-message detail pages document each one.

## What is *not* here

- Per-byte glyph tables for each display. Use Wilhelm's `ike/charset/{1..13}.png` charts as the visual reference.
- Diacritics and locale-specific characters (umlauts, accents, etc.). These exist in BMW's character set but are not exposed as named constants in BlueBus.
- East-Asian / Japanese variants for the JBIT / NAJ modules — out of scope.

---

## Open questions / TBC

- **Comprehensive glyph table.** A transcription of the `ike/charset/*.png` images into per-codepoint tables would be valuable; not done here.
- **Code page selection.** Whether different chassis or locales select a different code page (e.g., for diacritics) is undocumented.
- **GT character set vs IKE character set.** Likely overlap but not identical. Worth a structured comparison.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:385–386` — MID navigation symbols.
- `firmware/application/lib/ibus.h:412–417` — TEL special characters.
- `firmware/application/lib/ibus.h:476–483` — signal-strength bar characters.
- `firmware/application/lib/ibus.h:529` — alternative blank.

### Wilhelm-docs
- `ike/charset/*.png` — per-display glyph charts (images, not transcribed here).
- `ike/24.md`, `radio/23.md` — string-formatting conventions, discard/property markers.
