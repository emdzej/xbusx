# EKM (0x69) — Electronic Body Module (E31)

**Status:** Stub.

**Role:** The body-electronics central control unit specific to the **E31** chassis — predecessor to the ZKE used on later chassis. Functionally similar to the GM (`0x00`) but addressed differently for historical reasons.

**Buses:** K. **Chassis coverage:** E31.

## Address

`0x69`. *Sources:* Wilhelm `README.md:138`, Wilhelm `address.md:50` — agreed. BlueBus and bimmerz do not declare EKM at `0x69`. (bimmerz has `EKM 0x02` — see [`devices/README.md`](README.md#bimmerz-one-off-outliers) for that disagreement.)

## Messages

No per-command documentation in surveyed sources. The EKM likely emits a subset of the door / lid / window state frames the GM emits on later chassis.

## Cross-cutting subsystems

- E31-era counterpart to the GM. See [`gm.md`](gm.md) for the analogous protocol on later chassis.

## Sources

### Wilhelm-docs
- `README.md:138` — device-table entry.
- `address.md:50` — older device-table entry.
