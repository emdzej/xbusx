# STH (0x6B) — Auxiliary Heater ("Webasto")

**Status:** Stub.

**Role:** Stand-alone auxiliary heater — Standheizung. Heats the cabin and / or coolant before engine start, on a timer or remotely triggered. Webasto is the dominant aftermarket supplier; "Webasto" is often used colloquially as a synonym.

**Buses:** K. **Chassis coverage:** Optional across most chassis.

## Address

`0x6B`. *Sources:* Wilhelm `README.md:140`, Wilhelm `address.md:52` (hedged: "Auxiliary Heating 'Webasto' (D-Bus?)"), bimmerz `devices.ts:62` — agreed on address.

Wilhelm `address.md` hedges with `(D-Bus?)`; treat as **K** per Wilhelm `README.md`.

## Messages

No per-command documentation in surveyed sources.

> *TBC:* The STH likely has both on-bus traffic (controlled from the IKE OBC aux-heater menu) and diagnostic-protocol traffic (out of scope).

## Cross-cutting subsystems

- OBC aux-heater properties (`0x11`, `0x12` — see [`ike.md`](ike.md#obc-property-ids)) interact with the STH.
- The IKE sensor frame's `AUX_HEAT` bit (`0x13` byte 3, `0x04`) likely reflects the STH's running state — see [`ike.md`](ike.md#byte-3--aux).

## Sources

### Wilhelm-docs
- `README.md:140` — device-table entry.
- `address.md:52` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:62` — address.
