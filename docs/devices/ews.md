# EWS (0x44) — Drive-Away Protection (Immobiliser)

**Status:** Stub.

**Role:** The vehicle immobiliser — Elektronische Wegfahrsperre. Authenticates the ignition key (rolling code) and either enables or blocks the engine ECU. The EWS is the security gatekeeper between the key transponder and the engine.

**Buses:** K.

**Chassis coverage:** All chassis. The EWS has gone through several generations (EWS I / II / III); the protocol-level surface here is what's visible on the K-bus.

**Variants:** None at the bus protocol layer.

---

## Address

`0x44`. *Sources:* BlueBus `ibus.h:21`, Wilhelm `README.md:126`, Wilhelm `address.md:39`, bimmerz `devices.ts:31` — agreed.

---

## Messages where EWS is `SRC`

| Cmd | Name | Typical `DST` | Brief | Sources |
|---|---|---|---|---|
| `0x74` | Immobiliser / key status | broadcast | Reports current immobiliser state. Consumed by GM, IKE, and other modules. | BB `ibus.h:148` (`IBUS_CMD_EWS_IMMOBILISER_STATUS`) · W `README.md:281` (Key Status) |

The Wilhelm command index lists `0x73` as "Key Status Request" and `0x74` as "Key Status" (`README.md:280–281`) — typical request / response pair, but no per-command detail pages exist.

---

## Messages where EWS is `DST`

| Cmd | Name | Typical `SRC` | Brief | Sources |
|---|---|---|---|---|
| `0x73` | Key status request | any | Asks EWS for current status. | W `README.md:280` |

---

## Per-message detail

The byte layout of `0x74` is not documented in the surveyed sources beyond its existence. BlueBus declares the command constant but does not parse the payload bytes.

> *TBC:* Capture and characterise the `0x74` payload from an E39 / E46 with key in different states (out, in-position-0, in-position-R, etc.).

---

## Cross-cutting subsystems

- The **GM** consumes EWS state to decide whether to allow remote-key entry actions. See [`gm.md`](gm.md).
- The **IKE odometer broadcast** (`0x17`) is *consumed* by the EWS — Wilhelm `ike/17.md:47–49` notes: *"Increases the mileage in EWS and inserted key."* The EWS stores a copy of the odometer for forensic / anti-tamper purposes, and writes it back to the key's transponder.

---

## Open questions / TBC

- **`0x74` payload semantics.** What are the bytes? Key inserted, position, authentication result, faults?
- **Rolling-code exchange.** Almost certainly happens on a faster / private channel between EWS and the engine ECU, not on the I/K-bus. Out of scope here.
- **Wilhelm coverage.** No `ews/` directory.

---

## Sources

### BlueBus
- `firmware/application/lib/ibus.h:21` — address.
- `firmware/application/lib/ibus.h:148` — `IBUS_CMD_EWS_IMMOBILISER_STATUS 0x74`.

### Wilhelm-docs
- `README.md:126, 280–281` — device-table entry and command-index references.
- `address.md:39` — older device-table entry.

### bimmerz
- `packages/bus/src/devices.ts:31` — address.
