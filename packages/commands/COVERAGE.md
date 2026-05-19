# `@emdzej/ibusx-commands` coverage

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
| **Implemented** in `packages/commands/src/` | 45 |
| **Known to exist in navcoder** but not yet covered | 68 |
| **Total navcoder I/K-bus command-name table** | 112 — *one byte (`0x1B`) appears twice as both `IKE text status` and `PDC sensor request` in different parsers; the union is 112 distinct meanings on 112 bytes.* |

## Implemented (45 bytes)

`0x01`, `0x02`, `0x07`, `0x0C`, `0x10`, `0x11`, `0x12`, `0x13`, `0x16`,
`0x17`, `0x18`, `0x19`, `0x1A`, `0x1B`, `0x1D`, `0x1F`, `0x23`, `0x24`,
`0x2B`, `0x2C`, `0x31`, `0x32`, `0x38`, `0x39`, `0x3B`, `0x40`, `0x41`,
`0x44`, `0x45`, `0x46`, `0x47`, `0x48`, `0x49`, `0x4F`, `0x55`, `0x59`,
`0x5A`, `0x5B`, `0x72`, `0x73`, `0x74`, `0x76`, `0x79`, `0x7A`, `0xA0`.

For each, see the constant `CMD_*` in the corresponding
`packages/commands/src/<device>/<command>.ts`.

## Gap — 68 command bytes navcoder names but we don't yet decode

Grouped by likely device / subsystem. Names are taken verbatim from
navcoder's table. **Priority** is an editorial guess — `high` means
high observed traffic on real chassis (cluster, doors, climate);
`mid` means present-on-many-cars-but-rarely-acted-on; `low` means rare
or chassis-specific.

### Cluster / driver-info (IKE)

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x1C` | Gong | low | navcoder's name-table calls this "Gong", **but the parser at `ibus.bas:17823–17893` only special-cases the exact bytes `0x1C 0x00` and renders that as "Device reset"**; other 0x1C payloads are dumped as opaque hex. No reference frame in BlueBus or Wilhelm. Held until we have a real bus capture to ground the actual semantic. |

*Implemented in Batch 1 (2026-05-19):* `0x1A` IKE Check Control text
(BlueBus authority), `0x44` IKE numeric write (BlueBus authority),
`0x55` IKE Replicate Data (Wilhelm authority), `0x24` IKE OBC Text
broadcast (Wilhelm authority).

*Implemented in the follow-up RE pass:* `0x1F` GPS Time (Wilhelm
`nav/1f.md` authority — NAV → IKE, 9-byte BCD-packed time + date).
Lives under `packages/commands/src/nav/` since NAV is the broadcaster.

### Doors / body / immobiliser (GM / ZKE / EWS)

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x70` | Remote control central locking status | high | RF/IR remote-key broadcasts; complements our `0x72` remote-key codec. |
| `0x71` | Rain sensor status | mid | RLS broadcasts beyond the `0x59` light-sensor frame. |
| `0x77` | Wiper status | mid | |
| `0x75` | Wiper status request | mid | |
| `0x78` | Seat Memory | mid | E38/E39 driver+passenger seat memory recall events. |
| `0x7C` | Sunroof status | low | SHD broadcasts. |
| `0x7D` | Sunroof control | low | Sunroof commands. |
| `0x6D` | Mirror control | low | |

### Climate / heating (IHKA / STH / FHK)

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x3A` | Recirculating air control | mid | |
| `0x83` | Air conditioning compressor status | mid | |
| `0x86` | Aux Heating/Vent status | mid | Standheizung. |
| `0x87` | Aux Heating/Vent status request | mid | |
| `0x92` | Heater status | mid | |
| `0x93` | Heater status request | mid | |

### Lights (LCM)

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x56` | Light control status request | mid | Companion to our 0x5A/0x5B cluster-indicators codec. |
| `0x57` | Check Control button | mid | |
| `0x58` | Headlight wipe interval | low | |
| `0x5C` | Light dimmer | mid | |
| `0x5D` | Light dimmer status request | mid | |
| `0x5E` | LAM sensor | low | |

