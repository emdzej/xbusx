# OBC display

**Status:** Draft.

The on-board computer (OBC) menu shown on the navigation display (GT) and the OBC text on the instrument cluster (IKE) are the result of a **distributed display protocol** spanning three devices: the IKE owns the state, the GT (or BMBT, on lower-spec chassis) is the input surface, and the displays multicast (`0xE7`) is where the rendered text lands.

This page documents the multi-device choreography. Per-message detail is on the individual device pages (especially [`devices/ike.md`](../devices/ike.md)).

## The cast

| Device | Role |
|---|---|
| **IKE** (`0x80`) | Owns OBC state: time, date, range, average speed, etc. Emits text (`0x24`) and status (`0x2A`) frames. |
| **GT** (`0x3B`) | User input surface (touch / dial). Sends OBC inputs (`0x40`) and OBC control (`0x41`) to IKE. |
| **BMBT** (`0xF0`) | Hard-button input. Drives the GT, which drives the IKE. |
| **MID** (`0xC0`) | Display surface on non-GT chassis — receives `0x24` and `0x2A` via the `0xE7` multicast. |
| **Displays multicast** (`0xE7`) | Group address every display module listens to. |

## The OBC property table

Every OBC value has a one-byte ID. The same ID flows through every command that touches OBC state — `0x24`, `0x2A`, `0x40`, `0x41`, `0x42`. The full table (which IDs each command supports) is on [`devices/ike.md`](../devices/ike.md#obc-property-ids).

A condensed list:

| ID | Property | Common in command |
|---|---|---|
| `0x01` | Time | `0x24` text, `0x40` input, `0x41` request |
| `0x02` | Date | `0x24`, `0x40`, `0x41` |
| `0x03` | Temperature | `0x24`, `0x41` |
| `0x04`, `0x05` | Consumption 1 / 2 | `0x24`, `0x41` recalc |
| `0x06` | Range | `0x24`, `0x41` |
| `0x07` | Distance | `0x24`, `0x40`, `0x41` |
| `0x08` | Arrival | `0x24`, `0x41` |
| `0x09` | Speed Limit | `0x24`, `0x2A`, `0x40`, `0x41`, `0x41` set-as-current-speed |
| `0x0a` | Avg Speed | `0x24`, `0x41` recalc |
| `0x0e` | Timer | `0x24`, `0x2A`, `0x41` start / stop |
| `0x0f`, `0x10` | Aux Timer 1 / 2 | `0x24`, `0x2A`, `0x40`, `0x41` |

> *Source:* Wilhelm `ike/properties.md:5–28`.

## Display flow — IKE → displays

The IKE *eagerly* pushes OBC text to the displays multicast at regular intervals, regardless of what is currently being displayed. This is how the front and rear MIDs / FIDs keep their property cells current.

```
80 <len> E7 24 <property> 00 <string...> <xor>
```

For example:

```
80 0C E7 24 03 00 2B 32 34 2E 35 7C       # Temperature: "+24.5"
80 0F E7 24 02 00 30 35 2F 32 35 2F 32 30 32 30 4C   # Date: "05/25/2020"
```

> *Source:* Wilhelm `ike/24.md`.

In parallel, the IKE pushes the OBC **status bitfield** (`0x2A`) — which functions are on (memo, timer, limit, code, aux timers, aux heat / vent):

```
80 05 E7 2A <byte1> <byte2> <xor>
```

The two bytes encode which OBC functions are active — see [`devices/ike.md`](../devices/ike.md#0x2a--obc-status-multicast).

## Input flow — GT → IKE

When the user enters a value (e.g., a new speed limit on the OBC menu), the GT sends `0x40` to the IKE with the property ID and the new value:

```
3B 06 80 40 09 00 14 E0       # Property 0x09 (Limit), value 0x0014 = 20 (in units the IKE expects)
```

For function activation (start / stop a timer, turn the speed-limit warning on, recalculate consumption), the GT sends `0x41` with a one-byte control bitfield:

| Mask | Action |
|---|---|
| `0x01` | Request string — IKE responds with `0x24`. |
| `0x02` | Request boolean — IKE responds with `0x2A`. |
| `0x04` | On / Start. |
| `0x08` | Off / Stop. |
| `0x10` | Recalculate (Consumption 1 / 2, Avg Speed). |
| `0x20` | Set as current speed (Limit only). |

> *Source:* Wilhelm `ike/properties.md:110–169`.

Example: start the OBC timer.

```
3B 05 80 41 0E 04 ED       # Property 0x0E (Timer) + Action 0x04 (On / Start)
```

## Round-trip example — Set Speed Limit

A worked sequence for "user dials in a 65 km/h speed limit on the OBC menu":

1. **User pushes the Limit menu item on the BMBT.** BMBT emits `0x48 0x...` button event to GT.
2. **GT renders the Limit menu.** GT writes title text, asks IKE for the current limit via `3B 05 80 41 09 01` (request string for Limit). IKE replies with `0x24 0x09` carrying the current limit as a string.
3. **User dials a new value.** BMBT emits `0x49` dial events; GT updates its internal counter.
4. **User confirms.** BMBT emits a confirm button event (`0x48 0x05`).
5. **GT writes the new value.** GT sends `3B 06 80 40 09 <hi> <lo>` to IKE.
6. **GT activates the limit.** GT sends `3B 05 80 41 09 04` (On / Start).
7. **IKE confirms.** IKE pushes `0x2A` with the LIMIT bit set, and `0x24 0x09` with the new value as a string. The displays multicast distributes both to MID, GT, and any rear-screen displays.
8. **The cluster's own limit display lights up.** The IKE has internal logic to flash the speedometer / play a tone when actual speed exceeds the new limit.

> *Source:* synthesis of Wilhelm `ike/properties.md`, `gt/40.md`, `gt/41.md`, `ike/24.md`, `ike/2a.md`, `bmbt/48.md`, `bmbt/49.md`. The full sequence isn't in any one source; the table above is the integration.

## Redundant data — IKE ↔ LCM

A separate but related choreography: at startup, the IKE asks the LCM for redundant data (VIN, mileage, service intervals) via the `0x53` → `0x54` → `0x55` exchange:

1. IKE → LCM: `0x53` (request).
2. LCM → IKE: `0x54` (response with VIN, mileage, service-interval bytes).
3. IKE → broadcast: `0x55` (replicate, so other modules can re-stock their local copies).

This is what populates the cluster's stored mileage (used by the EWS for anti-tamper) and what BlueBus reads on power-up to detect VIN changes.

> *Source:* Wilhelm `ike/53.md`, `ike/54.md`, `ike/55.md`. BlueBus `handler_ibus.c:1384–1415`.

## BlueBus's role

BlueBus injects itself into the OBC flow in two ways:

1. **Periodic OBC temperature refresh.** On every `0x11` ignition broadcast above OFF, BlueBus calls `IBusCommandIKEOBCControl(context->ibus, IBUS_IKE_OBC_PROPERTY_TEMPERATURE, IBUS_IKE_OBC_PROPERTY_REQUEST_TEXT)` (`handler_ibus.c:1021–1025`) — asks the IKE to re-emit the current ambient / coolant temperature as text. This keeps BlueBus's local cache fresh.
2. **CCM writes.** BlueBus can write a check-control message via `0x1A` to the IKE — used to surface BlueBus status (Bluetooth connection state, etc.) on the high-cluster check-control panel.

## Cross-cutting links

- [`devices/ike.md`](../devices/ike.md#per-message-detail) — `0x10`/`0x11`, `0x24`, `0x2A`, `0x40`/`0x41`/`0x42`, `0x53`/`0x54`/`0x55` per-message details.
- [`devices/gt.md`](../devices/gt.md#0x40--obc-input) — GT side of `0x40` / `0x41`.
- [`devices/mid.md`](../devices/mid.md#0x24--property-text-dst) — MID receiving `0x24`.
- [`devices/lcm.md`](../devices/lcm.md#0x54--redundant-data-response-brief) — LCM as redundant-data source.

## Open questions / TBC

- **Aux heater / aux vent activation via `0x41`.** Wilhelm flags that aux heater / vent properties (IDs `0x11`–`0x14`) **do not** use the standard `0x04` On / `0x08` Off masks; they have specialised semantics. The exact protocol isn't fully documented in the surveyed sources.
- **Memo OBC.** Property `0x0C` (Memo) is supported by `0x2A` and `0x41` but not by `0x24`. What does the IKE do when memo is on but there's no `0x24` text to render? Likely the GT renders an icon based on `0x2A` alone; not documented in detail.
- **GT-vs-BMBT input ordering.** When both the GT (via dial / soft buttons) and the BMBT (via hard buttons) send conflicting OBC inputs in a short window, which wins? Not documented.

## Sources

- Wilhelm `ike/properties.md` — the canonical property table and per-command applicability matrix.
- Wilhelm `ike/24.md`, `ike/2a.md`, `gt/40.md`, `gt/41.md` — per-command pages.
- Wilhelm `ike/53.md`, `ike/54.md`, `ike/55.md` — redundant-data exchange.
- BlueBus `handler_ibus.c:1021–1025` — periodic OBC temperature refresh from BlueBus.
- BlueBus `handler_ibus.c:1384–1415` — redundant-data response handler.
- [`devices/ike.md`](../devices/ike.md) — IKE device page with the OBC property table and per-command detail.
