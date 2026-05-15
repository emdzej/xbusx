# Door locks — ZKE3 vs ZKE5

**Status:** Draft.

The GM (`0x00`) handles central locking, but the **command set differs between ZKE generations**. A frame that unlocks an E38 will not unlock an E46 — the byte values are different. Software that drives door locks must branch on the GM variant.

The two relevant generations:

- **ZKE-III** (E38, E39, E52, E53) — uses **4-byte** diagnostic-job payloads.
- **ZKE-V** (E46, E8X) — uses **3-byte** diagnostic-job payloads.

(ZKE-IV exists as a constant in BlueBus but is undocumented; ZKE-BC1 is the post-CAN variant for chassis where most body-electronics moved off the I/K-bus.)

## Frame structure

Both generations use the `IBUS_CMD_DIA_JOB_REQUEST 0x0C` command, addressed to the GM (`0x00`), but the parameter bytes differ:

### ZKE3 (4-byte payload)

```
<src> 06 00 0C 00 <job> 01 <xor>
```

The trailing `0x01` is a job-instance / success-expected indicator.

### ZKE5 (3-byte payload)

```
<src> 05 00 0C <job> 01 <xor>
```

No second `0x00` between the command and the job code; the trailing `0x01` is still there.

## Job-code tables

### ZKE3 (E38, E39, E52, E53)

| Job | Constant | Action | Applies to GM variants |
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

### ZKE5 (E46, E8X)

| Job | Constant | Action |
|---|---|---|
| `0x03` | `IBUS_CMD_ZKE5_JOB_CENTRAL_LOCK` | Press centre-lock button |
| `0x06` | `IBUS_CMD_ZKE5_JOB_UNLOCK_TRUNK` | Unlock trunk only |
| `0x37` | `IBUS_CMD_ZKE5_JOB_UNLOCK_LOW` | Unlock rear doors |
| `0x45` | `IBUS_CMD_ZKE5_JOB_UNLOCK_ALL` | Unlock all doors and trunk |
| `0x4F` | `IBUS_CMD_ZKE5_JOB_LOCK_ALL` | Lock all doors and trunk |

> *Source:* BlueBus `ibus.h:163–167`.

**Note:** bimmerz `gm/types.ts:10` has `ZKE5_LOCK_ALL = 0x34`, disagreeing with BlueBus's `0x4F`. See [`devices/gm.md`](../devices/gm.md#ibus_cmd_zke5_job_lock_all--value-disagreement) — resolved as `0x4F` per BlueBus precedence.

## How BlueBus dispatches

BlueBus does **not** ask the user / config which ZKE generation to send for — it derives it from the detected vehicle type:

```c
if (context->ibus->vehicleType == IBUS_VEHICLE_TYPE_E38_E39_E52_E53) {
    IBusCommandGMDoorCenterLockButton(context->ibus);
} else if (
    context->ibus->vehicleType == IBUS_VEHICLE_TYPE_E46 ||
    context->ibus->vehicleType == IBUS_VEHICLE_TYPE_E8X
) {
    if (context->gmState.lowSideDoors == 1) {
        IBusCommandGMDoorUnlockAll(context->ibus);
    } else {
        IBusCommandGMDoorUnlockHigh(context->ibus);
    }
}
```

> *Source:* BlueBus `handler_ibus.c:890–902` (in `HandlerIBusIKEIgnitionStatus`'s comfort-unlock branch).

The vehicle type comes from `HandlerIBusIKEVehicleConfig` parsing the `0x15` frame — see [`devices/ike.md`](../devices/ike.md#vehicle--chassis-type).

## Comfort unlock / lock — BlueBus state machine

BlueBus optionally unlocks on key-out (comfort-unlock-on-KL-30) or locks above a speed threshold (comfort-lock-at-20km/h). The state machine tracks:

- `gmState.doorsLocked` — does BlueBus believe the doors are locked?
- `gmState.lowSideDoors` — were the rear doors specifically unlocked at the last unlock? (Affects whether to relock all or just front.)
- `gmState.unlockState` — `OFF` / `UNLOCKING` (transient while a multi-step unlock is in flight).

These fields are updated in response to GM `0x7A` door / lid status broadcasts and the comfort-unlock-action emissions.

> *Source:* BlueBus `handler_ibus.c` — `gmState` struct usage scattered across the ignition / speed-RPM / door-status handlers.

## Door-status response (`0x7A`) — the canonical state read

Regardless of generation, the GM broadcasts its current door / window / lock state via `0x7A` (see [`devices/gm.md`](../devices/gm.md#0x7a--door--lid-status-2-bytes)). This is the **source of truth** for software:

- Byte 1, bits 4–5: central-locking state (`0x10` unlocked, `0x20` single-locked, `0x30` double-locked).
- Byte 1, bits 0–3: per-door open state.
- Byte 2: windows, sunroof, lids.

Software should not assume its lock command worked — it should observe the next `0x7A` to confirm.

## Remote key entry (`0x72`)

Remote-fob events come from the GM as `0x72`. The action is encoded in the upper nibble of `DB1`:

| Constant | Value (raw nibble) | Action |
|---|---|---|
| `IBUS_GM_REMOTE_KEY_LOCK` | `0x01` | Lock |
| `IBUS_GM_REMOTE_KEY_UNLOCK` | `0x02` | Unlock |

> *Source:* BlueBus `ibus.h:152–153`. Other action values (trunk release, panic, comfort open/close) exist on real fobs but their `0x72` byte values are not documented in the surveyed sources.

This is **generation-agnostic** — the GM emits the same `0x72` byte regardless of ZKE generation. The difference between ZKE3 and ZKE5 only matters when **commanding** the GM, not when *observing* it.

## Practical implications

1. **Detect vehicle type first.** Read `0x15` (or wait for one to arrive); only then start issuing lock / unlock commands.
2. **Always observe `0x7A` after a command** to confirm the GM accepted it.
3. **Don't hard-code `0x4F` vs `0x34` for ZKE5 LOCK_ALL.** Use BlueBus's `0x4F`; the bimmerz `0x34` is an outlier and may not work.
4. **For comfort features, mirror BlueBus's `gmState`** — track expected lock state and unlock-extent across user actions.

## Open questions / TBC

- **Why does `0x14` (ZKE3-GM5 central-lock) coexist with `0x0B` (ZKE3-GM1)?** They're functionally the same action; the difference is presumably which GM sub-variant the chassis has. The exact branching rule (which chassis carries which sub-variant) is not exhaustively documented.
- **ZKE-IV.** Constant reserved in BlueBus (`ibus.h:584`) but no command mapping. Capture and characterise.
- **ZKE-BC1 / BC1-RD.** Post-CAN; likely most body electronics moved off the I/K-bus and live on the FlexRay / CAN side. Out of scope for this reference.
- **Trunk release `0x06` on ZKE5.** Confirmed in BlueBus but Wilhelm has no detail page. Verify with capture.

## Sources

- BlueBus `ibus.h:148–167` — command and job constants.
- BlueBus `ibus.h:580–589` — variant enum.
- BlueBus `handler_ibus.c:866–1034, 1047–1075` — ignition / speed-driven comfort-lock branches.
- Wilhelm `gm/76.md`, `gm/79.md`, `gm/7a.md` — door / lid status documentation.
- [`devices/gm.md`](../devices/gm.md) — device page with the same tables and additional context.
