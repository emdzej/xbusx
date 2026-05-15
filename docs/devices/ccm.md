# CCM (0x30) — Check Control Module

**Status:** Stub.

**Role:** The check-control module — aggregates fault status from lamp / fluid / brake sensors and writes user-visible warning messages to the cluster. On early E38s the CCM is a discrete module at `0x30`; on later chassis the CCM function is absorbed into the IKE high cluster, but `0x30` may still appear in traffic for backward compatibility.

**Buses:** K. **Chassis coverage:** E38.

## Address

`0x30`. *Sources:* BlueBus `ibus.h:17`, Wilhelm `README.md:121`, Wilhelm `address.md:32`, bimmerz `devices.ts:25` — agreed.

Wilhelm `README.md` marks bus as `I`, `address.md` marks `K`. **Resolution: K** (E38-era body module).

## Announce / Pong

```
30 04 BF 02 01 88
```

> *Source:* Wilhelm `02.md:127`.

## Messages where CCM is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x1A` | Check Control Message | IKE `0x80` | Write a CCM warning text to the cluster display (e.g., "Check Engine Oil"). Variants: clear, recall, persist, alert. | W `lcm/1a.md` · BB `ibus.h:205, 207–208` |
| `0x51` | Check Control Status | broadcast | 1-byte bitfield: brake fluid / seatbelt / key-in-ignition / washer / oil-level. Used on KOMBI-cluster chassis where these flags drive cluster warning lamps. | W `lcm/51.md` |

The CCM also processes lamp-fault flags carried by the LCM's `0x5B` (cluster indicators) — see [`lcm.md`](lcm.md#0x5b--cluster-indicators).

## Per-message detail

### `0x1A` — Check Control Message

Display-type byte values from Wilhelm `lcm/1a.md:29–42`:

| Value | Meaning |
|---|---|
| `0x30` | Clear (`IBUS_DATA_IKE_CCM_WRITE_CLEAR_TEXT`). |
| `0x35` | Recall. |
| `0x36` | Persist — priority 1, stays on (`IBUS_DATA_IKE_CCM_WRITE_PERSIST_TEXT`). |
| `0x37` | Alert — priority 2, 20-second auto-clear, gong. |

> *Source:* BlueBus `ibus.h:207–208` for the clear / persist constants; Wilhelm `lcm/1a.md:29–42` for the full set.

### `0x51` — Check Control Status

See [`lcm.md`](lcm.md#0x51--check-control-status-1-byte-low-cluster-chassis-only) — the bit field is documented there since both the CCM (early E38) and LCM (later chassis) can emit this frame.

## Cross-cutting subsystems

- The CCM closes the loop between the LCM's lamp-fault flags (`0x5B`) and the user-visible cluster warning. On chassis without a discrete CCM, the IKE generates `0x1A` internally based on the same `0x5B` flags.

## Open questions / TBC

- **Per-byte format of `0x1A` body.** The 20-character string payload's encoding and special-character handling is not fully documented.
- **CCM vs LCM-CCM-integration boundary.** On chassis somewhere between "discrete CCM" and "integrated CCM", which module emits `0x1A`? Likely chassis-dependent.

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:17` — address.
- `firmware/application/lib/ibus.h:205, 207–208` — `IBUS_CMD_IKE_CCM_WRITE_TEXT 0x1A` and display-type constants.

### Wilhelm-docs
- `lcm/1a.md` — check-control-message format.
- `lcm/51.md` — check-control status format.
- `02.md:127` — announce frame.
- `README.md:121` — device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:25` — address.
