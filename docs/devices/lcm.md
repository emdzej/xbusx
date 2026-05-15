# LCM (0xD0) — Lamp Check Module / Light Switch Centre

**Status:** Draft.

**Role:** The exterior-lighting controller. Drives the headlamps, turn signals, brake lights, fog lights, parking lights, and on later chassis the adaptive headlight aim. It also reports lamp-fault status (check-control messages — "Bulb left brake light"), exposes the dimmer-control voltage for the instrument-cluster backlight, and on some chassis serves as the source for the **redundant-data** copy of VIN and odometer used by the IKE for OBC display.

**Buses:** K/I.

**Chassis coverage:** All. Address `0xD0` is universal across BMW chassis that use the I/K-bus.

**Variants:** **Eight.** This is the most variant-heavy device in the address space. Variants differ in (a) the byte offsets of the lamp-status bitfields in `0x5B`, (b) the battery-voltage scaling factor used to decode the dimmer-voltage byte, and (c) the bulb-activation set supported. Detection is via the diagnostic-index (`DI`) and coding-index (`CI`) bytes returned in the `0x00` ident response — see [Variants](#variants-1).

---

## Address

`0xD0`. *Sources:* BlueBus `ibus.h:39`, Wilhelm `README.md:164`, bimmerz `devices.ts:52` — agreed.

---

## Announce / Pong

```
D0 04 BF 02 01 68
```

The LCM announces with the plain `0x02 0x01` pattern; no variant signature is carried in the announce frame. Variant detection requires a `0x00` ident exchange (diagnostic).

> *Source:* Wilhelm `02.md:133`.

---

## Variants

Each variant has a constant value (used internally by BlueBus to dispatch to the right byte-offset table), a diagnostic-index / coding-index detection rule (read from the `0x00` ident response), and a different byte layout for the `0x5B` lamp-status frame.

| Variant | Const | DI / CI trigger | Chassis | Battery scale |
|---|---|---|---|---|
| LME38   | `IBUS_LM_LME38 1`   | `DI < 0x10`                                  | E38 early                | 136 |
| LCM     | `IBUS_LM_LCM 2`     | `DI == 0x10`                                 | E38, E39 (mid)           | 136 |
| LCM_A   | `IBUS_LM_LCM_A 3`   | `DI == 0x11`                                 | E39 variant              | 136 |
| LCM_II  | `IBUS_LM_LCM_II 4`  | `DI == 0x12 && CI == 0x16`                   | E39, E46 (early)         | 136 |
| LCM_III | `IBUS_LM_LCM_III 5` | `(DI == 0x12 && CI == 0x17) \|\| DI == 0x13` | E39, E46                 | 136 |
| LCM_IV  | `IBUS_LM_LCM_IV 6`  | `DI == 0x14`                                 | E46 late, E8X            | 132 |
| LSZ     | `IBUS_LM_LSZ 7`     | `0x20 ≤ DI ≤ 0x2F`                           | E6x+                     | 136 |
| LSZ_2   | `IBUS_LM_LSZ_2 8`   | `0x30 ≤ DI ≤ 0x40`                           | E8X+ (latest)            | 132 |

> *Source:* BlueBus `ibus.h:375–383` (variant constants) and `ibus.c:1477–1515` (`IBusGetLMVariant` detection logic). bimmerz mirrors the constants at `lcm/types.ts:2–11`. Wilhelm does not enumerate per-variant byte offsets — the variant table is effectively BlueBus-only.

### Battery-voltage scale

The dimmer / battery byte from `0x90` is multiplied by a per-variant scale factor:

- **136** (`IBUS_LM_BATTERY_SCALE_DEFAULT`, `ibus.h:372`) — LME38, LCM, LCM_A, LCM_II, LCM_III, LSZ.
- **132** (`IBUS_LM_BATTERY_SCALE_E46_E8X`, `ibus.h:373`) — LCM_IV, LSZ_2.

### Lamp-status byte offsets per variant — overview

The lamp-status `0x5B` payload is *not* structurally identical across variants. The blinker (turn signal) bits, in particular, sit in a different byte and use different masks per variant. The per-variant offsets and masks below are reconstructed from BlueBus's bit-definition constants (`ibus.h:304–358`); Wilhelm's `lcm/5b.md` documents only the LCM_III / LCM_IV cases.

| Variant | Blinker | Side markers | High beam | Tail lamps | Notes |
|---|---|---|---|---|---|
| LME38   | Byte 0 (L=`0x01`, R=`0x02`) | Byte 2 (L=`0x02`), Byte 3 (R=`0x40`) | Byte 4 (L=`0x01`, R=`0x02`) | Byte 3 (L=`0x20`), Byte 2 (R=`0x04`) | Distinct byte layout from other variants. |
| LCM, LCM_A | Byte 1 (L=`0x01`, R=`0x02`) | Byte 5 (L=`0x01`), Byte 6 (R=`0x20`) | Byte 5 (L=`0x10`, R=`0x20`) | Byte 6 (L=`0x08`), Byte 7 (R=`0x10`) | |
| LCM_II, LCM_III, LCM_IV | Byte 2 (L=`0x80`, R=`0x40`) | (TBC) | Byte 5 (L=`0x10`, R=`0x20`) | Byte 6 (L=`0x08`), Byte 7 (R=`0x10`) | Blinker moved to byte 2; uses high bits. |
| LSZ, LSZ_2 | Byte 2 (L=`0x50`); Byte 3 (R=`0x80`); off both = `0xFF` | Byte 5 (L=`0x08`), Byte 4 (R=`0x02`) | Byte 5 (L=`0x10`, R=`0x20`) | Byte 5 (L=`0x40`), Byte 6 (R=`0x08`) | Headlight off-state encoded as full-byte `0xFF`. |

> *Source:* BlueBus `ibus.h:304–358` per-variant constants. The shared header comment at `ibus.h:286–292` says "L/R Lamp Byte = 0, Blink Byte = 2" — that's a generic / legacy comment; the per-variant definitions are the ground truth.

#### Conflict — generic byte-offset comment vs. per-variant reality

| Source | Claim | Cite |
|---|---|---|
| BlueBus inline comment | "L / R Lamp Byte = 0, Blink Byte = 2" | `ibus.h:286–292` |
| BlueBus per-variant constants | Bytes differ by variant (see table above). | `ibus.h:304–358` |
| Wilhelm `lcm/5b.md` | Documents one byte-by-byte layout, with LCM_III and LCM_IV example frames; does not enumerate the variants. | `lcm/5b.md:16–83` |

**Resolution:** Use the per-variant table. Treat the generic comment at `ibus.h:286–292` as describing the simplest case (LCM_II family); it is not accurate for LME38, LCM, LCM_A, or the LSZ family.
**Why:** The per-variant `#define`s are the values BlueBus actually compiles against; the comment is a historical artefact. Wilhelm's lack of variant-aware enumeration is a coverage gap.

### Diagnostic-packet byte offsets

For the `0x00` ident response and `0x90` IO-status response, BlueBus parses the following fixed offsets:

| Offset | Meaning | Constant | Notes |
|---|---|---|---|
| `9`  | Coding index (CI)             | `IBUS_LM_CI_ID_OFFSET`            | All variants. |
| `10` | Diagnostic index (DI)         | `IBUS_LM_DI_ID_OFFSET`            | All variants (except LME38, which uses offset 10 for battery voltage — see below). |
| `10` | Battery voltage (LME38 only)  | `IBUS_LME38_IO_BATTERY_VOLTAGE_OFFSET` | LME38 uniquely overloads this offset. |
| `11` | Front load (xenon ballast)    | `IBUS_LM_IO_LOAD_FRONT_OFFSET`    | |
| `19` | Dimmer voltage (most)         | `IBUS_LM_IO_DIMMER_OFFSET`        | |
| `20` | Rear load (xenon / ALWR)      | `IBUS_LM_IO_LOAD_REAR_OFFSET`     | |
| `22` | Photo cell (ambient light)    | `IBUS_LM_IO_PHOTO_OFFSET`         | |
| `23` | Dimmer voltage (LME38)        | `IBUS_LME38_IO_DIMMER_OFFSET`     | LME38 uniquely uses offset 23. |

> *Source:* BlueBus `ibus.h:361–370`.

---

## Messages where LCM is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x02` | Pong / Announce | `BF` | Module presence. | W `02.md:133` |
| `0x00` | Ident response (diagnostic) | DIA (`0x3F`) | Variant identification — carries DI / CI. Used by BlueBus's `IBusGetLMVariant`. | BB `ibus.c:1477–1515` |
| `0x54` | Redundant data response | IKE `0x80` | VIN, mileage, etc. — answers IKE's `0x53` request. Used for OBC display refresh. | BB `ibus.c:1384–1415` · W `ike/54.md` |
| `0x5B` | Cluster indicators | `BF` (broadcast) | Lamp status (turn / high beam / fog / parking) + check-control bulb-fault flags. Periodic broadcast. | W `lcm/5b.md` · BB `ibus.h:282` (`IBUS_LCM_LIGHT_STATUS_RESP`) |
| `0x5C` | Dimmer status | `BF` | Dimmer voltage (cluster backlight intensity control). | BB `ibus.h:283` (`IBUS_LCM_DIMMER_STATUS`) |
| `0x90` | IO status (diagnostic) | DIA | Dimmer / front load / rear load / photo cell. Reply to DIA's `0x0B` job. | BB `ibus.h:284` (`IBUS_LCM_IO_STATUS`) |

---

## Messages where LCM is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x0B` | Diagnostic read (IO status) | DIA | Trigger `0x90` response. | BB `ibus.h:364–370` |
| `0x0C` | Diagnostic activate (bulb test) | DIA | Activate specific bulbs for self-test or comfort lighting (welcome / follow-me-home). | BB `ibus.c:2825–2947` (`IBusCommandLMActivateBulbs`) |
| `0x53` | Redundant data request | IKE `0x80` | Asks LCM for VIN / mileage. | BB `ibus.h:218` · W `ike/53.md` |
| `0x5A` | Cluster indicators request | any | Asks LCM to re-broadcast `0x5B`. Observed senders include GT `0x3B` and PDC `0x60` (purpose unclear in those contexts). | W `lcm/5a.md` |

The LCM's check-control message write (`0x1A` to IKE) is **not** addressed to the LCM as DST — it originates from the CCM (`0x30`) on early E38s and from the IKE itself on integrated-CCM chassis. See `0x1A` in [Per-message detail](#per-message-detail) below for the disambiguation.

---

## Bit fields and enums

### `0x5B` — Cluster Indicators (4 or 5 bytes)

**Byte 0** — main indicator bits (common across variants):

| Mask | Name |
|---|---|
| `0x01` | Parking |
| `0x02` | Low beam |
| `0x04` | High beam |
| `0x08` | Fog front |
| `0x10` | Fog rear |
| `0x20` | Turn left |
| `0x40` | Turn right |
| `0x80` | Turn rapid (hazard) |

**Byte 1** — CCM bulb-fault flags (IKE high cluster):

| Mask | Name |
|---|---|
| `0x01` | CCM_PARKING |
| `0x02` | CCM_LOW_BEAM |
| `0x04` | CCM_HIGH_BEAM |
| `0x08` | CCM_FOG_FRONT |
| `0x10` | CCM_FOG_REAR |
| `0x20` | CCM_TURN_LEFT |
| `0x40` | CCM_TURN_RIGHT |
| `0x80` | CCM_LIC_PLATE |

**Byte 2** — reverse / indicators / brake faults:

| Mask | Name |
|---|---|
| `0x02` | CCM_BRAKE |
| `0x04` | INDICATORS |
| `0x20` | CCM_REVERSE |

**Byte 3** — KOMBI-cluster low-cluster faults / fog-rear switch:

| Mask | Name |
|---|---|
| `0x01` | KOMBI_BRAKE_RIGHT |
| `0x02` | KOMBI_BRAKE_LEFT |
| `0x10` | KOMBI_LOW_RIGHT |
| `0x20` | KOMBI_LOW_LEFT |
| `0x40` | FOG_REAR_SWITCH |

**Byte 4** (LCM_IV, LSZ_2 only): one undefined bit (`0x01`).

> *Source:* Wilhelm `lcm/5b.md:30–83`. bimmerz mirrors at `lcm/types.ts:27–58`.

### `0x51` — Check Control Status (1 byte, low-cluster chassis only)

| Bit | Name |
|---|---|
| 0 | Brake fluid low |
| 1 | Fasten seatbelt |
| 2 | Key in ignition |
| 3 | (unknown) |
| 4 | Washer fluid low |
| 5 | (unknown) |
| 6 | Oil level |
| 7 | (unknown) |

> *Source:* Wilhelm `lcm/51.md:25–37`.

E46 and later moved these sensors directly into the IKE; `0x51` exists only for backward compatibility on KOMBI-equipped chassis.

### `0x1A` — Check Control Message (clarification)

`0x1A` is sent **to** the IKE (`0x80`) as a CCM write. On early E38s with a discrete CCM, the source is `0x30` (CCM); on later integrated-CCM chassis, the IKE generates `0x1A` internally based on `0x5B` lamp-fault flags it sees from the LCM. **The LCM is not the source nor the destination of `0x1A`** — it is the upstream lamp-fault sensor that drives the chain.

Display-type byte values:

| Value | Meaning |
|---|---|
| `0x30` | Clear |
| `0x35` | Recall |
| `0x36` | Persist (priority 1, stays on) |
| `0x37` | Alert (priority 2, 20 s, gong) |

> *Source:* Wilhelm `lcm/1a.md:29–42`. BlueBus has the persist / clear pair at `ibus.h:207–208`.

---

## Per-message detail

### `0x5B` — Cluster Indicators

**Direction:** LCM → broadcast.

**Frequency:** Roughly every 100 ms while the bus is active.

**Frame:**

```
D0 <len> BF 5B <byte0> <byte1> <byte2> <byte3> [<byte4>] <xor>
```

`<len>` is `0x07` for 4-byte payload (LCM_III and earlier) and `0x08` for 5-byte payload (LCM_IV and LSZ_2).

**Example frames:**

```
D0 07 BF 5B 00 89 00 00 BA       # LCM_III: no active lamps, CCM low-beam fault (0x89 = 0x80 LIC_PLATE + 0x08 FOG_FRONT + 0x01 PARKING)
D0 08 BF 5B 1B 00 00 40 00 67    # LCM_IV: left+right turn + parking; CCM reverse fault
```

> *Source:* Wilhelm `lcm/5b.md:14–28`.

The lamp-fault flags in byte 1 drive the bulb-out warnings shown on the high-cluster check-control panel and (via `0x1A`) any persistent text the IKE renders.

### `0x5A` — Cluster Indicators Request

**Direction:** any → LCM.

**Frame:**

```
<src> 03 D0 5A <xor>
```

Examples:

```
3B 03 D0 5A B2     # GT requesting status from LCM
60 03 D0 5A E9     # PDC requesting status from LCM
```

> *Source:* Wilhelm `lcm/5a.md`. Wilhelm notes the purpose of the GT-side and PDC-side requests is unclear ("I've not the faintest idea") — possibly a wake-up probe.

### `0x51` — Check Control Status

**Direction:** LCM (early variants) or CCM (`0x30`, on chassis with a discrete CCM) → broadcast.

**Frame:**

```
<src> 04 BF 51 <bitfield> <xor>
```

Example: `30 04 BF 51 01 DB` — CCM reporting brake fluid low.

> *Source:* Wilhelm `lcm/51.md:1–100`.

### `0x54` — Redundant data response (brief)

LCM responds to IKE's `0x53` request with VIN, mileage, and service-interval data. The choreography is documented in *[obc-display (planned)](../subsystems/obc-display.md)*; BlueBus's handler extracts the VIN as bytes DB1–DB5 and triggers a config reset on VIN change (`ibus.c:1384–1415`).

### `0x90` — IO Status (diagnostic)

**Direction:** LCM → DIA (`0x3F`).

Carries dimmer voltage, xenon ballast feedback (front / rear load), and photo-cell reading. Byte offsets vary between LME38 and the rest — see the [diagnostic-packet byte offsets](#diagnostic-packet-byte-offsets) table.

The dimmer's internal checksum (`IBusGetLMDimmerChecksum`, `ibus.c:1452–1463`) is computed *not* over the whole packet but only over byte indices 4 through `LEN−3` — i.e., it's an inner XOR distinct from the regular frame XOR. Software that re-emits `0x90` frames must compute this inner XOR correctly.

---

## Cross-cutting subsystems

- *subsystems/obc-display (planned)* — LCM is the source of the redundant-data copy of VIN / mileage that the IKE uses for OBC display refresh.
- *subsystems/door-locks-zke3-vs-zke5 (planned)* — the LCM consumes `0x72` (remote key entry) from the GM to trigger welcome / follow-me-home lighting.
- *subsystems/ignition-state (planned)* — the LCM's behaviour (bulb checks, comfort blinkers, home lighting) depends on ignition-state transitions reported by the IKE.

---

## Open questions / TBC

- **Per-variant byte-offset table is BlueBus-only.** Wilhelm does not enumerate the variants' byte layouts. The table here is reconstructed from BlueBus's per-variant `#define`s, which in turn appear to be derived from EDIABAS job templates (the `IBusGetLMVariant` function header at `ibus.c:1470` references "Group file: D_00D0.GRP"). Validate with real-vehicle captures from each chassis class.
- **LSZ_2 detection upper bound.** BlueBus checks `0x30 ≤ DI ≤ 0x40` (`ibus.c:1509`). bimmerz checks only `DI == 0x30` (`lcm/types.ts` parser). Verify which is correct — the inclusive-range check is more conservative and is preferred unless real frames show otherwise.
- **LCM_A role.** It sits between LCM and LCM_II in the variant sequence (DI `0x11`). BlueBus treats it identically to LCM in terms of byte offsets. Is it a firmware revision or a real hardware variant? No source documents the distinction.
- **`0x5A` request semantics from GT and PDC.** Wilhelm explicitly disclaims understanding of why these modules ask for cluster indicators. Speculation: wake / liveness probe. Worth a trace.
- **Side-marker bytes for LCM_II / LCM_III / LCM_IV** — BlueBus's per-variant constants cover blinker, high beam, and tail lamps explicitly for these variants but not side markers. They may share LCM's offsets, but it's not asserted. TBC.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:39` — address.
- `firmware/application/lib/ibus.h:218–220` — redundant-data request/response constants and bulb-indicator request.
- `firmware/application/lib/ibus.h:281–284` — `IBUS_LCM_LIGHT_STATUS_REQ/RESP`, `DIMMER_STATUS`, `IO_STATUS`.
- `firmware/application/lib/ibus.h:286–292` — generic lamp-status byte/bit comment (legacy / LCM_II-family).
- `firmware/application/lib/ibus.h:294–358` — per-variant lamp-status bit definitions (LME38, LCM, LCM_A, LCM_II/III/IV, LSZ, LSZ_2).
- `firmware/application/lib/ibus.h:361–373` — diagnostic-packet byte offsets and battery scale constants.
- `firmware/application/lib/ibus.h:375–383` — variant enum.
- `firmware/application/lib/ibus.c:1418–1440` — ident parsing (CI / DI extraction).
- `firmware/application/lib/ibus.c:1452–1463` — `IBusGetLMDimmerChecksum` (inner XOR).
- `firmware/application/lib/ibus.c:1477–1515` — `IBusGetLMVariant` (DI/CI to variant mapping).
- `firmware/application/lib/ibus.c:2825–2947` — `IBusCommandLMActivateBulbs` (bulb-test / comfort-light driver).
- `firmware/application/lib/ibus.c:1384–1415` — redundant-data response handling.
- `firmware/application/handler/handler_ibus.c:1129` — `HandlerIBusLMIdentResponse`.
- `firmware/application/handler/handler_ibus.c:1148–1269` — `HandlerIBusLMLightStatus` (comfort-blinker logic).
- `firmware/application/handler/handler_ibus.c:282–354` — `HandlerIBusLMActivateBulbs` wrapper.

### Wilhelm-docs
- `lcm/1a.md` — check-control-message format (sourced from CCM `0x30` to IKE, not LCM).
- `lcm/51.md` — `0x51` Check-Control Status (KOMBI-cluster only).
- `lcm/5a.md` — `0x5A` cluster-indicators request.
- `lcm/5b.md` — `0x5B` cluster-indicators response, with LCM_III / LCM_IV example frames.
- `02.md:133` — announce frame.
- `README.md:164` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:52` — address.
- `packages/commands/src/devices/lcm/types.ts:2–58` — variant enum, cluster-indicator masks.
- `packages/commands/src/devices/lcm/parsers.ts:35–61` — variant-detection parser (note: differs from BlueBus on LSZ_2 upper bound — see open questions).
