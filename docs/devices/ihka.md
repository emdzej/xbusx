# IHKA (0x5B) — Automatic Climate Control

**Status:** Stub.

**Role:** The automatic-climate-control module — Integrierte Heizungs- und Klimaanlage Automatisch. Manages cabin temperature, fan speed, air distribution, and air-conditioning compressor cycling. On HVAC-equipped chassis the IHKA is the user-facing climate UI's bus counterpart.

**Buses:** K.

**Chassis coverage:** All chassis with automatic climate control. A simpler manual climate variant (IHKR) is mentioned in the Wilhelm bus glossary but not assigned a distinct address.

**Variants:** None at the bus protocol layer.

---

## Address

`0x5B`. *Sources:* BlueBus `ibus.h:24` (`IBUS_DEVICE_IHK`), Wilhelm `README.md:134`, Wilhelm `address.md:46`, bimmerz `devices.ts:35` — agreed.

---

## Messages

The Wilhelm command index references three IHKA-related commands without dedicated detail pages:

| Cmd | Name | Note |
|---|---|---|
| `0x82` | IHKA → GLO | TBC. (`README.md:290`) |
| `0x83` | IHKA AC Control | Some detail; no dedicated page surveyed. (`README.md:291`) |
| `0x86` | IHKA → Nav. | TBC. (`README.md:292`) |
| `0x87` | Nav. → IHKA | TBC. (`README.md:293`) |

BlueBus has the address constant but no IHKA-specific commands.

---

## Cross-cutting subsystems

- The IHKA likely connects to the **M-Bus** (stepper-motor control) — the Wilhelm glossary explicitly mentions that the M-Bus was introduced on the E38 IHKA system (`README.md:84–90`). M-Bus is out of scope for this reference.
- The IKE sensor frame's "aux heat" and "aux vent" bits (`0x13` byte 3) are driven by the IHKA / standalone heater. See [`ike.md`](ike.md#0x12--sensors-request--0x13--sensors).
- OBC aux-timer / aux-heating properties (`0x11`–`0x14` IDs in [`ike.md`](ike.md#obc-property-ids)) flow through the IHKA.

---

## Open questions / TBC

- **`0x83` AC Control.** Named but not detailed. What are the byte layouts?
- **`0x82`, `0x86`, `0x87`.** Wilhelm lists them with no further detail. The Nav-related ones (`0x86`, `0x87`) suggest some interaction with the nav system — likely climate display on the nav screen.
- **No bimmerz coverage.** bimmerz has the address but no codec.
- **No BlueBus interaction.** BlueBus doesn't touch IHKA traffic in any of its handlers.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:24` — address (`IBUS_DEVICE_IHK`).

### Wilhelm-docs
- `README.md:134, 290–293` — device-table entry and unindexed command references.
- `address.md:46` — older device-table entry.
- `README.md:84–90` — M-Bus glossary entry (related but out of scope).

### bimmerz
- `packages/bus/src/devices.ts:35` — address.
