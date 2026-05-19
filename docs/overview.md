# Overview

**Status:** Draft.

This is a reference manual for the **I-Bus** (Instrument Bus) and **K-Bus** (Body / *Karosserie* Bus), the two principal in-cabin communication networks used by BMW vehicles from 1989 through roughly 2013. The two buses are **technically identical** in framing and timing; what differs is which devices live on each, and on some chassis whether one or both exist. They are documented here as a single protocol with K-bus / I-bus distinctions called out inline wherever they matter.

> *Sources:* Wilhelm `README.md:58–60` ("technically identical, the only difference is their use by model"); BlueBus treats them as one (no K-bus distinction in firmware).

## What sits on the bus

Most non-engine in-cabin electronics:

- the instrument cluster (KOMBI / IKE / IKI),
- the radio, navigation graphics terminal, on-board monitor, multi-info display,
- body modules (door locks, windows, lighting), park distance control, climate control,
- the telephone, CD changer, sound processor,
- the steering-wheel multifunction stalk, ignition switch logic, EWS immobiliser.

Engine, transmission, ABS, and airbag control units **do not** sit on the I/K-bus. They live on the **D-Bus** (diagnostic backbone) and various engine-internal buses, and are out of scope for this manual.

## The five-bus picture (only two are covered here)

Within a single vehicle you may encounter five named protocols. Only the first two are covered:

| Bus | What it is | Covered? |
|---|---|---|
| **K-Bus** | Body / comfort electronics. Present on most chassis. | ✅ |
| **I-Bus** | Instrument / infotainment. Present on chassis with high-cluster + navigation. | ✅ |
| P-Bus | Peripheral bus internal to ZKE-III body electronics (E38/E39/E53). | ❌ |
| M-Bus | HVAC stepper-motor control. | ❌ |
| D-Bus | Diagnostic backbone (BMW DS2, not KWP2000). Shares the 9600 8E1 wire with K/I, but uses a different frame header (`DST LEN DATA… XOR`, no source byte). | 🚧 — see [protocol/dbus](protocol/dbus.md) (draft, single-source). |

On chassis that have **both K and I** (E38, E39, E53 High), the **IKE acts as a gateway** between them, routing messages whose destination lives on the other bus.

> *Sources:* Wilhelm `README.md:57–98` (bus glossary), `README.md:72–76` (gateway).

## Applicable chassis

| Chassis | Series | Period | I-Bus | K-Bus |
|---|---|---|:---:|:---:|
| E31 | 8 Series | 1989–1999 | ✅ |  |
| E38 | 7 Series | 1994–2001 | ✅ | ✅ |
| E39 | 5 Series | 1995–2004 | ✅ | ✅ |
| E46 | 3 Series | 1997–2006 |  | ✅ |
| E52 | Z8 | 2000–2003 |  | ✅ |
| E53 | X5 | 1999–2006 | ✅ | ✅ |
| E83 | X3 | 2003–2010 |  | ✅ |
| E85 | Z4 Roadster | 2002–2008 |  | ✅ |
| E86 | Z4 Coupé | 2005–2008 |  | ✅ |
| E87 | 1 Series | 2004–2013 |  | ✅ |
| R50/R52/R53 | MINI | 2000–2006 |  | ✅ |

> *Sources:* Wilhelm `README.md:41–53` (chassis × bus matrix), BlueBus `README.md` (supported platforms in firmware). The two agree on which chassis carry which buses; minor differences in chassis date ranges reflect when BMW transitioned bus topologies vs. when the chassis itself was produced.

MINI and Range Rover (early L322) implementations sit on related but not identical buses and are out of scope.

## Scope

**In scope:**

- Layer 1 framing (UART, 9600 8E1, single-wire single-ended) — to the degree the protocol depends on it.
- Layer 2 framing: `SRC | LEN | DST | DATA… | XOR`.
- Addressing: the 256-byte address space shared across K and I, broadcast and multicast.
- All known device addresses, with provenance and chassis applicability.
- All known message IDs, organised per device with cross-cutting indexes.
- Choreography: multi-device flows (radio↔GT arbitration, CDC emulation, OBC interaction, door locks, telephone UI).
- Character encoding and string handling.

**Out of scope:**

- **D-Bus diagnostics** (BMW DS2, accessible at the OBD-II socket) is **partially in scope**: framing is now documented in [`protocol/dbus`](protocol/dbus.md) (single-source draft from navcoder.exe reverse-engineering). Per-command semantics, the full ECU address space, timing, and the auto-detection probe sequence remain out of scope pending further investigation. EDIABAS PRG files describe diagnostic-level details that remain outside this manual.
- **P-Bus** internal-to-ZKE messaging.
- **M-Bus** stepper-motor control.
- Engine and transmission internal buses (CAN, etc.).
- Physical-layer electrical detail beyond what's needed to interpret bus events.
- Vehicle coding, ISTA / DIS / INPA / NCS workflows.

## How to read this reference

See [`README.md`](README.md) for the table of contents and reading paths. The reference is **citation-aware**: every device address, message ID, bit field, and timing claim is cited to at least one source. Disagreements between sources are surfaced as conflict blocks with a resolution and a rationale (see [`conventions.md`](conventions.md)).
