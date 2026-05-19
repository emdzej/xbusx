# `@emdzej/ikbus-commands` coverage

Snapshot of what command bytes the package has codecs for, what's known
to exist but is not yet implemented, and where each gap maps in
navcoder's binary so a future pass can pick it up cheaply.

**Source of the "known to exist" column:** `Proc_5_4_498820` in
`~/Downloads/NavCoderDecomp/ibus.bas:2097` — the I/K-bus command-name
table inside the decompiled VB6 source of `navcoder.exe`. The function
enumerates 112 byte → name pairs in a sequential `cmp/jnz/mov` chain;
the comparison below is mechanical (`comm -23` between our covered
constants and that list).

Last refreshed: 2026-05-19.

## Summary

| Status | Count |
|---|---:|
| **Implemented** in `packages/commands/src/` | 70 |
| **Known to exist in navcoder** but not yet covered | 43 |
| **Total navcoder I/K-bus command-name table** | 112 — *one byte (`0x1B`) appears twice as both `IKE text status` and `PDC sensor request` in different parsers; the union is 112 distinct meanings on 112 bytes.* |

## Implemented (70 bytes)

69 of navcoder's 112 named bytes plus `0xA0` (PDC sensor response —
not in navcoder's I/K-bus name table at `Proc_5_4_498820`; navcoder
handles PDC traffic via a separate path).

`0x01`, `0x02`, `0x05`, `0x06`, `0x07`, `0x0C`, `0x10`, `0x11`, `0x12`,
`0x13`, `0x14`, `0x15`, `0x16`, `0x17`, `0x18`, `0x19`, `0x1A`, `0x1B`,
`0x1C`, `0x1D`, `0x1F`, `0x20`, `0x21`, `0x23`, `0x24`, `0x2A`, `0x2B`,
`0x2C`, `0x2D`, `0x31`, `0x32`, `0x36`, `0x37`, `0x38`, `0x39`, `0x3B`,
`0x40`, `0x41`, `0x42`, `0x44`, `0x45`, `0x46`, `0x47`, `0x48`, `0x49`,
`0x4A`, `0x4E`, `0x4F`, `0x51`, `0x53`, `0x54`, `0x55`, `0x57`, `0x59`,
`0x5A`, `0x5B`, `0x72`, `0x73`, `0x74`, `0x76`, `0x79`, `0x7A`, `0xA0`,
`0xA2`, `0xA4`, `0xA5`, `0xA6`, `0xAA`, `0xAB`, `0xD4`.

For each, see the constant `CMD_*` in the corresponding
`packages/commands/src/<device>/<command>.ts`.

## Gap — 43 command bytes navcoder names but we don't yet decode

All entries below have been audited against the three primary sources
(BlueBus firmware, Wilhelm-docs, navcoder reverse-engineering).
Each is held because no source provides a byte-level layout we can
implement faithfully without guessing.

The audit is current as of 2026-05-19.  When a byte is later
implemented (e.g. after a real-bus capture or new doc), move it out
of this table and update the implemented-list above.

Grouped by likely device / subsystem.

### Doors / body / sunroof / seat (8)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x6D` | Mirror control | No reference in any source. |
| `0x70` | Remote control central locking status | No reference in any source. |
| `0x71` | Rain sensor status | No reference in any source. |
| `0x75` | Wiper status request | No reference in any source. |
| `0x77` | Wiper status | No reference in any source. |
| `0x78` | Seat Memory | No reference in any source. |
| `0x7C` | Sunroof status | No reference in any source. |
| `0x7D` | Sunroof control | No reference in any source. |

### Climate / heating (6)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x3A` | Recirculating air control | No reference in any source. |
| `0x83` | A/C compressor status | No reference in any source. |
| `0x86` | Aux Heating/Vent status (Standheizung) | No reference in any source. |
| `0x87` | Aux Heating/Vent status request | No reference in any source. |
| `0x92` | Heater status | No reference in any source. |
| `0x93` | Heater status request | No reference in any source. |

### Lights (5)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x56` | Light control status request | No reference in any source. |
| `0x58` | Headlight wipe interval | No reference in any source. |
| `0x5C` | Light dimmer | No reference in any source. |
| `0x5D` | Light dimmer status request | No reference in any source. |
| `0x5E` | LAM sensor | No reference in any source. |

