# IKE (0x80) — Instrument Cluster Electronics

**Status:** Draft.

**Role:** The instrument cluster. Drives the speedometer, tachometer, fuel/temp gauges, and the OBC (on-board computer) display. On chassis with both K-Bus and I-Bus it also acts as the **gateway** between them (see [`../protocol/addressing.md`](../protocol/addressing.md#the-gateway-ike-bridges-k-bus-and-i-bus)).

**Buses:** K/I.

**Chassis coverage:** All listed in [`../overview.md`](../overview.md). Address `0x80` is universal across BMW chassis that use the I/K-bus.

**Variants:**

| Variant | Type | Chassis | Notes |
|---|---|---|---|
| **KOMBI** | Low cluster | E46, E83/E85/E86, R50 | Basic dot-matrix display. No full OBC. BlueBus `IBUS_IKE_TYPE_LOW 0x00`. |
| **IKE** | High cluster | E38, E39, E53 (early) | Full OBC. Sensor frame `0x13` is **3 bytes** of payload after `CMD`. BlueBus `IBUS_IKE_TYPE_HIGH 0x0F`. |
| **IKI** | Later high cluster | E38/E39/E53 produced ~Oct 2001 onwards | Full OBC. Sensor frame `0x13` is **7 bytes** of payload — four extra bytes appended (engine, ACC, DSC, fuel level). Backwards-compatible on the first three bytes. |

> *Sources:* Variant naming and `0x13` length distinction from Wilhelm `ike/13.md:5–9`. Low / high differentiation from BlueBus `ibus.h:565–566` (`IBUS_IKE_TYPE_LOW 0x00`, `IBUS_IKE_TYPE_HIGH 0x0F`). The "PU98 / Sep 97 / Oct 01" boundary for IKE→IKI is described by Wilhelm but not formally dated by any other source.

---

## Address

`0x80`. *Sources:* BlueBus `ibus.h:32`, Wilhelm `README.md:146`, bimmerz `devices.ts:44` — agreed.

The address is shared across all cluster variants (KOMBI / IKE / IKI); the variant is determined at runtime, not by address.

---

## Announce / Pong

The cluster announces with command `0x02` after power-up:

```
80 04 BF 02 01 38
```

Signature byte = `0x01` (plain announce, no variant signalled). The IKE does **not** distinguish KOMBI / IKE / IKI in its announce — variant detection has to come from elsewhere (`0x15` vehicle config, or `0x13` payload length).

> *Source:* Wilhelm `02.md:131`. Confirmed via BlueBus's own use of `IBUS_CMD_MOD_STATUS_RESP 0x02` (`ibus.h:223`).

---

## Messages where IKE is `SRC`

The IKE originates most of the vehicle-state traffic on the bus.

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x02` | Announce / Pong | `BF` (broadcast) | Periodic and reactive identity broadcast. | W `02.md` · BB `ibus.h:223` |
| `0x11` | Ignition status | `BF` (broadcast) | Key position 0..3. Triggers wake of dependent modules. | W `ike/11.md` · BB `ibus.h:193` · bz `parsers.ts:24–30` |
| `0x13` | Sensors | `BF` (broadcast) | 3- or 7-byte bitfield: handbrake, oil pressure, brake pads, transmission, engine, door, gear, aux vent, etc. | W `ike/13.md` · BB `ibus.h:195` · bz `parsers.ts:32–61` |
| `0x15` | Vehicle config / Language & Region | `BF` (broadcast) | Chassis-type byte (upper nibble) + locale info. | W `ike/15.md` · BB `ibus.h:197` · bz `parsers.ts:63–77` |
| `0x17` | Odometer | `BF` (broadcast) | 3-byte little-endian km integer. | W `ike/17.md` · bz `parsers.ts:113–122` |
| `0x18` | Speed / RPM | `BF` (broadcast) | 1 byte speed (× 2 = km/h), 1 byte RPM (× 100). | BB `ibus.h:198` · bz `parsers.ts:100–111` |
| `0x19` | Temperature | `BF` (broadcast) | 1 byte ambient (signed °C), 1 byte coolant (°C), 1 byte NA. | W `ike/19.md` · BB `ibus.h:199` |
| `0x24` | OBC text | `E7` (displays multicast) | Property-ID + ASCII string. See OBC property table. | W `ike/24.md` · BB `ibus.h:200` · bz `parsers.ts:124–135` |
| `0x2A` | OBC status | `E7` (displays multicast) | 2-byte bitfield of OBC functional state (memo, timer, limit, code, aux). | W `ike/2a.md` |
| `0x54` | Redundant data | (various) | VIN, mileage, oil/time service intervals — pushed during the `0x53→0x54→0x55` choreography. | W `ike/54.md` · bz `parsers.ts:5–22` |

The IKE also forwards traffic between K and I on gateway-equipped chassis; those frames retain their original `SRC` and do not appear as IKE-originated.

---

## Messages where IKE is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x01` | Ping | (any) | Module-presence check. IKE replies with `0x02`. | W `02.md:60–73` |
| `0x10` | Ignition status request | (any) | Asks IKE to re-broadcast `0x11`. | W `ike/10.md` · BB `ibus.h:192` |
| `0x12` | Sensors request | (any) | Asks IKE to re-broadcast `0x13`. | W `ike/12.md` · BB `ibus.h:194` |
| `0x14` | Language/Region request | (any) | Asks IKE for locale info → `0x15`. | W `ike/14.md` · BB `ibus.h:196` |
| `0x16` | Odometer request | (any) | Asks IKE for odometer → `0x17`. | W `ike/16.md` |
| `0x1D` | Temperature request | (any) | Asks IKE for temperature → `0x19`. | W `ike/1d.md` |
| `0x1A` | CCM (Check Control Message) | RAD `0x68`, others | Writes a CCM warning to the cluster display. Two variants: clear (`0x30`) and persist (`0x36`). | BB `ibus.h:205–208` |
| `0x40` | OBC input (text) | GT `0x3B` | Writes an OBC property value (e.g., user-entered time, date, distance) into the cluster. | W `ike/properties.md` (under `0x40`) · BB `ibus.h:201–203` |
| `0x41` | OBC input (boolean) | GT `0x3B`, BMBT | Request/control flags for OBC properties (request string, request boolean, on/start, off/stop, recalculate, set as current speed). | W `ike/properties.md` (under `0x41`) |
| `0x44` | Write numeric | various | Writes a numeric value to the cluster display. Sub-commands: clear (`0x20`), x1 (`0x21/0x23`), x10 (`0x29/0x2B`), x100 (`0x25/0x27`). | BB `ibus.h:204, 210–216` |
| `0x53` | Redundant data request | LCM `0xD0` (typical) | Initiates the redundant-data exchange. | W `ike/53.md` · BB `ibus.h:218` · bz `builders.ts:5–17` |

The cluster also receives the cluster-button command `0x57` from itself in some configurations — see Wilhelm `ike/57.md` for the cluster-side button handling.

---

## Bit fields and enums

### Ignition state

The single payload byte of `0x11` is a 3-bit field at the LSB:

| Value | Name | Key position | Meaning |
|---|---|---|---|
| `0b000` (`0x00`) | `KL-30` / OFF | Position 0 | Key out or ignition off. Bus may still be active for ~30 s. |
| `0b001` (`0x01`) | `KL-R` | Position 1 | Accessory. Radio and infotainment can run. |
| `0b011` (`0x03`) | `KL-15` | Position 2 | Run. Most modules powered. |
| `0b111` (`0x07`) | `KL-50` | Position 3 | Crank / start. Transient. |

> *Sources:* Wilhelm `ike/11.md:36–41`; BlueBus uses the same values internally (`HandlerIBusIKEIgnitionStatus` at `handler_ibus.c:866–1034` branches on `IBUS_IGNITION_OFF`, `IBUS_IGNITION_KLR`, `IBUS_IGNITION_KL15`); bimmerz `ike/types.ts:2–7` (`OFF=0x00, KL_R=0x01, KL_15=0x03, KL_50=0x07`). Agreed.

The bits are *cumulative-ish* (KL-50 implies KL-15 implies KL-R implies bus alive), but bus consumers should match on equality, not on bit-set tests, because `0x03` is `KL-15` not `KL-15 + KL-R`.

### Vehicle / chassis type

The upper nibble of `DB1` of `0x15` carries a chassis indicator:

| Raw nibble | Chassis | BlueBus internal type | Cluster type set |
|---|---|---|---|
| `0x0` | E38/E39/E53 — **High** OBC | `IBUS_VEHICLE_TYPE_E38_E39_E52_E53` (`0x01`) | `IBUS_IKE_TYPE_HIGH` |
| `0x2` | E38/E39/E53 — **Low** OBC | `IBUS_VEHICLE_TYPE_E38_E39_E52_E53` (`0x01`) | `IBUS_IKE_TYPE_LOW` |
| `0xA`, `0xF` | E46 / Z4 | `IBUS_VEHICLE_TYPE_E46` (`0x02`) | `IBUS_IKE_TYPE_LOW` |

> *Source:* BlueBus `handler_ibus.c:1087–1117` (`HandlerIBusIKEVehicleConfig`). bimmerz collapses this to two cases at `ike/parsers.ts:65–77` (E46/Z4 vs E38/E39/E53), losing the high/low distinction.

#### Vehicle-type encoding — depth of coverage

| Source | Claim | Cite |
|---|---|---|
| BlueBus | 4 raw chassis nibbles (`0x0`, `0x2`, `0xA`, `0xF`) mapped to 4 internal types (E38/E39/E52/E53, E46, E8X, R50). Also derives high/low OBC from the same byte. | `handler_ibus.c:1087–1117`, `ibus.h:561–566` |
| Wilhelm | The `0x15` page itself was not surveyed for this draft; details TBC. | `ike/15.md` (not yet cited) |
| bimmerz | Only two outcomes: `E38_E39_E53` (`0x01`) or `E46_Z4` (`0x02`). Coverage gap for E8X, R50, and the high/low distinction. | `ike/parsers.ts:63–77`, `ike/types.ts:89–94` |

**Resolution:** Use BlueBus's encoding. It is the only source that documents the full nibble-to-chassis table and the high/low OBC distinction.
**Why:** BlueBus's table is derived from runtime branching against real vehicles in production firmware. bimmerz's two-case parser is a coverage gap (it would mis-classify E8X and R50). The Wilhelm `ike/15.md` page should be consulted in a future pass to confirm the raw-byte values.

### Gear encoding (sensor byte 2, upper nibble)

The gear position is encoded in the upper nibble of byte 2 of the `0x13` sensor frame.

| Gear | Upper-nibble pattern | Full byte (with lower nibble = 0) | Sources |
|---|---|---|---|
| None / not in gear | `0b0000` | `0x00` | W `ike/13.md:126`, BB `ibus.h:567`, bz `ike/types.ts:55` |
| Reverse | `0b0001` | `0x10` | W `:128`, BB `:569`, bz `:57` |
| First | `0b0010` | `0x20` | **See conflict block** |
| Second | `0b0110` | `0x60` | W `:132`, BB `:572`, bz `:61` |
| Neutral | `0b0111` | `0x70` | W `:129`, BB `:570`, bz `:58` |
| Drive | `0b1000` | `0x80` | W `:130`, bz `:59` (**not defined in BlueBus**) |
| Park | `0b1011` | `0xB0` | W `:127`, BB `:568`, bz `:56` |
| Fourth | `0b1100` | `0xC0` | W `:134`, BB `:574`, bz `:63` |
| Third | `0b1101` | `0xD0` | W `:133`, BB `:573`, bz `:62` |
| Fifth | `0b1110` | `0xE0` | W `:135`, BB `:575`, bz `:64` |
| Sixth | `0b1111` | `0xF0` | W `:136` (marked "guess"), BB `:576`, bz `:65` |

To decode: extract upper nibble (`(byte2 >> 4) & 0x0F`) and compare against the upper-nibble pattern column; or compare `byte2 & 0xF0` against the full-byte column.

#### `GEAR_FIRST` — BlueBus value disagrees with Wilhelm and bimmerz

| Source | Claim | Cite |
|---|---|---|
| Wilhelm | `GEAR_FIRST = 0b0010_0000` = `0x20`. Upper-nibble pattern `0b0010`. | `ike/13.md:131` |
| bimmerz | `FIRST = 0b0010_0000` = `0x20`. Matches Wilhelm. | `ike/types.ts:60` |
| BlueBus | `IBUS_IKE_GEAR_FIRST 0x10`. Inconsistent with the other gear constants (which use the "extracted nibble" form: `PARK=0x0B`, `REVERSE=0x01`, etc.). `0x10` would mean either the full byte `0x10` (which is `REVERSE` in Wilhelm/bimmerz) or the nibble value `0x10` (which doesn't fit in 4 bits). | `ibus.h:571` |

**Resolution:** Use Wilhelm's value: gear first ⇔ byte2 upper nibble `0b0010` (= byte2 `0x2?`). Treat BlueBus's `IBUS_IKE_GEAR_FIRST 0x10` as a likely typo.
**Why:** Wilhelm and bimmerz agree on `0x20`. BlueBus's value breaks its own convention for the other gear constants. The behaviour of automatic transmissions during a 1st-gear hold (rare in production, but observed) would need a traffic capture to verify directly, which is not currently available.

> **Also note:** BlueBus does not define `IBUS_IKE_GEAR_DRIVE`. Wilhelm and bimmerz both define `DRIVE = 0x80`. This is a BlueBus coverage gap (BlueBus targets the parking/locking choreography, which doesn't need to read DRIVE explicitly).

### OBC property IDs

The OBC carries one byte of state per "property" — time, range, average speed, etc. The property ID is the same across `0x24`, `0x2a`, `0x40`, `0x41`, and `0x42` (with each command supporting only a subset).

| ID | Property | Used by `0x24` (text) | Used by `0x2a` (boolean) | Used by `0x40` (input text) | Used by `0x41` (input bool) | Used by `0x42` (remote) |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `0x01` | Time | ✅ | | ✅ | ✅ | ✅ |
| `0x02` | Date | ✅ | | ✅ | ✅ | ✅ |
| `0x03` | Temperature | ✅ | | | ✅ | |
| `0x04` | Consumption 1 | ✅ | | | ✅ | ✅ |
| `0x05` | Consumption 2 | ✅ | | | ✅ | ✅ |
| `0x06` | Range | ✅ | | | ✅ | ✅ |
| `0x07` | Distance | ✅ | | ✅ | ✅ | ✅ |
| `0x08` | Arrival | ✅ | | | ✅ | ✅ |
| `0x09` | Limit | ✅ | ✅ | ✅ | ✅ | ✅ |
| `0x0a` | Avg. Speed | ✅ | | | ✅ | ✅ |
| `0x0c` | Memo | | ✅ | | ✅ | |
| `0x0d` | Code | ✅ | ✅ | ✅ | ✅ | |
| `0x0e` | Timer | ✅ | ✅ | | ✅ | ✅ |
| `0x0f` | Aux. Timer 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `0x10` | Aux. Timer 2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| `0x11` | Aux. Heat. (Off event) | | ✅ | | ✅ | |
| `0x12` | Aux. Heat. (On event) | | ✅ | | ✅ | |
| `0x13` | Aux. Vent. (Off event) | | ✅ | | ✅ | |
| `0x14` | Aux. Vent. (On event) | | ✅ | | ✅ | |
| `0x16` | Emergency Disarm Code | ✅ | | | | |
| `0x1a` | Timer Lap | ✅ | | | ✅ | |
| `0x1b` | Aux. Status | | | | ✅ | |

> *Source:* Wilhelm `ike/properties.md:5–28`. bimmerz `ike/types.ts:101–117` lists a subset that matches.

---

## Message detail

### `0x10` — Ignition Status Request · `0x11` — Ignition Status

**Direction:**

- `0x10`: any → IKE (`0x80`).
- `0x11`: IKE (`0x80`) → `0xBF` (global broadcast).

**`0x11` frame:**

```
80 04 BF 11 <state> <xor>
```

| Offset | Bytes | Field | Meaning |
|---|---|---|---|
| 3 | 1 | `CMD` | `0x11` |
| 4 | 1 | Ignition state | See bitfield above. Mask `0b0000_0111`. |

**When the IKE emits `0x11`:**

1. On ignition switch position change.
2. Periodically while at KL-R (position 1) or higher.
3. Periodically at KL-30 (position 0) while the bus remains alive.
4. In reply to a `0x02` announce from any module.
5. In reply to a `0x10` ignition request.

> *Source:* Wilhelm `ike/11.md:5–11`. BlueBus's handler (`handler_ibus.c:866–1034`) confirms (1) — the firmware reacts to state transitions.

**Note on wake semantics:** The KL-R supply circuit alone is not enough to wake some modules (e.g., the navigation computer). The cluster's `0x11` broadcast is what causes them to come up, so a non-broadcasting IKE — including one with a blown supply fuse — silently disables half the infotainment stack.

> *Source:* Wilhelm `ike/11.md:13–17`.

**Example frames:**

```
80 04 BF 11 00 2A   # KL-30  (off)
80 04 BF 11 01 2B   # KL-R   (accessory)
80 04 BF 11 03 29   # KL-15  (run)
80 04 BF 11 07 2D   # KL-50  (crank)
```

> *Source:* Wilhelm `ike/11.md:25–28`.

### `0x12` — Sensors Request · `0x13` — Sensors

**Direction:**

- `0x12`: any → IKE.
- `0x13`: IKE → `0xBF` (global broadcast).

**`0x13` frame (high cluster, IKE — 3 payload bytes after CMD):**

```
80 06 BF 13 <byte1> <byte2> <byte3> <xor>
```

**`0x13` frame (high cluster, IKI — 7 payload bytes):**

```
80 0A BF 13 <byte1> <byte2> <byte3> <byte4> <byte5> <byte6> <byte7> <xor>
```

#### Conflict block — sensor frame length

| Source | Claim | Cite |
|---|---|---|
| Wilhelm | 3 bytes on early IKE (pre Oct 2001); 7 bytes on later IKI. Variant-aware. | `ike/13.md:5–9` |
| BlueBus | Length-aware: the handler uses the packet's `LEN` field rather than a fixed assumption. | `handler_ibus.c` (sensor handler not surveyed in detail; behaviour inferred) |
| bimmerz | Reads byte1, byte2, byte3 only — never reads bytes 4–7. | `ike/parsers.ts:32–61` |

**Resolution:** Both 3- and 7-byte variants exist. Bytes 1–3 are identical in both; bytes 4–7 are only present on IKI and carry engine fault, ACC, DSC, and fuel-level information.
**Why:** Wilhelm explicitly documents the transition. bimmerz's omission of bytes 4–7 is a coverage gap that costs IKI-specific signals (engine failsafe, ACC distance, DSC inactive, fuel level).

#### Byte 1 — vehicle safety flags

| Bit | Mask | Name | Meaning |
|---|---|---|---|
| 0 | `0b0000_0001` | `HANDBRAKE_ENGAGED` | 1 = engaged. |
| 1 | `0b0000_0010` | `OIL_PRESSURE_FAULT` | 1 = fault. Indicated at KL-15 until engine starts. |
| 2 | `0b0000_0100` | `BRAKE_PADS_WORN` | 1 = fault. |
| 4 | `0b0001_0000` | `TRANSMISSION_FAILSAFE` | 1 = transmission emergency program. |

#### Byte 2 — engine/door/gear

| Bits | Mask | Name | Meaning |
|---|---|---|---|
| 0 | `0b0000_0001` | `ENGINE_RUNNING` | 1 = engine running. |
| 1 | `0b0000_0010` | `DRIVERS_DOOR_OPEN` | 1 = driver door open (mirrors `0x7A`). |
| 4–7 | `0b1111_0000` | `GEAR` | Upper nibble = current gear. See [Gear encoding](#gear-encoding-sensor-byte-2-upper-nibble) above. |

#### Byte 3 — aux

| Bit | Mask | Name | Meaning |
|---|---|---|---|
| 2 | `0b0000_0100` | `AUX_HEAT` | 1 = auxiliary heating active. |
| 3 | `0b0000_1000` | `AUX_VENT` | 1 = auxiliary ventilation active. |

#### Bytes 4–7 (IKI only)

| Byte | Bit / mask | Name | Notes |
|---|---|---|---|
| 4 | `0b0000_0010` | `ENGINE_FAILSAFE` | Gasoline engines only. |
| 4 | `0b0000_0100` | `INJECTION_SYSTEM` | Diesel only. |
| 4 | `0b0000_1000` | `PREHEATING` | Diesel only. |
| 4 | `0b0010_0000` | `COOLANT_TEMPERATURE` | 1 = overheat. |
| 5 | `0b0000_0001` | `ACC_INACTIVE` | Active cruise faulted. |
| 5 | `0b0000_0010` | `ACC_SENSOR_VIEW` | Active cruise sensor blocked. |
| 5 | `0b0000_0100` | `ACC_PLEASE_SHIFT` | Never used in production. |
| 5 | `0b0001_1000` | `ACC_DISTANCE` | 2-bit ACC follow distance. |
| 6 | `0b0000_1000` | `DSC_INACTIVE` | Dynamic Stability Control off / faulted. |
| 7 | `0b1111_1111` | `FUEL_LEVEL` | Whole byte — interpretation TBC. |

> *Source:* Wilhelm `ike/13.md:35–73, 156–206`.

**Example frames:**

```
# High cluster (IKE)
80 06 BF 13 03 00 00 29   # handbrake + oil-pressure fault, no gear
80 06 BF 13 03 B0 00 99   # plus PARK
80 06 BF 13 01 71 00 5A   # handbrake on, engine running, NEUTRAL
80 06 BF 13 E0 B1 00 7B   # several flags, PARK, engine running, door open

# High cluster (IKI)
80 0A BF 13 00 00 00 00 00 00 47 61   # clean, fuel=0x47
80 0A BF 13 02 B0 00 00 00 00 47 D3   # oil fault, PARK
80 0A BF 13 03 B0 00 02 00 00 47 D0   # oil + handbrake, PARK, engine failsafe
80 0A BF 13 00 B0 00 00 00 00 47 D1
80 0A BF 13 01 11 00 00 00 00 46 70   # handbrake, REVERSE, fuel=0x46
```

> *Source:* Wilhelm `ike/13.md:17–28`.

### `0x14` — Language/Region Request · `0x15` — Vehicle Config / Language & Region

**Direction:**

- `0x14`: any → IKE.
- `0x15`: IKE → `0xBF`.

The `0x15` response carries both the chassis indicator (upper nibble of `DB1`) and locale information. BlueBus's `HandlerIBusIKEVehicleConfig` (`handler_ibus.c:1087–1117`) uses this to set the vehicle-type and high/low OBC type at startup.

> *Source:* BlueBus `ibus.h:196–197`, `handler_ibus.c:1087–1117`. The full Wilhelm `ike/15.md` page should be folded in on a future pass.

### `0x16` — Odometer Request · `0x17` — Odometer

**Direction:**

- `0x16`: any → IKE.
- `0x17`: IKE → `0xBF`.

**`0x17` frame:**

```
80 0A BF 17 <m_lo> <m_mid> <m_hi> 00 1F 32 CC <xor>
```

The first three payload bytes carry the mileage **little-endian**:

```
mileage_km = (byte_hi << 16) | (byte_mid << 8) | byte_lo
```

Worked example: `80 0A BF 17 FA 34 0C 00 1F 32 CC 01`
- `0x0C << 16 = 786432`
- `0x34 << 8  = 13312`
- `0xFA       = 250`
- sum = **799 994 km**

> *Source:* Wilhelm `ike/17.md:24–43`. bimmerz has a parser at `ike/parsers.ts:113–122` but the shift operators are mis-precedenced (`payload[3] << 16 + payload[2] << 8 + payload[1]` parses as `payload[3] << (16 + payload[2])` due to JS precedence); treat the bimmerz odometer parser as broken and use the formula above.

The trailing bytes (offset 7 onward in the example) are unidentified — not interpreted by any surveyed source.

### `0x18` — Speed / RPM update

**Direction:** IKE → `0xBF`.

**Frame:**

```
80 05 BF 18 <speed_byte> <rpm_byte> <xor>
```

- `speed_byte` × 2 = vehicle speed in km/h.
- `rpm_byte` × 100 = engine RPM.

> *Sources:* BlueBus `handler_ibus.c:1051`: `uint16_t speed = pkt[IBUS_PKT_DB1] * 2;`. bimmerz `ike/parsers.ts:102–110`. Agreed.

Wilhelm lists this command in the index (`README.md:227`) but has no dedicated detail page.

### `0x19` — Temperature · `0x1D` — Temperature Request

**Direction:**

- `0x1D`: any → IKE.
- `0x19`: IKE → `0xBF`.

**`0x19` frame:**

```
80 06 BF 19 <ambient> <coolant> 00 <xor>
```

| Offset | Bytes | Field | Meaning |
|---|---|---|---|
| 4 | 1 | Ambient | Signed integer, °C. The cluster displays half-degrees on screen but transmits whole numbers, rounded down. |
| 5 | 1 | Coolant | Integer, °C. |
| 6 | 1 | NA | Always observed as `0x00`. |

**Decoding ambient (signed):** treat the byte as `int8_t`. Equivalent operation used by bimmerz: if `byte > 0x80`, subtract `0xFF` from it.

> *Source:* Wilhelm `ike/19.md:18–31`, bimmerz `ike/parsers.ts:81–97`. Agreed.

**Temperatures are always in Celsius**, even when the cluster's user-facing display is set to Fahrenheit (the conversion happens at the cluster). Locale (`0x15`) does **not** affect the wire format.

> *Source:* Wilhelm `ike/19.md:7–8`.

**Example frames:**

```
80 06 BF 19 0F 54 00 7B    # ambient +15 °C, coolant 84 °C
80 06 BF 19 17 37 00 00    # ambient +23 °C, coolant 55 °C
```

### `0x24` — OBC Text (multicast)

**Direction:** IKE → `0xE7` (displays multicast).

The cluster *eagerly* publishes OBC text at regular intervals regardless of what is being displayed — in contrast to the radio and telephone, which publish lazily on demand.

**Frame:**

```
80 <len> E7 24 <prop> 00 <string...> <xor>
```

| Offset | Bytes | Field | Meaning |
|---|---|---|---|
| 3 | 1 | `CMD` | `0x24` |
| 4 | 1 | Property ID | See [OBC property IDs](#obc-property-ids). |
| 5 | 1 | Reserved | Always `0x00` in observed traffic. |
| 6+ | variable | ASCII string | Fixed length **per property** (e.g., Time is 7 chars). Some properties use special-character bytes — see [`../charset.md`](../charset.md). |

> *Source:* Wilhelm `ike/24.md:18–58`.

**Example frames:**

```
80 0C E7 24 01 00 20 38 3A 33 31 50 4D 73    # Time:        " 8:31PM"
80 0F E7 24 02 00 2D 2D 2F 2D 2D 2F 32 30 32 30 4E   # Date:    "--/--/2020"
80 0A E7 24 03 00 2B 32 34 2E 35 7C           # Temperature: "+24.5"
80 0C E7 24 06 00 2D 2D 2D 20 4B 4D 20 62    # Range:        "--- KM "
80 0D E7 24 07 00 33 34 33 38 20 4B 4D 20 43 # Distance:    "3438 KM "
80 0C E7 24 08 00 2D 2D 3A 2D 2D 20 20 7D    # Arrival:      "--:-- "
```

> *Source:* Wilhelm `ike/24.md, ike/properties.md`.

### `0x2A` — OBC Status (multicast)

**Direction:** IKE → `0xE7`.

A fixed two-byte bitfield indicating the on/off state of OBC functions. 1 = on, 0 = off.

| Byte | Bit | Mask | Name | Meaning |
|---|---|---|---|---|
| 4 (byte 1) | 5 | `0x20` | MEMO | Memo function on. |
| 4 | 3 | `0x08` | TIMER | OBC timer running. |
| 4 | 1 | `0x02` | LIMIT | Speed-limit warning enabled. |
| 5 (byte 2) | 6 | `0x40` | CODE | Code (immobiliser-style) locked. |
| 5 | 5 | `0x20` | AUX_HEATING | Aux. heating on. |
| 5 | 4 | `0x10` | AUX_TIMER_2 | Aux. timer 2 active. |
| 5 | 3 | `0x08` | AUX_VENTILATION | Aux. ventilation on. |
| 5 | 2 | `0x04` | AUX_TIMER_1 | Aux. timer 1 active. |

> *Source:* Wilhelm `ike/2a.md`.

### `0x53` / `0x54` / `0x55` — Redundant data choreography

A three-step exchange used to fetch and replicate the long-term vehicle state (VIN, mileage, service intervals) between the IKE and the LCM.

- `0x53` — request, **any → IKE**.
- `0x54` — response, **IKE → requester**, containing 14+ bytes of packed state.
- `0x55` — replicate, **IKE → broadcast**, distributing the data to other modules.

The detailed choreography lives in [`../subsystems/obc-display.md`](../subsystems/obc-display.md). bimmerz's `parseInstrumentClusterRedundantDataResponse` (`ike/parsers.ts:5–22`) is partly broken — the shift operators have mis-precedenced expressions; don't trust the offsets directly.

> *Sources:* Wilhelm `ike/53.md`, `ike/54.md`, `ike/55.md`; BlueBus `ibus.h:218–219`; bimmerz `ike/builders.ts:5–17` (request) and `ike/parsers.ts:5–22` (response, buggy).

### `0x57` — Cluster Buttons

**Direction:** IKE → various (typically `0xBF`).

Carries cluster-button events (BC button on the stalk, reset, etc.). Detail in Wilhelm `ike/57.md`; not folded into this draft.

### `0x40` — OBC Input · `0x41` — OBC Control · `0x42` — OBC Remote

These are the **GT → IKE** counterparts to `0x24` and `0x2A`. Together they allow the GT or BMBT to set OBC properties (e.g., user-entered time) and to drive functional state (start a timer, recalculate consumption, set a speed limit).

`0x41` byte 2 is a one-hot control bitfield:

| Mask | Action |
|---|---|
| `0b0000_0001` | Request string (will be answered by `0x24`). |
| `0b0000_0010` | Request boolean (will be answered by `0x2a`). |
| `0b0000_0100` | On / Start. |
| `0b0000_1000` | Off / Stop. |
| `0b0001_0000` | Recalculate (for Consumption 1/2 and Avg. Speed). |
| `0b0010_0000` | Set as current speed (for Limit only). |

> *Source:* Wilhelm `ike/properties.md:110–169` (sections "Input Boolean" and per-flag detail).

Full choreography lives in [`../subsystems/obc-display.md`](../subsystems/obc-display.md).

---

## Cross-cutting subsystems

- [ignition-state](../subsystems/ignition-state.md) — IKE is the canonical source of ignition state (`0x11`). Almost every module on the bus reacts to it; module wake order depends on it.
- [obc-display](../subsystems/obc-display.md) — the IKE↔GT/BMBT cooperation that drives the OBC menu, text rendering, and the redundant-data exchange.
- [`../protocol/addressing.md`](../protocol/addressing.md#the-gateway-ike-bridges-k-bus-and-i-bus) — the IKE is the K↔I bus gateway on E38/E39/E53 High.

---

## Variants and chassis differences

| Variant | Identifier | Chassis | Wire-format effects |
|---|---|---|---|
| KOMBI (low) | `IBUS_IKE_TYPE_LOW 0x00` (BlueBus runtime). Vehicle-config nibble `0x2` or `0xA`/`0xF`. | E46, E83/E85/E86, R50 | Reduced OBC: many `0x24` / `0x2A` properties not emitted. `0x13` payload is 3 bytes. |
| IKE (high, early) | `IBUS_IKE_TYPE_HIGH 0x0F` (BlueBus). Vehicle-config nibble `0x0`. Produced pre-Oct 2001. | E38, E39, E53 High | `0x13` payload is 3 bytes. Full OBC. |
| IKI (high, late) | Same nibble as IKE (`0x0`). Distinguished only by `0x13` payload length (7 bytes). | E38, E39 produced ~Oct 2001 onwards; some E53 | `0x13` payload is 7 bytes; bytes 4–7 carry engine, ACC, DSC, fuel level. |

> *Source:* BlueBus `ibus.h:565–566`, `handler_ibus.c:1087–1117` for the low/high distinction; Wilhelm `ike/13.md:5–9` for the IKE/IKI 3-byte→7-byte transition.

**Practical detection:**

- **Chassis type:** read the upper nibble of `0x15`-DB1 at startup.
- **Cluster sub-variant (IKE vs IKI):** observe the `LEN` field of a `0x13` frame. `LEN=0x06` ⇒ IKE; `LEN=0x0A` ⇒ IKI.

---

## Open questions / TBC

- **`IBUS_IKE_GEAR_FIRST 0x10` in BlueBus** disagrees with Wilhelm/bimmerz (`0x20`). Almost certainly a typo. Needs a real traffic capture from an automatic in 1st gear hold to settle. *(See conflict block above.)*
- **`0x14` / `0x15` byte format** is not fully documented here. BlueBus's `HandlerIBusIKEVehicleConfig` (`handler_ibus.c:1087–1117`) reads only the upper nibble of `DB1`; the remaining bytes carry locale information per Wilhelm but haven't been folded in.
- **`0x18` Speed/RPM** has no dedicated Wilhelm page despite appearing in the README index. Confirm: are there other byte slots in the frame beyond `DB1` (speed) and `DB2` (rpm)?
- **`0x19` "NA" trailing byte** is always observed as `0x00`. Wilhelm hedges with "I've not seen any logs to suggest this byte has any use" (`ike/19.md:39–41`). Maintain the field as opaque until evidence of otherwise.
- **`0x17` trailing bytes** (offsets 7+) are unidentified. Could be timestamp, service interval, or filler. Worth a focused investigation.
- **Variant detection at runtime** — BlueBus reads `0x15` upper nibble. Is there an earlier signal that lets a module make a guess before the IKE has responded? The Pong (`0x02`) does not distinguish variants.
- **bimmerz parser bugs** — both `parseInstrumentClusterRedundantDataResponse` and `parseInstrumentClusterOdometerResponse` have JavaScript operator-precedence bugs (`a << 8 + b` parses as `a << (8 + b)`). The constants are correct, but bimmerz output for these specific commands cannot be trusted.

---

## Sources

### BlueBus

- `firmware/application/lib/ibus.h:32` — address constant.
- `firmware/application/lib/ibus.h:192–216` — IKE command IDs and CCM / numeric-write sub-commands.
- `firmware/application/lib/ibus.h:561–566` — vehicle-type and cluster-type constants.
- `firmware/application/lib/ibus.h:567–576` — gear-position constants.
- `firmware/application/handler/handler_ibus.c:866–1034` — `HandlerIBusIKEIgnitionStatus` (ignition-state-transition logic and the side effects BlueBus runs on each transition).
- `firmware/application/handler/handler_ibus.c:1047–1075` — `HandlerIBusIKESpeedRPMUpdate` (speed = `DB1 * 2`; RPM = `DB2 * 100`; comfort-lock at 10 / 20 km/h).
- `firmware/application/handler/handler_ibus.c:1087–1117` — `HandlerIBusIKEVehicleConfig` (chassis detection from `0x15`-DB1 upper nibble).

### Wilhelm-docs

- `02.md:131` — IKE announce frame.
- `ike/10.md`, `ike/11.md` — ignition request and broadcast.
- `ike/12.md`, `ike/13.md` — sensor request and the 3-byte / 7-byte sensor frame (IKE vs IKI).
- `ike/14.md`, `ike/15.md` — language & region (page not folded into this draft).
- `ike/16.md`, `ike/17.md` — odometer.
- `ike/19.md`, `ike/1d.md` — temperature.
- `ike/24.md` — OBC text output.
- `ike/2a.md` — OBC status.
- `ike/properties.md` — the canonical OBC property table and per-command applicability matrix.
- `ike/53.md`, `ike/54.md`, `ike/55.md` — redundant-data choreography.
- `ike/57.md` — cluster buttons.
- `ike/charset/` — special-character encoding for OBC text (referenced from [`../charset.md`](../charset.md)).

### bimmerz

- `packages/bus/src/devices.ts:44` — address.
- `packages/commands/src/devices/ike/types.ts:1–168` — type definitions for ignition states, sensor flags, gears, OBC properties, vehicle types. **Note:** the `VEHICLE_TYPES` enum covers only two outcomes; bimmerz mis-classifies E8X and R50 vehicles.
- `packages/commands/src/devices/ike/parsers.ts:1–157` — payload parsers. **Note:** the redundant-data and odometer parsers contain JS operator-precedence bugs; do not trust their output.
- `packages/commands/src/devices/ike/builders.ts:1–108` — payload builders (request templates for `0x10`, `0x12`, `0x16`, `0x1D`, `0x53`).
