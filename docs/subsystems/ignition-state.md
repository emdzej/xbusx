# Ignition state

**Status:** Draft.

Ignition state is the master clock for everything else on the bus. The IKE (`0x80`) is the single authoritative source — its `0x11` broadcast is what determines whether dependent modules wake, run, or sleep. Without an `0x11` broadcast, many modules stay asleep even if their power circuit is live.

## The four states

| State | Wire value | Key position | Meaning |
|---|---|---|---|
| `KL-30` | `0x00` | 0 (key out) | Off. Bus may stay active briefly after the key is removed before deep sleep. |
| `KL-R` | `0x01` | 1 (accessory) | Accessory. Radio, telephone, infotainment can run. |
| `KL-15` | `0x03` | 2 (run) | Run. Most modules powered. |
| `KL-50` | `0x07` | 3 (crank) | Crank / start. Transient — only present while the user holds the key in the start position. |

> *Sources:* Wilhelm `ike/11.md:36–41`; BlueBus `ibus.h:265–268`; bimmerz `ike/types.ts:2–7`. Agreed.

The values are designed so each higher state's bits include the lower state's bits, but **don't match on bit-sets** — match on equality. `0x03` is "run", not "run AND accessory".

## The `0x11` broadcast

The IKE emits `0x11` to `0xBF` (global broadcast) under five conditions (per Wilhelm `ike/11.md:5–11`):

1. **On state change.** Every transition between the four states triggers a fresh `0x11`.
2. **Periodically at KL-R or higher.** Heartbeat so modules know the cluster is still alive.
3. **Periodically at KL-30 while the bus is still active.** Once a transition to deep sleep happens, broadcasts stop.
4. **In reply to a `0x02` Announce** from any module — so a newly-waking peer learns the state without waiting for the next periodic frame.
5. **In reply to a `0x10` Ignition Request** — explicit polling.