### Suspension / RDC (3)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x60` | Suspension control status request | BlueBus has the constant `IBUS_CMD_GT_WRITE_INDEX 0x60` but used as a **sub-byte** inside a `0x21`/`0xA5`-style GT-write frame, **not** as a top-level command.  No I/K-bus top-level layout. |
| `0x61` | Suspension control | BlueBus has `IBUS_CMD_GT_WRITE_INDEX_TMC 0x61` — same story, sub-byte only. |
| `0x62` | RDC status | BlueBus has `IBUS_CMD_GT_WRITE_ZONE 0x62` — same, sub-byte only. |

### Radio / audio (6)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x33` | Part number status (also: Radio Playback Ctrl) | BlueBus has `IBUS_CMD_RAD_PLAYBACK_CTRL 0x33` but only event-triggers on it; no parser/encoder body. |
| `0x34` | DSP equaliser button | No reference in any source. |
| `0x3C` | DSP preset sound patterns | No reference in any source. |
| `0x4B` | Cassette status | Wilhelm mentions "BMBT Tape Status" as a related command to `0x4A` (which we have) but no per-command page. |
| `0x9F` | Headphone status | No reference in any source. |
| `0xA9` | Telephone data | No reference in any source. |

### Graphics terminal / MID display (7)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x22` | Text display confirmation | BlueBus has `IBUS_CMD_GT_MENU_BUFFER_STATUS` as a constant but only fires an event on receipt — no byte-layout parser.  Not in Wilhelm. |
| `0x27` | MID display request | BlueBus has `IBUS_MID_CMD_SET_MODE 0x27` as a constant but no byte-layout parser.  Not in Wilhelm. |
| `0x28` | MID denied access | No reference in any source. |
| `0x29` | Report MID display | No reference in any source. |
| `0x43` | Mono display | No reference in any source. |
| `0x52` | Text Display Update | No reference in any source. |
| `0x5F` | Info swap | No reference in any source. |

### Navigation / TMC (4)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0xA1` | Current position request | Companion to `0xA2` (implemented) but no per-command page. |
| `0xA3` | Current location request | Companion to `0xA4` (implemented) but no per-command page. |
| `0xA7` | TMC status request | No reference in any source. |
| `0xA8` | TMC data | No reference in any source. |

### Vehicle / system status (4)

| Byte | Name (navcoder) | Audit |
|---:|---|---|
| `0x03` | Bus status request | navcoder name-table only.  Its parser at `Proc_5_7_4A6450` handles 0x03 in **D-Bus** context (different protocol), not I/K-bus. |
| `0x04` | Bus status | Same as `0x03`: navcoder name-table; its D-Bus parser handles 0x04 as "Read fault memory" — different protocol. |
| `0x35` | Car memory response | No reference in any source. |
| `0x50` | Check-control sensor request | No reference in any source. |

## How this audit was performed

For each held byte, the following sources were checked:

1. **navcoder** (`~/Downloads/NavCoderDecomp/`)
   - Name table: `ibus.bas:2097–3213` (function `Proc_5_4_498820`) —
     all 43 held bytes have a name here.
   - Parser tables: searched for `mov ecx, 000000NNh` in parser
     contexts outside the name tables (i.e. line > 3728 in
     `ibus.bas`).  None of the held bytes have a parser in
     I/K-bus context (some have D-Bus parsers, which are a
     different protocol).
2. **BlueBus** (`/Users/mjaskols/Projects/my/ext-BlueBus/firmware/application/`)
   - Header constants: `lib/ibus.h` — searched for `IBUS_CMD_*`
     constants matching each byte.
   - Encoders: `lib/ibus.c` — searched for `IBusCommand*` functions
     that write the byte as `text[0]` (top-level command).
   - Handlers: `handler/handler_ibus.c` — searched for `pkt[…CMD]
     == 0xNN` switches.
3. **Wilhelm-docs** (`/Users/mjaskols/Projects/my/ext-wilhelm-docs/`)
   - Per-command pages: `find -name "NN.md"` across all device
     subdirs.
   - README command-index: `README.md:211+` — table of bytes →
     per-device pages.

## Notes

- **This page is implementation status, not protocol reference.**
  The protocol-side documentation (what each command means in
  semantic terms) belongs under `docs/devices/` and
  `docs/message-index.md`, not here.
- Many of the "request" / "status" pairs come together —
  implementing one without the other is rarely useful.  Where one
  has been implemented and the other is in the gap, that's an
  asymmetry worth resolving when a spec emerges.
- For each held byte, the right next step is a **real-bus capture**
  on a chassis that uses the feature.  Frame dumps with timestamps
  let us infer the byte structure that none of the public sources
  document.
