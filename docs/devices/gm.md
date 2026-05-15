# GM (0x00) — General Module / Body Electronics (ZKE)

**Status:** Draft.

**Role:** The body-electronics control unit. Handles central locking, window and sunroof control, anti-theft (DWA) integration, remote key entry, comfort lighting (hazards/turn signals/beams), and exposes door / lid / window / sunroof state to the rest of the bus. BMW's internal name is **ZKE** ("Zentrale Karosserie-Elektronik"). The GM is the single most-cited body module across the address space.

**Buses:** K.

**Chassis coverage:** All. Address `0x00` is universal across BMW chassis that use the I/K-bus.

**Variants:** Many. The GM has gone through **ZKE3** (with sub-variants GM1, GM4, GM5, GM6), **ZKE4**, **ZKE5** (with sub-variant ZKE5_S12), and **ZKEBC1** generations. Variant affects on-the-wire door-lock command semantics — see [Variants](#variants-1) below.

---

## Address

`0x00`. *Sources:* BlueBus `ibus.h:14`, Wilhelm `README.md:115`, bimmerz `devices.ts:21` — agreed.

---

## Announce / Pong

```
00 04 BF 02 01 B8
```

The GM announces with the plain `0x02 0x01` pattern (no variant signature byte). Variant detection has to come from elsewhere — typically from observing which door-lock command set the GM responds to, or by querying the GM diagnostically.

> *Source:* Wilhelm `02.md:125`.

---

## Variants

| Constant | Value | Generation | Notes / chassis association |
|---|---|---|---|
| `IBUS_GM_ZKE3_GM1` | 1 | ZKE III gen 1 | Baseline 4-door (E39 Touring 6/97 reference). Uses 4-byte job requests. |
| `IBUS_GM_ZKE3_GM4` | 2 | ZKE III | E31 / E38 platforms. Distinct lock/unlock job codes from GM1. |
| `IBUS_GM_ZKE3_GM5` | 3 | ZKE III | E46 / E53 (touring). Supports split lock-high / lock-low. |
| `IBUS_GM_ZKE3_GM6` | 4 | ZKE III | E46 / E53 sedan variant. Lock-all only (no split). |
| `IBUS_GM_ZKE4` | 5 | ZKE IV | Reserved in BlueBus; no protocol documentation found in any source. |
| `IBUS_GM_ZKE5` | 6 | ZKE V | E46 / E8X. **3-byte** diagnostic-job requests. Unified lock/unlock semantics. |
| `IBUS_GM_ZKE5_S12` | 7 | ZKE V | S12 sub-variant. Undocumented. |
| `IBUS_GM_ZKEBC1` | 8 | ZKE BC1 | Highly integrated post-CAN variant. No I/K-bus protocol coverage. |
| `IBUS_GM_ZKEBC1RD` | 9 | ZKE BC1 | Retrofit/diagnostic variant. Undocumented. |
| `IBUS_GM_IDENT_ERR` | 10 | — | Variant detection failed (BlueBus sentinel). |

> *Source:* BlueBus `ibus.h:580–589`. The protocol-relevant split for our purposes is **ZKE3** (uses 4-byte job requests with sub-module byte) vs **ZKE5** (uses 3-byte job requests). The cross-cutting subsystem page *subsystems/door-locks-zke3-vs-zke5 (planned)* will document the full choreography.

bimmerz uses a coarser split: it branches purely on vehicle type (E46/Z4 vs E38/E39/E53) at `gm/builders.ts:191–227`, which approximates ZKE3 ≈ E38/E39/E53 and ZKE5 ≈ E46/Z4 — but the approximation is imperfect (an E53 with a ZKE3-GM5 has different commands from an E38 with a ZKE3-GM1).

---

## Messages where GM is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x72` | Remote key entry | broadcast | Fob lock / unlock / trunk-release / panic events; triggers welcome-home lights on receiver side. | BB `ibus.h:151` (`IBUS_CMD_GM_REMOTE_KEY_ENTRY`) · W index `README.md:279` |
| `0x76` | Visual indicators | `BF` (broadcast) | 1-byte bitfield: hazards / turn signals / low beams / high beams flashing control. | W `gm/76.md` |
| `0x7A` | Door / lid status | `BF` (broadcast) | 2-byte bitfield: per-door open state, central-locking state, interior lamp, windows, sunroof, front/rear lid, boot release. | W `gm/7a.md` · BB `ibus.h:150` (`IBUS_CMD_GM_DOORS_FLAPS_STATUS_RESP`) |

---

## Messages where GM is `DST`

GM is the destination for **diagnostic-job requests** that exercise its lock / unlock / window functions. These are encoded as `IBUS_CMD_DIA_JOB_REQUEST 0x0C` frames with the command-set selected by the GM variant (ZKE3 vs ZKE5).

### ZKE3 job codes (4-byte payload: `0C 00 <job> 01`)

| Job | Constant | Action | Applies to |
|---|---|---|---|
| `0x0B` | `IBUS_CMD_ZKE3_GM1_JOB_CENTRAL_LOCK` | Press centre-lock button | GM1, GM4 |
| `0x14` | `IBUS_CMD_ZKE3_GM5_JOB_CENTRAL_LOCK` | Press centre-lock button | GM5, GM6 |
| `0x40` | `IBUS_CMD_ZKE3_GM5_JOB_LOCK_HIGH` | Lock front doors only | GM5, GM6 |
| `0x41` | `IBUS_CMD_ZKE3_GM5_JOB_LOCK_LOW` | Lock rear doors only | GM5, GM6 |
| `0x42` | `IBUS_CMD_ZKE3_GM5_JOB_UNLOCK_HIGH` | Unlock front doors | GM5, GM6 |
| `0x43` | `IBUS_CMD_ZKE3_GM5_JOB_UNLOCK_LOW` | Unlock rear doors | GM5, GM6 |
| `0x88` | `IBUS_CMD_ZKE3_GM1_JOB_LOCK_ALL` | Lock all doors and trunk | GM1, GM4 |
| `0x90` | `IBUS_CMD_ZKE3_GM5_JOB_LOCK_ALL` | Lock all doors and trunk | GM5, GM6 |

> *Source:* BlueBus `ibus.h:154–161`.

### ZKE5 job codes (3-byte payload: `0C <job> 01`)

| Job | Constant | Action |
|---|---|---|
| `0x03` | `IBUS_CMD_ZKE5_JOB_CENTRAL_LOCK` | Press centre-lock button |
| `0x06` | `IBUS_CMD_ZKE5_JOB_UNLOCK_TRUNK` | Unlock trunk only |
| `0x37` | `IBUS_CMD_ZKE5_JOB_UNLOCK_LOW` | Unlock rear doors |
| `0x45` | `IBUS_CMD_ZKE5_JOB_UNLOCK_ALL` | Unlock all doors and trunk |
| `0x4F` | `IBUS_CMD_ZKE5_JOB_LOCK_ALL` | Lock all doors and trunk |

> *Source:* BlueBus `ibus.h:163–167`.

#### `IBUS_CMD_ZKE5_JOB_LOCK_ALL` — value disagreement

| Source | Claim | Cite |
|---|---|---|
| BlueBus | `0x4F` | `ibus.h:164` |
| bimmerz | `0x34` (in `ZKE5_LOCK_ALL` enum) | `gm/types.ts:10` |
| Wilhelm | Not documented in `gm/` directory. | — |

**Resolution:** Use **`0x4F`** (BlueBus). The BlueBus value is used in production firmware on real E46 vehicles. The bimmerz `0x34` value is not corroborated by any other source and is likely a transcription error.
**Why:** BlueBus precedence; lack of independent confirmation for the bimmerz value; no observed-traffic capture is available to settle the matter directly. Flag this when emitting lock-all frames on an E46 — start with `0x4F` and verify with a sniff.

### Other DST messages

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x79` | Door / lid status request | any | Asks GM to re-broadcast `0x7A`. | W `gm/79.md` |

---

## Bit fields and enums

### `0x7A` — Door / lid status (2 bytes)

**Byte 1:**

| Bit / mask | Name | Notes |
|---|---|---|
| `0x01` | Driver door open | |
| `0x02` | Passenger door open | |
| `0x04` | Rear-RH door open | |
| `0x08` | Rear-LH door open | |
| `0x10` | Central locking — bit A | See central-locking encoding below. |
| `0x20` | Central locking — bit B | |
| `0x40` | Interior lamp on | |
| `0x80` | (unused / reserved) | |

**Central-locking encoding (bits 4–5 of byte 1):**

| Value | Meaning |
|---|---|
| `0x10` | Unlocked |
| `0x20` | Single-locked |
| `0x30` | Double-locked (arrested) |

**Byte 2:**

| Bit / mask | Name |
|---|---|
| `0x01` | Driver window open |
| `0x02` | Passenger window open |
| `0x04` | Rear-RH window open |
| `0x08` | Rear-LH window open |
| `0x10` | Sunroof open |
| `0x20` | Rear lid (hatch) open |
| `0x40` | Front lid (hood) open |
| `0x80` | Boot remote-release triggered |

> *Source:* Wilhelm `gm/7a.md:27–40, 67`. The reference frame is from an E39 Touring (6/97), so the encoding is canonically ZKE3-GM1. Later ZKE variants may rearrange bits — flag in the open-questions section.

### `0x76` — Visual indicators (1 byte)

| Mask | Name | Meaning |
|---|---|---|
| `0x01` | `VISUAL_HAZARDS` | Hazard warning flashers |
| `0x02` | `VISUAL_TURN_SIGNALS` | Turn-signal flashing (single or double cycle per GM coding) |
| `0x04` | `VISUAL_LOW_BEAMS` | Low-beam flash |
| `0x08` | `VISUAL_HIGH_BEAMS` | High-beam flash |
| `0x80` | (unknown) | Possibly acoustic siren; not modelled in bimmerz; flagged in Wilhelm. |

> *Source:* Wilhelm `gm/76.md:22–31, 53–55`.

### `0x72` — Remote key entry

The BlueBus handler decodes a one-byte action field as `(pkt[DB1] >> 4) & 0x0F`, with `IBUS_GM_REMOTE_KEY_UNLOCK 0x02` and `IBUS_GM_REMOTE_KEY_LOCK 0x01` as known values (`ibus.h:152–153`). Full enumeration of action values is not documented in any source.

---

## Per-message detail

### `0x7A` — Door / lid status response

**Direction:** GM → `BF` (broadcast).

**Frame:**

```
00 05 BF 7A <byte1> <byte2> <xor>
```

**Example frames:**

```
00 05 BF 7A 51 1F 8E   # driver door open, central single-locked, all windows closed (byte2 = all windows + sunroof)
00 05 BF 7A 30 1F EF   # all doors closed, central unlocked, interior lamp on
00 05 BF 7A 54 30 A4   # several flags set; rear/front lids closed, boot release triggered
```

> *Source:* Wilhelm `gm/7a.md:19–23`.

### `0x79` — Door / lid status request

**Direction:** any → GM.

```
<src> 03 00 79 <xor>
```

Example: `30 03 00 79 4A` (CCM `0x30` querying GM).

> *Source:* Wilhelm `gm/79.md:11–14`.

### `0x76` — Visual indicators

**Direction:** any → GM (`0xBF` broadcast destination on observed frames).

```
00 04 BF 76 <bitfield> <xor>
```

Examples:

```
00 04 BF 76 02 CF      # activate turn signals
00 04 BF 76 00 CD      # deactivate indicators
```

> *Source:* Wilhelm `gm/76.md:14–17`.

### `0x72` — Remote key entry

**Direction:** GM → broadcast (consumed by LCM, EWS, BlueBus, etc.).

The DB1 byte's upper nibble carries the action; the lower nibble has not been fully characterised in surveyed sources. Real-frame examples are not in Wilhelm's `gm/` directory; capture and characterise them in a future pass.

---

## Cross-cutting subsystems

- *subsystems/door-locks-zke3-vs-zke5 (planned)* — The full ZKE3 vs ZKE5 split with BlueBus's vehicle-type branching is documented there.
- *subsystems/ignition-state (planned)* — The GM reacts to ignition transitions, in particular to KL-30 transitions where comfort-unlock behaviour is triggered.
- The **LCM** consumes `0x72` (remote key entry) to trigger welcome-home / follow-me-home lights — see [`lcm.md`](lcm.md).
- The **EWS** consumes GM's central-locking state to arm / disarm the engine immobiliser — see *[ews](ews.md) (planned)*.

---

## Open questions / TBC

- **`0x7A` bitfield layout across ZKE variants.** Wilhelm's reference frame is from a ZKE3-GM1 E39 (6/97). BlueBus's handler treats the byte layout identically across variants (`handler_ibus.c:742–749`) without validating the variant — that may be fine, or it may be silently mis-decoding ZKE5 traffic. Capture and verify on an E46.
- **`IBUS_CMD_ZKE5_JOB_LOCK_ALL` value** — `0x4F` per BlueBus vs `0x34` per bimmerz. Resolve with traffic capture. *(Conflict block above.)*
- **`0x80` bit of `0x76`** — Wilhelm flags it as "unknown", possibly an acoustic indicator. Not modelled by any source. Document if traffic surfaces it.
- **ZKE4 / ZKEBC1 / ZKEBC1RD command sets** — BlueBus reserves the variant constants but no source documents the on-the-wire commands. Likely post-CAN-transition modules.
- **`0x72` action values** — only `0x01` (lock) and `0x02` (unlock) are named. Trunk release, panic, comfort open, comfort close are all known fob actions; their `0x72` byte values are undocumented in any surveyed source.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:14` — address constant.
- `firmware/application/lib/ibus.h:148–167` — GM and ZKE3/ZKE5 command and job constants.
- `firmware/application/lib/ibus.h:580–589` — variant enum.
- `firmware/application/lib/ibus.c` — `IBusCommandGM*` encoder functions (line ranges ~2001–2230, identified by agent survey).
- `firmware/application/handler/handler_ibus.c:711–767` — `HandlerIBusGMDoorsFlapsStatus`, `HandlerIBusGMRemoteKey`, comfort-unlock / welcome-light wiring.

### Wilhelm-docs
- `gm/76.md` — visual-indicators bitfield, examples.
- `gm/79.md` — door / lid status request.
- `gm/7a.md` — door / lid status response, including ZKE3-GM1 reference frames and central-locking semantics.
- `02.md:125` — announce frame.
- `README.md:115` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:21` — address.
- `packages/commands/src/devices/gm/types.ts` — ZKE5 lock-command enum (note value conflict for `LOCK_ALL`).
- `packages/commands/src/devices/gm/builders.ts:191–227` — vehicle-type-aware lock / unlock builders.
