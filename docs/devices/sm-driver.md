# Seat Memory — Driver (0x71 / 0x72)

**Status:** Stub.

**Role:** Driver-side seat-position memory. Stores and recalls preset seat positions (cushion, backrest, headrest, steering-column, mirrors) per key.

**Buses:** K. **Chassis coverage:** Optional across most chassis. The address used has evolved across generations.

**Variants:** The address `0x71` and `0x72` were both used at different times for the driver seat memory. Address allocation also overlaps with mirror memory on some chassis — see [Address](#address) below.

---

## Address

The driver-seat-memory module has occupied **two addresses** across chassis generations, and on some chassis `0x71` was reassigned to mirror memory instead.

### `0x71`

| Source | Claim | Cite |
|---|---|---|
| Wilhelm `README.md` | **SMF — Seat Memory, Driver** on E31. | `README.md:142` |
| Wilhelm `address.md` | **Mirror Memory: Driver (ZKE5)** — a different device. | `address.md:54` |

**Resolution:** Chassis-dependent. On E31 the `0x71` device is the seat memory; on ZKE5 chassis (E38, E39, etc.) the same address hosts a mirror-memory module instead.

### `0x72`

`0x72` — Driver Seat Memory on E46 / E53 / later chassis.

> *Sources:* BlueBus `ibus.h:28` (`IBUS_DEVICE_SM0`), Wilhelm `README.md:143`, Wilhelm `address.md:55`, bimmerz `devices.ts:40` (`SM`) — agreed.

The BlueBus name **SM0** ("Seat Memory — 0") matches Wilhelm's **SMF** and bimmerz's **SM**.

---

## Messages

No per-command documentation in surveyed sources.

> *TBC:* Capture seat-position store and recall frames. Likely keyed off the inserted key (EWS) and the door-state (driver door open) frames.

## Cross-cutting subsystems

- Companion modules: passenger mirror memory at `0x51` ([`spmbt.md`](spmbt.md)), passenger seat memory at `0xDA` ([`smb.md`](smb.md)).
- Key-keyed recall depends on the EWS authenticating the inserted key — see [`ews.md`](ews.md).

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:28` — address `0x72` (`IBUS_DEVICE_SM0`).

### Wilhelm-docs
- `README.md:142–143` — device-table entries for `0x71` (E31) and `0x72` (E46+).
- `address.md:54–55` — older device-table entries.

### bimmerz
- `packages/bus/src/devices.ts:40` — address `0x72` (`SM`).
