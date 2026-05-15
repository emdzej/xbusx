# Glossary

**Status:** Stable.

Acronyms and terms used throughout this reference. Where a device has a full page, the link goes there; where a term has a section in the protocol-layer pages, the link points to the relevant heading.

## Buses

| Term | Meaning |
|---|---|
| **I-Bus** | *Instrument Bus.* In-cabin infotainment / cluster network. See [`overview`](overview.md). |
| **K-Bus** | *Karosserie Bus* (body bus). In-cabin body-electronics network. Electrically identical to I-Bus. See [`overview`](overview.md). |
| **D-Bus** | *Diagnosis Bus.* Out-of-scope here. Different framing (no SRC byte). Used for KWP2000 diagnostics. |
| **M-Bus** | HVAC stepper-motor sub-bus. Out of scope. |
| **P-Bus** | Peripheral bus internal to ZKE-III body electronics on E38 / E39 / E53. Out of scope. |
| **CAN** | Controller Area Network. Engine and powertrain buses on BMWs from the late 1990s onward. Out of scope. |

## Devices

(Devices with a dedicated page are linked; others are listed for the acronym.)

| Acronym | Address | Full name | Page |
|---|---|---|---|
| **ABG** | `0xA4` | Airbag (bimmerz mnemonic for MRS) | [`mrs`](devices/mrs.md) |
| **AHL** | `0x66` | Adaptive Headlight (bimmerz mnemonic for ALC) | [`alc`](devices/alc.md) |
| **ALC** | `0x66` | Active Light Control | [`alc`](devices/alc.md) |
| **ALWR** | `0x9A` | Automatische Leuchtweitenregulierung (auto headlight aim) | [`alwr`](devices/alwr.md) |
| **ANZV** | `0xE7` | Display group multicast | (see [protocol/addressing](protocol/addressing.md#multicast)) |
| **BMBT** | `0xF0` | On-Board Monitor Control Panel | [`bmbt`](devices/bmbt.md) |
| **CCM** | `0x30` | Check Control Module | [`ccm`](devices/ccm.md) |
| **CDC** | `0x18` | CD Changer | [`cdc`](devices/cdc.md) |
| **CDCD** | `0x76` | CD Changer (DIN size) | [`cdcd`](devices/cdcd.md) |
| **CID** | `0x46` | Central Information Display | [`cid`](devices/cid.md) |
| **CSU** | `0xF5` | Centre Switch Control Unit (bimmerz mnemonic for SZM) | [`f5`](devices/f5.md) |
| **CVM** | `0x9B / 0x9C` | Cabriolet-Verdeck-Modul (convertible top module) | [`cvm`](devices/cvm.md), [`9b`](devices/9b.md) |
| **DIA** | `0x3F` | Diagnostic | (no dedicated page; see [`devices/`](devices/README.md)) |
| **DSP** | `0x6A` | Digital Sound Processor | [`dsp`](devices/dsp.md) |
| **DSPC** | `0xEA` | DSP Controller (E38) | [`dspc`](devices/dspc.md) |
| **DWA** | `0x45` | Diebstahl-Warn-Anlage (anti-theft) | [`dwa`](devices/dwa.md) |
| **EDC** | `0x2E` | Electronic Damper Control | [`edc`](devices/edc.md) |
| **EHC** | `0xAC` | Electronic Height Control | [`ehc`](devices/ehc.md) |
| **EKM** | `0x69` | Electronic Body Module (E31) | [`ekm`](devices/ekm.md) |
| **ETS** | `0x9D` | Electronic Disconnecting Switch | [`ets`](devices/ets.md) |
| **EWS** | `0x44` | Elektronische Wegfahrsperre (immobiliser) | [`ews`](devices/ews.md) |
| **FBZV** | `0x40` | Funk-Bedienteil Zentralverriegelung (early key fob receiver) | [`fbzv`](devices/fbzv.md) |
| **FHK** | `0xA7` | Fond Heizung und Klimatisierung (rear climate) | [`fhk`](devices/fhk.md) |
| **FID** | `0xA0` | Rear Multi-Functional Display | [`fid`](devices/fid.md) |
| **FMBT** | `0x47` | Fond MBT (rear BMBT) | [`fmbt`](devices/fmbt.md) |
| **FUH** | `0x28` | Funkuhr (BlueBus mnemonic for RCC) | [`rcc`](devices/rcc.md) |
| **GLO** | `0xBF` | Global broadcast | (see [protocol/addressing](protocol/addressing.md#broadcast)) |
| **GM** | `0x00` | General Module / body electronics (ZKE) | [`gm`](devices/gm.md) |
| **GT** | `0x3B` | Graphics Terminal | [`gt`](devices/gt.md) |
| **GTF** | `0x43` | Rear Graphics Stage | [`gtf`](devices/gtf.md) |
| **HAC** | `0x9A` | Headlight Aim Control (bimmerz mnemonic for ALWR) | [`alwr`](devices/alwr.md) |
| **HKM** | `0x24` | Heckklappenmodul (trunk lid module) | [`hkm`](devices/hkm.md) |
| **IHKA** | `0x5B` | Integrierte Heizungs- und Klimaanlage Automatisch | [`ihka`](devices/ihka.md) |
| **IKE** | `0x80` | Instrument Cluster Electronics (high cluster, pre-Oct 2001) | [`ike`](devices/ike.md) |
| **IKI** | `0x80` | Later high cluster (post-Oct 2001) — extended `0x13` payload | [`ike`](devices/ike.md) |
| **IRIS** | `0xE0` | Integrated Radio and Information System (E39) | [`iris`](devices/iris.md) |
| **JBIT** | `0x48` | Japanese Telephone | [`jbit`](devices/jbit.md) |
| **JNAV** | `0xBB` | Japanese Navigation (BlueBus mnemonic for NAJ) | [`naj`](devices/naj.md) |
| **KOMBI** | `0x80` | Low cluster | [`ike`](devices/ike.md) |
| **LCM** | `0xD0` | Lamp Check Module | [`lcm`](devices/lcm.md) |
| **LKM2** | `0xF5` | Lamp Control Module 2 (E31) | [`f5`](devices/f5.md) |
| **LME38** | `0xD0` | E38-era light module (LCM variant) | [`lcm`](devices/lcm.md#variants) |
| **LOC** | `0xFF` | Bus-local broadcast | (see [protocol/addressing](protocol/addressing.md#broadcast)) |
| **LSZ** | `0xD0` | Light Switch Centre (later LCM variants) | [`lcm`](devices/lcm.md#variants) |
| **LWR** | `0x9A` | Leuchtweitenregulierung (Wilhelm older name for ALWR) | [`alwr`](devices/alwr.md) |
| **MFL** | `0x50` | Multifunktionslenkrad (multifunction steering wheel) | [`mfl`](devices/mfl.md) |
| **MID** | `0xC0` (`0xCD` E31) | Multi-Information Display | [`mid`](devices/mid.md), [`mid-e31`](devices/mid-e31.md) |
| **MM3 / MML / MMR** | (various) | bimmerz mirror-memory mnemonics | (see individual device pages) |
| **MRS** | `0xA4` | Multiple Restraint System (airbag) | [`mrs`](devices/mrs.md) |
| **NAJ / NAVJ** | `0xBB` | Japanese Navigation | [`naj`](devices/naj.md) |
| **NAV / NAVE** | `0x7F` | Navigation Computer (Europe) | [`nav`](devices/nav.md) |
| **PDC** | `0x60` | Park Distance Control | [`pdc`](devices/pdc.md) |
| **RAD** | `0x68` | Radio | [`rad`](devices/rad.md) |
| **RCC** | `0x28` | Radio Clock Control | [`rcc`](devices/rcc.md) |
| **RCM** | `0x47` | Rear Compartment Monitor (Wilhelm older name for FMBT) | [`fmbt`](devices/fmbt.md) |
| **RDC** | `0x70` | Reifendruckkontrolle (tyre pressure) | [`rdc`](devices/rdc.md) |
| **RF/IR** | `0xB9` | Compact Remote Control | [`rfir`](devices/rfir.md) |
| **RLS** | `0xE8` | Rain / Light Sensor | [`rls`](devices/rls.md) |
| **SDRS** | `0x73` | Sirius Satellite Radio | [`sdrs`](devices/sdrs.md) |
| **SES** | `0xB0` | Speech Input / Recognition System | [`ses`](devices/ses.md) |
| **SHD** | `0x08` | Schiebedach (sunroof) | [`shd`](devices/shd.md) |
| **SM / SM0** | `0x72` | Seat Memory (BlueBus / bimmerz mnemonics) | [`sm-driver`](devices/sm-driver.md) |
| **SMB** | `0xDA` | Seat Memory Beifahrer (passenger) | [`smb`](devices/smb.md) |
| **SMAD** | `0xDA` | (bimmerz mnemonic) | [`smb`](devices/smb.md) |
| **SMF** | `0x71 / 0x72` | Sitzmemorie Fahrer (driver seat memory) | [`sm-driver`](devices/sm-driver.md) |
| **SPMBT** | `0x51` | Sitzpositions-Memory Beifahrer (passenger mirror memory) | [`spmbt`](devices/spmbt.md) |
| **SPMFT** | `0x9B` (E46) | Sitzpositions-Memory Fahrer (driver mirror memory, E46) | [`9b`](devices/9b.md) |
| **STH** | `0x6B` | Standheizung (auxiliary heater) | [`sth`](devices/sth.md) |
| **SZM** | `0xF5` | Schaltzentrum Mittelkonsole (centre console switch centre) | [`f5`](devices/f5.md) |
| **TCU** | `0xCA` | Telematics Control Unit (BMW Assist) | [`tcu`](devices/tcu.md) |
| **TEL** | `0xC8` | Telephone | [`tel`](devices/tel.md) |
| **VID / VM** | `0xED` | Video Module / TV tuner | [`vid`](devices/vid.md) |
| **ZKE** | (concept) | Zentrale Karosserie-Elektronik (body-electronics architecture). Generations: ZKE-III, ZKE-IV, ZKE-V, ZKE-BC1. | [`gm`](devices/gm.md) |

## Ignition / electrical terms

| Term | Meaning |
|---|---|
| **KL-30** | "Klemme 30" — the always-on battery feed. The car is "off" with respect to the bus; the bus may be active for a short period after KL-30 before deep sleep. |
| **KL-R** | "Klemme R" — key position 1 (accessory). Radio / infotainment can run. |
| **KL-15** | "Klemme 15" — key position 2 (run). Most modules powered. |
| **KL-50** | "Klemme 50" — key position 3 (crank / start). Transient. |
| **DCF77** | German long-wave time signal received by the RCC for atomic-clock-grade time. |

## Generations / variants

| Term | Refers to |
|---|---|
| **MK1 / MK2 / MK3 / MK4** | GT (navigation) generations. See [`gt`](devices/gt.md#variants). |
| **ZKE-III / ZKE-V** | GM body-electronics generations. See [`gm`](devices/gm.md#variants). |
| **LCM_II / LCM_III / LCM_IV / LSZ / LSZ_2** | LCM variants. See [`lcm`](devices/lcm.md#variants). |
| **Everest** | Bluetooth-integrated telephone variant. See [`tel`](devices/tel.md#variants). |
| **CMT3000 / Motorola V-Series** | Earlier telephone variants. See [`tel`](devices/tel.md#variants). |
| **C43 / BM53 / BM54 / BRCD / BRTP / BM24** | Radio variants. See [`rad`](devices/rad.md#variants). |

## Protocol terms

| Term | Meaning |
|---|---|
| **ARQ** | Automatic Retransmission reQuest. Re-send on missed loopback. See [`protocol/link-and-timing`](protocol/link-and-timing.md#arq--automatic-retransmission). |
| **CCM** (the *message*) | Check Control Message — the user-facing warning text written via `0x1A`. Distinct from the device CCM. See [`ccm`](devices/ccm.md). |
| **OBC** | On-Board Computer — the trip-computer feature set hosted on the IKE / GT. See [`subsystems/obc-display (planned)`](subsystems/obc-display.md). |
| **Pong / Announce** | The `0x02` module-presence frame. Bit 0 set = announce; clear = pong reply to a ping. See Wilhelm `02.md`. |
| **Ping** | The `0x01` liveness probe. |
| **Gateway** | The IKE's role on chassis with both K and I — forwards cross-bus traffic. See [`protocol/addressing`](protocol/addressing.md#the-gateway-ike-bridges-k-bus-and-i-bus). |
| **Loopback** | The transmitter observes its own emitted bytes back on RX — used as an implicit ACK. See [`protocol/link-and-timing`](protocol/link-and-timing.md#arq--automatic-retransmission). |

## BMW-internal terms

| Term | Meaning |
|---|---|
| **DIS** | Diagnose- und Informationssystem — BMW's older diagnostic-shop tool. |
| **INPA** | Interpreter für Prüfabläufe — interpreter for diagnostic test sequences (uses EDIABAS scripts). |
| **EDIABAS** | Elektronische Diagnose Basis — the diagnostic interpreter behind DIS / INPA / ISTA. |
| **ISTA** | Integrated Service Technical Application — modern diagnostic tool. |
| **NCS** | Network Coding System — BMW's vehicle-coding tool. |
| **KWP2000** | Keyword Protocol 2000 — the ISO 14230 diagnostic protocol the D-Bus uses. Out of scope here. |

## Common file references

| Reference | What it points at |
|---|---|
| `BB ibus.h:NNN` | BlueBus's master header file at `/Users/mjaskols/Projects/my/ext-BlueBus/firmware/application/lib/ibus.h`, line `NNN`. |
| `BB ibus.c:NNN` | The corresponding implementation file. |
| `BB handler_ibus.c:NNN` | BlueBus's per-message handler dispatch. |
| `W <path>` | Wilhelm-docs at `/Users/mjaskols/Projects/my/ext-wilhelm-docs/<path>`. |
| `bz devices.ts:NN` | bimmerz device-address table at `/Users/mjaskols/Projects/my/bimmerz/packages/bus/src/devices.ts`. |
