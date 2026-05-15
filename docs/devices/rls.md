# RLS (0xE8) — Rain / Light Sensor

**Status:** Draft.

**Role:** A windshield-mounted dual sensor that measures ambient light and rain droplets, then reports recommended headlight and wiper state to the LCM and GM. On chassis with auto headlights and rain-sensing wipers, the RLS is the input that triggers them.

**Buses:** K.

**Chassis coverage:** E46 and later chassis with the auto-light / rain-sensor option.

**Variants:** None known.

---

## Address

`0xE8`. *Sources:* Wilhelm `README.md:167`, Wilhelm `address.md:75`, bimmerz `devices.ts:56` — agreed. BlueBus does not declare an `IBUS_DEVICE_RLS` constant.

---

## Messages where RLS is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x59` | Light sensor status | LCM `0xD0` | Reports light intensity + on/off recommendation + reason (twilight / darkness / rain / tunnel / garage). | W `rls/59.md` |

The Wilhelm command index also lists `0x58` and `0x75` as "RLS → GM (TBC)" (`README.md:270, 282`), and `0x77` as "GM → RLS (TBC)" (`README.md:284`). No detail pages exist for those three commands.

---

## Messages where RLS is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x77` | (TBC) | GM `0x00` | Documented only in Wilhelm's command index, no detail page. | W `README.md:284` |

---

## Bit fields and enums

### `0x59` — Light sensor status (2 bytes)

**Byte 1:**

| Mask | Field | Meaning |
|---|---|---|
| `0b0111_0000` | INTENSITY | Light-level steps (see below). |
| `0b0000_0001` | LIGHT_STATE | `0` = lights off, `1` = lights on. |

**Intensity levels (`INTENSITY` mask):**

| Value | Meaning |
|---|---|
| `0x10` | Level 1 (brightest / least dim). |
| `0x20` | Level 2. |
| `0x30` | Level 3. |
| `0x40` | Level 4. |
| `0x50` | Level 5. |
| `0x60` | Level 6 (darkest measured). |

**Byte 2 — Reason mask `0b0001_1111`:**

| Mask | Reason |
|---|---|
| `0x01` | TWILIGHT |
| `0x02` | DARKNESS |
| `0x04` | RAIN |
| `0x08` | TUNNEL |
| `0x10` | GARAGE |

> *Source:* Wilhelm `rls/59.md:13–50`.

---

## Per-message detail

### `0x59` — Light sensor status

**Direction:** RLS → LCM `0xD0`.

**Frame:**

```
E8 05 D0 59 <byte1> <byte2> <xor>
```

**Example frames:**

```
E8 05 D0 59 50 00 34       # intensity 5, lights off, no specific reason
E8 05 D0 59 32 02 54       # intensity 3, lights on, reason = darkness
E8 05 D0 59 11 01 74       # intensity 1, lights on, reason = twilight
```

> *Source:* Wilhelm `rls/59.md:7–11`.

---

## Cross-cutting subsystems

- The RLS feeds the **LCM** (light control) directly via `0x59`. The LCM then drives lamp actuation based on the recommendation.
- Wilfully **driver override** at the headlight switch can override the RLS recommendation; the protocol-level mechanism is not documented.

---

## Open questions / TBC

- **`0x58`, `0x75`, `0x77`.** Wilhelm's command index references these but provides no detail. Likely a status / acknowledgement exchange with the GM. Capture and characterise.
- **Wiper-control commands.** The RLS is the rain-sensing input but it doesn't drive the wiper motor directly — there must be a separate channel (probably K-bus to the body module) for wiper activation. Out of scope for the surveyed sources.

---

## Sources

### Wilhelm-docs
- `rls/59.md` — light-sensor status response.
- `README.md:167, 270, 282, 284` — device-table entry and command-index hooks.
- `address.md:75` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:56` — address.

### BlueBus
- No RLS-specific constants.
