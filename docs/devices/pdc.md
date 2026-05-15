# PDC (0x60) — Park Distance Control

**Status:** Draft.

**Role:** The park-distance-control module — drives the parking-assist sensors (typically four front, four rear ultrasonic sensors), measures distance to obstacles in centimetres, and reports per-sensor distances to whichever module renders them (cluster / MID / GT). Activated automatically when reverse gear is engaged or via a dedicated button.

**Buses:** K/I.

**Chassis coverage:** Optional across most chassis. Where present, the PDC sits on the body-electronics group with the LCM and GM.

**Variants:** None known.

---

## Address

`0x60`. *Sources:* BlueBus `ibus.h:25`, Wilhelm `README.md:135`, bimmerz `devices.ts:36` — agreed.

---

## Messages where PDC is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x07` | PDC status | broadcast | Activation / deactivation status. `IBUS_PDC_STATUS_INACTIVE 0`, `IBUS_PDC_STATUS_ACTIVE 1`. | BB `ibus.h:113–114, 225` (`IBUS_CMD_PDC_STATUS`) |
| `0xA0` | Sensor distances | broadcast | 8 per-sensor distance bytes (cm). `0xFF` = "no obstacle". | BB `ibus.h:227` (`IBUS_CMD_PDC_SENSOR_RESPONSE`) |

---

## Messages where PDC is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x1B` | Sensor request | any | Ask PDC to re-broadcast distances. | BB `ibus.h:226` (`IBUS_CMD_PDC_SENSOR_REQUEST`) |
| `0x5A` | Cluster indicators request | (occasionally) | PDC has been observed *sending* `0x5A` to LCM (`0xD0`) as well — purpose unclear; possibly a wake/probe. | W `lcm/5a.md` |

---

## Sensor layout

The `0xA0` sensor response carries eight distance bytes in fixed positions, mirrored by BlueBus's `IBUSPDCStatus_t` struct (`ibus.h:695–707`):

| Position | Sensor | Notes |
|---|---|---|
| front-left | `frontLeft` | Outer front-left. |
| front-centre-left | `frontCenterLeft` | Inner front-left. |
| front-centre-right | `frontCenterRight` | Inner front-right. |
| front-right | `frontRight` | Outer front-right. |
| rear-left | `rearLeft` | Outer rear-left. |
| rear-centre-left | `rearCenterLeft` | Inner rear-left. |
| rear-centre-right | `rearCenterRight` | Inner rear-right. |
| rear-right | `rearRight` | Outer rear-right. |

Each byte is a distance in **centimetres**, with `0xFF` meaning "no obstacle detected".

BlueBus's distance-rendering logic (`handler_ibus.c:1581–1708`):

- Any byte `< 5` is clamped to `0` ("contact").
- The minimum byte across all sensors drives the cluster's numeric display.
- A separate text-format path renders all four sensors of the dominant side on the high-cluster OBC line: `F:NN R:NN NN NN NNcm`.
- Unit conversion (cm → in) is applied based on `ConfigGetDistUnit()`.

---

## Bit fields and enums

| Constant | Value | Meaning |
|---|---|---|
| `IBUS_PDC_DEFAULT_SENSOR_VALUE` | `0xFF` | "No obstacle" sentinel. |
| `IBUS_PDC_STATUS_INACTIVE` | `0` | PDC not actively measuring. |
| `IBUS_PDC_STATUS_ACTIVE` | `1` | PDC active. |

> *Source:* BlueBus `ibus.h:113–114, 403`.

---

## Per-message detail

### `0x07` — PDC status

```
60 04 BF 07 <status> <xor>
```

`<status>` is `0` (inactive) or `1` (active).

### `0x1B` — Sensor request

```
<src> 03 60 1B <xor>
```

Sent by any module that wants up-to-date distances. PDC responds with `0xA0`.

### `0xA0` — Sensor response

```
60 0B BF A0 <fl> <fcl> <fcr> <fr> <rl> <rcl> <rcr> <rr> <xor>
```

> *Source:* Frame layout reconstructed from BlueBus `IBUSPDCStatus_t` (`ibus.h:695–707`) and `HandlerIBusPDCSensorUpdate` (`handler_ibus.c:1581–1708`).

---

## Cross-cutting subsystems

- **Reverse-gear activation** — PDC is automatically enabled when the IKE sensor frame (`0x13`) shows the gear in REVERSE. See [`ike.md`](ike.md#0x12--sensors-request--0x13--sensors).
- **Volume lower on reverse** — BlueBus has a comfort feature that lowers the radio volume when PDC activates (`handler_ibus.c:1727–1730`). The PDC status frame is what triggers it.
- BMW post-2008 chassis introduced a different PDC distance encoding (BCD with bit-mask multiplier) — fixed in BlueBus v1.4.33. Document if observing modern E8X traffic.

---

## Open questions / TBC

- **Wilhelm coverage gap.** No `pdc/` directory exists in `ext-wilhelm-docs`. The frame layouts above are reconstructed from BlueBus alone. Capture real PDC traffic to confirm byte order and edge cases.
- **PDC → LCM `0x5A` purpose.** Wilhelm `lcm/5a.md` notes the request from PDC but admits the rationale is unclear.
- **Sub-second update cadence.** What's the actual PDC report frequency under active obstacle approach? Not documented.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:25` — address.
- `firmware/application/lib/ibus.h:112–114` — status enum and "no obstacle" constant.
- `firmware/application/lib/ibus.h:225–227` — `IBUS_CMD_PDC_STATUS / SENSOR_REQUEST / SENSOR_RESPONSE`.
- `firmware/application/lib/ibus.h:403` — `IBUS_PDC_DEFAULT_SENSOR_VALUE 0xFF`.
- `firmware/application/lib/ibus.h:695–707` — `IBUSPDCStatus_t`.
- `firmware/application/handler/handler_ibus.c:1581–1708` — `HandlerIBusPDCSensorUpdate` (rendering logic, unit conversion).
- `firmware/application/handler/handler_ibus.c:1720–1742+` — `HandlerIBusPDCStatus` (comfort volume-lower wiring).

### Wilhelm-docs
- `README.md:135` — device-table entry.
- `lcm/5a.md` — mentions PDC as observed `0x5A` sender.

### bimmerz
- `packages/bus/src/devices.ts:36` — address.