### Suspension / RDC

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x60` | Suspension control status request | low | EHC chassis-only. |
| `0x61` | Suspension control | low | |
| `0x62` | RDC status | mid | Tyre-pressure / deflation warning. |

### Radio / Telephone / Audio

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x33` | Part number status | low | Identification helper. |
| `0x34` | DSP equaliser button | mid | |
| `0x36` | Audio_control | mid | |
| `0x37` | Select Menu | mid | |
| `0x3C` | DSP preset sound patterns | mid | |
| `0x4A` | Cassette control | low | |
| `0x4B` | Cassette status | low | |
| `0x4E` | Audio source selection | mid | RAD → DSP / CDC source switching. |
| `0x9F` | Headphone status | low | Rear-headphone variant. |
| `0xA9` | Telephone data | low | |
| `0x2D` | Telephone number | low | TEL: digit-by-digit dial. |

### Graphics terminal / MID / OBC text

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x20` | Display status | mid | |
| `0x21` | Menu Text | mid | |
| `0x22` | Text display confirmation | mid | |
| `0x27` | MID display request | mid | |
| `0x28` | MID denied access | low | |
| `0x29` | Report MID display | mid | |
| `0x2A` | On-board computer special indicators | mid | |
| `0x42` | On-board computer scroll | low | Companion to our `0x40`/`0x41`. |
| `0x43` | Mono display | low | |
| `0x52` | Text Display Update | mid | |
| `0x5F` | Info swap | mid | |
| `0xA5` | Screen Text | mid | |
| `0xA6` | Special indicators | mid | |

### Navigation / TMC

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0xA1` | Current position request | mid | |
| `0xA2` | Current position | mid | |
| `0xA3` | Current location request | mid | |
| `0xA4` | Current location | mid | |
| `0xA7` | TMC status request | low | |
| `0xA8` | TMC data | low | |
| `0xAA` | Nav Control | mid | |
| `0xAB` | Remote control status | low | |
| `0xD4` | NG Radio Station list | low | Next-gen radio specific. |

### Vehicle / system status (CCM / check-control / E31-era)

| Byte | Name | Priority | Note |
|---:|---|---|---|
| `0x03` | Bus status request | high | Universal protocol-level command — like an extended ping. |
| `0x04` | Bus status | high | |
| `0x05` | Backlight Control | mid | |
| `0x06` | Identification | high | Generic device-identification request, broader than the ping/pong pair we already have. |
| `0x14` | Country coding status request | mid | |
| `0x15` | Country coding status | mid | |
| `0x50` | Checkcontrol sensor request | mid | |
| `0x51` | Checkcontrol sensors | mid | |
| `0x53` | Vehicle data request | mid | |
| `0x54` | Vehicle data status | mid | |
| `0x35` | Car memory response | low | |

## Cross-references inside navcoder

For each gap entry, the same function `Proc_5_4_498820`
(`ibus.bas:2097–3213`) holds the byte-to-name mapping. To find the
*parser* for a particular byte, look for the per-message dispatcher: it
lives in the public form method `parseMsg(DatagramMsg)` at
`NavCoderMainForm.frm:68825` (address `0x5D0A60`), which fans out
to per-device parsers. Each parser is a stripped `Proc_X_Y_addr` in
`ibus.bas` and has its own command-byte switch.

## Notes

- This page is implementation status, not protocol reference. The
  protocol-side documentation (what each command means in semantic
  terms) belongs under `docs/devices/` and `docs/message-index.md`,
  not here.
- The 73 gap commands are not all worth implementing — some are
  chassis-specific or low-traffic, and some require navcoder-side
  re-engineering to extract the parser correctly. Prioritise by what
  shows up on a live bus capture for the chassis at hand.
- Many of the "request" / "status" pairs come together — implementing
  one without the other is rarely useful. The table groups them where
  practical.