The frame is documented on [`devices/ike.md`](../devices/ike.md#0x10--ignition-status-request--0x11--ignition-status).

## Who reacts to what

### Modules that gate their behaviour on ignition

- **NAV (`0x7F`):** Will not wake until the IKE broadcasts at least `KL-R`. The NAV's wake circuit is *not* enough on its own — Wilhelm flags this explicitly (`ike/11.md:13–17`). A blown ignition-supply fuse to the IKE silently disables half the infotainment stack.
- **RAD (`0x68`):** Activates at `KL-R`, deactivates near the `KL-R → KL-30` transition.
- **TEL (`0xC8`):** Activates at `KL-R` if powered.
- **BMBT (`0xF0`):** Receives a monitor-control directive from the GT at `KL-R` (`IBUS_GT_MONITOR_AT_KL_R 0x10`, `ibus.h:259`).
- **GT (`0x3B`):** Activates with the NAV. Issues `0x4F` monitor-on to BMBT at `KL-R`.
- **GM (`0x00`):** Reacts to ignition transitions — comfort-unlock behaviours depend on what was the previous state and what is the new one.
- **LCM (`0xD0`):** Activates lamp processing at KL-R or above. The home-lighting / welcome-lighting feature is *armed* at the KL-15 → KL-30 transition (when ignition is turned off, home-light should arm).

### Modules that emit traffic before ignition

A few state-tracking modules transmit even at `KL-30` (typically a brief tail period before deep sleep):

- **IKE:** continues broadcasting `0x11`, `0x13`, `0x19` for a short window after KL-30.
- **GM:** door / lid frames (`0x7A`) when the driver opens / closes a door — important for the bus to know the user has left.
- **LCM:** lamp-fault flags via `0x5B` if a check-control is active.

## BlueBus's synthetic `KL-99`

BlueBus introduces a non-canonical ignition state for an edge case:

```c
// Make up an ignition status for when the ignition
// is off but the radio requests playback to begin
#define IBUS_IGNITION_KL99 0x08
```

> *Source:* BlueBus `ibus.h:269–271`.

`KL-99` is **not on the wire** — no real BMW module emits or accepts it. It exists only within BlueBus's internal state machine to flag the "user is listening to music at KL-30 with the engine off, radio is asking the CDC to play, ignition is off but audio path is alive" case. Software interoperating with BlueBus does not need to handle it; software emulating BlueBus does.

## Side effects in BlueBus on each transition

The IKE ignition handler `HandlerIBusIKEIgnitionStatus` (`handler_ibus.c:866–1034`) reacts to transitions with a substantial set of actions:

### On transition to `KL-30` (OFF)

1. Disable telephone power and mute.
2. Disconnect any Bluetooth device.
3. Make the Bluetooth module non-discoverable.
4. If comfort-unlock is configured for position-0 and doors are locked:
   - On E38/E39/E52/E53: press centre-lock button via GM.
   - On E46/E8X: unlock all doors (or only high-side, depending on door state).
5. Reset monitor status (so it'll be re-armed at the next wake).
6. Mark home-lights as armed (if the home-lights option is enabled).
7. Unregister BlueBus's identity-polling timer.

### On transition from `KL-15` to `KL-R` (engine off, accessory on)

1. If comfort-unlock is configured for position-1, unlock doors (chassis-specific lock command).
2. Turn off the TEL LED.
3. Cancel any active comfort-blinker or parking-lamp comfort mode.

### On transition from `KL-30` to anything (waking up)

1. Cancel any active home lights.
2. Disarm home-lights (we're back in the car).
3. Power on the telephone.
4. Reset comfort-unlock state machine.
5. Clear Bluetooth metadata cache.
6. Make Bluetooth connectable; on BC127 modules, play a wake tone.
7. Reconnect to the last paired Bluetooth device.
8. Drive the TEL LED to reflect current Bluetooth-pair / call state.
9. Send `IBusCommandSetModuleStatus(IBUS_DEVICE_CDC, IBUS_DEVICE_LOC, 0x01)` to announce the CDC emulator's presence.
10. Request the LCM's redundant data (so VIN / mileage are fresh).

### On ignition above `KL-30` (any state, periodic)

If on an active call: broadcast CDC status. Drive the TEL LED to reflect Bluetooth state. Refresh the OBC temperature display via `IBusCommandIKEOBCControl(temperature, request-text)`. Mark IKE as "found" (so this path doesn't repeat ad nauseam).

> *Source:* BlueBus `handler_ibus.c:866–1034`. The branching is dense — the table above summarises the structure.

## Vehicle-type detection happens *here*

Several BlueBus features (comfort-unlock, comfort-lock, follow-me-home lights) branch on the BlueBus internal vehicle-type enum. That enum is set by `HandlerIBusIKEVehicleConfig` from the `0x15` upper nibble — see [`devices/ike.md`](../devices/ike.md#vehicle--chassis-type). The vehicle-type detection has typically happened by the time the second `0x11` arrives, so the ignition handler can rely on it.

If the cluster never sends `0x15` (rare but possible — chassis with a faulty IKE diagnostic surface), BlueBus's vehicle-type stays at its default and the comfort-unlock logic falls through to safe defaults.

## Sleep / wake recap

There is no formal "sleep" message on the I/K-bus. Modules go quiet when they observe (a) ignition at `KL-30` for a while and (b) no inbound traffic addressed to them. The IKE itself stops broadcasting `0x11` once enough time has passed at `KL-30`.

A receiving module *wakes from sleep on any bus byte* — see [`protocol/link-and-timing`](../protocol/link-and-timing.md#wake--sleep-behaviour). So any peer can wake the rest by emitting a frame; the IKE then resumes its `0x11` broadcast (or, in the case of a peer that did the waking, the IKE may need to be poked with a `0x10` to re-emit).

---

## Open questions / TBC

- **Exact KL-30 broadcast-tail duration.** How long after the key is removed does the IKE keep broadcasting `0x11`? Chassis-dependent; typically seconds to tens of seconds; not numerically documented.
- **`KL-50` capture.** BlueBus's handler treats `KL-50` mostly like `KL-15`. Whether modules other than the cluster react specifically to `KL-50` (e.g., a starter-disable) is undocumented.
- **MFL R/T toggle reset on sleep.** See [`devices/mfl.md`](../devices/mfl.md#open-questions--tbc).

---

## Sources

- [`devices/ike.md`](../devices/ike.md#0x10--ignition-status-request--0x11--ignition-status) — per-device ignition documentation.
- BlueBus `handler_ibus.c:866–1034` — the full ignition-transition handler.
- BlueBus `ibus.h:265–271` — ignition-state constants plus `KL-99`.
- Wilhelm `ike/11.md` — Wilhelm's per-command documentation.
