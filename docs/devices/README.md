# Devices — canonical address table

**Status:** Draft.

This page is the **canonical address table** for the I/K-bus address space. Every row carries provenance: which sources confirm the entry, and where they disagree. For per-device detail (messages, bit fields, examples), follow the link from the abbreviation column.

The reconciliation rules behind this table are in [`../conventions.md`](../conventions.md); the source set itself is in [`../sources-and-provenance.md`](../sources-and-provenance.md). Read the **systematic discrepancies** section below before quoting any single row — several disagreements between sources follow a pattern rather than being one-off mistakes.

## Notation

- **Bus** column: `K` = K-Bus only, `I` = I-Bus only, `K/I` = both (the same address is used on either bus, depending on chassis).
- **Chassis** column: chassis on which the device is known to be installed. Blank means "common across most chassis listed in [`../overview.md`](../overview.md)".
- **Cite** column: source identifiers separated by `·`. The cite is a confirmation that the source assigns this address to this device. Where a source uses a different abbreviation or name, see the device's own page.
- Sources are abbreviated:
  - `BB` = BlueBus `firmware/application/lib/ibus.h`
  - `W` = Wilhelm `README.md`
  - `Wa` = Wilhelm `address.md`
  - `bz` = bimmerz `packages/bus/src/devices.ts`

## Systematic discrepancies (read first)

Several patterns recur across the table. Knowing them in advance saves having to litigate each row.

### Wilhelm `README.md` "I-Bus" entries that `address.md` calls K-Bus

Wilhelm's two device tables — the more recent `README.md` and the older `address.md` — disagree on bus assignment for ~10 entries. The pattern: `README.md` marks several devices as `I` that `address.md` marks `K`.

Affected addresses include `0x28` (RCC), `0x30` (CCM), `0x46` (CID), `0x47` (FMBT), `0xA0` (FID), `0xEA` (DSPC), `0xED` (VID), `0xF0` (BMBT).

**Resolution policy:**

- For devices that only exist on chassis where **only the K-Bus is present** (e.g., CID on E83/E85), the bus is **K** regardless of what Wilhelm `README.md` says.
- For nav-stack devices (GT, BMBT, FMBT, FID, VID, GTF, NAV) on chassis that have an **I-Bus**, the bus is **I** — these are core I-Bus devices.
- Where ambiguous, treat `address.md` as canonical (it is more conservative) unless BlueBus's runtime behaviour says otherwise.

**Why:** Neither Wilhelm file is internally consistent enough to be the sole authority. Cross-checking against chassis-applicability (a K-only chassis cannot host I-Bus devices) and BlueBus's runtime usage gives a more defensible answer per row.

### bimmerz includes D-Bus addresses without distinguishing

bimmerz `devices.ts` mixes K/I-Bus and D-Bus addresses into a single table. Addresses that appear *only* in bimmerz and that Wilhelm or BlueBus identify as D-Bus are **excluded** from the canonical table below:

| Address | bimmerz label | Reality (per Wilhelm) |
|---|---|---|
| `0x12` | `DME` | D-Bus — Engine Management. Out of scope. |
| `0x32` | `EGS` | D-Bus — Transmission. Out of scope. |
| `0x56` | `ASC` | D-Bus — ABS/ASC/DSC (DS2). Out of scope. |
| `0x57` | `LWS` | D-Bus — Steering Angle Sensor. Out of scope. |
| `0x65` | `EKP` | D-Bus — Fuel Pump. Out of scope. |
| `0x74` | `SOR` | D-Bus — Seat Occupancy Detection. Out of scope. |
| `0xA6` | `GR` | D-Bus — Cruise Control. Out of scope. |
| `0xB8` | `DMEK` | D-Bus — DME (KWP2000 protocol). Out of scope. |

**Why:** The D-Bus uses different framing and different semantics ([`../overview.md`](../overview.md)). Including these addresses in the K/I-bus table would invite calling a D-Bus device from K/I-bus code, which won't work.

### bimmerz one-off outliers

A few addresses in bimmerz are not confirmed by Wilhelm or BlueBus. They are listed as **bz-only** below; treat them as low-confidence until cross-checked against observed traffic.

| Address | bimmerz claim | Notes |
|---|---|---|
| `0x02` | `EKM` | Probably wrong — Wilhelm places EKM at `0x69` (E31). Likely an internal renumbering. |
| `0x0F` | `HKM` | Wilhelm places HKM at `0x24`. The two might be different generations. |
| `0x52` | `CVM` | Wilhelm places CVM at `0x9B` (E36) and `0x9C` (E46). |
| `0x81` | `RCSC` | No other source confirms. |
| `0xA8` | `NAVC` | No other source confirms; "Navigation China" suggests a market variant. |
| `0xF1` | `PIC` | Labelled "custom unit" in bimmerz itself — not a stock BMW device. |

## Canonical address table

| Address | Abbr | Name | Bus | Chassis | Page | Cite |
|---|---|---|---|---|---|---|
| `0x00` | **GM** | General Module (body electronics / ZKE) | K | most | [gm](gm.md) | BB `ibus.h:14` · W `README.md:115` · Wa `:14` · bz `:21` |
| `0x08` | **SHD** | Tilt/Slide Sunroof | K | most | [shd](shd.md) | W `README.md:116` · Wa `:15` · bz `:22` |
| `0x18` | **CDC** | CD Changer | K/I | most | [cdc](cdc.md) | BB `ibus.h:15` · W `README.md:117` · Wa `:23` · bz `:23` |
| `0x24` | **HKM** | Trunk Lid Module | K | E38, E39 | [hkm](hkm.md) | W `README.md:118` · Wa `:29` |
| `0x28` | **RCC** (FUH) | Radio Controlled Clock | K | E38 | [rcc](rcc.md) | BB `ibus.h:16` · W `README.md:119` · Wa `:30` · bz `:24` |
| `0x2E` | **EDC** | Electronic Damper Control | K | E38, E39 | [edc](edc.md) | W `README.md:120` · Wa `:31` |
| `0x30` | **CCM** | Check Control Module | K | E38 | [ccm](ccm.md) | BB `ibus.h:17` · W `README.md:121` · Wa `:32` · bz `:25` |
| `0x3B` | **GT** | Graphics Stage (Navigation) | I | E38, E39, E53 High | [gt](gt.md) | BB `ibus.h:18` · W `README.md:122` · Wa `:36` · bz `:26` |
| `0x3F` | **DIA** | Diagnostics (via gateway) | K/I | all | [dia](dia.md) | BB `ibus.h:19` · W `README.md:123` · Wa `:37` · bz `:28` |
| `0x40` | **FBZV** | Remote Control for Central Locking | K | E31, older E38 | [fbzv](fbzv.md) | W `README.md:124` · Wa `:38` · bz `:30` |
| `0x43` | **GTF** | Rear Graphics Stage | I | E38 (rear-entertainment) | [gtf](gtf.md) | BB `ibus.h:20` · W `README.md:125` · bz `:27` |
| `0x44` | **EWS** | Drive-Away Protection (Immobiliser) | K | most | [ews](ews.md) | BB `ibus.h:21` · W `README.md:126` · Wa `:39` · bz `:31` |
| `0x45` | **DWA** | Anti-Theft System | K | most | [dwa](dwa.md) | W `README.md:127` · Wa `:40` |
| `0x46` | **CID** | Central Information Display (flip-up LCD) | K | E83, E85 | [cid](cid.md) | BB `ibus.h:22` · W `README.md:128` · Wa `:41` · bz `:32` |
| `0x47` | **FMBT** | Rear Compartment Monitor / Control Panel | I | E38 (rear-entertainment) | [fmbt](fmbt.md) | W `README.md:129` · Wa `:42` · bz `:60` |
| `0x48` | **JBIT** | Telephone (Japan) | K | JP-spec | [jbit](jbit.md) | W `README.md:130` · Wa `:43` |
| `0x50` | **MFL** | Multifunction Steering Wheel | K/I | most | [mfl](mfl.md) | BB `ibus.h:23` · W `README.md:131` · Wa `:44` · bz `:33` |
| `0x51` | **SPMBT** | Mirror Memory — Passenger | K | E46+ | [spmbt](spmbt.md) | W `README.md:132` · Wa `:45` · bz `:34` (`MML`) |
| `0x5B` | **IHKA** | Automatic Climate Control | K | most | [ihka](ihka.md) | BB `ibus.h:24` (`IHK`) · W `README.md:134` · Wa `:46` · bz `:35` |
| `0x60` | **PDC** | Park Distance Control | K/I | most | [pdc](pdc.md) | BB `ibus.h:25` · W `README.md:135` · Wa `:47` · bz `:36` |
| `0x66` | **ALC** (AHL) | Active / Adaptive Light Control | K | most | [alc](alc.md) | W `README.md:136` · Wa `:48` · bz `:16` (`AHL`) |
| `0x68` | **RAD** | Radio | K/I | most | [rad](rad.md) | BB `ibus.h:26` · W `README.md:137` · Wa `:49` · bz `:37` |
| `0x69` | **EKM** | Electronic Body Module | K | E31 | [ekm](ekm.md) | W `README.md:138` · Wa `:50` |
| `0x6A` | **DSP** | Digital Sound Processor | K/I | most | [dsp](dsp.md) | BB `ibus.h:27` · W `README.md:139` · Wa `:51` · bz `:38` |
| `0x6B` | **STH** | Auxiliary Heater ("Webasto") | K | optional | [sth](sth.md) | W `README.md:140` · Wa `:52` · bz `:62` |
| `0x70` | **RDC** | Tyre Pressure Control & Deflation Warning | K | most | [rdc](rdc.md) | W `README.md:141` · Wa `:53` · bz `:54` |
| `0x71` | **SMF** *or* **MMF** | Seat Memory — Driver *or* Mirror Memory — Driver (chassis-dependent) | K | E31, ZKE5 | [sm-driver](sm-driver.md) | W `README.md:142` (SMF, E31) · Wa `:54` (MMF, ZKE5) |
| `0x72` | **SMF** (SM0) | Seat Memory — Driver | K | E46, E53, later | [sm-driver](sm-driver.md) | BB `ibus.h:28` (`SM0`) · W `README.md:143` · Wa `:55` · bz `:40` (`SM`) |
| `0x73` | **SDRS** | Sirius Satellite Radio | K/I | US-spec | [sdrs](sdrs.md) | BB `ibus.h:29` · bz `:41` |
| `0x76` | **CDCD** | CD Changer / Player (DIN size) | K | most | [cdcd](cdcd.md) | BB `ibus.h:30` · W `README.md:144` · Wa `:56` · bz `:42` |
| `0x7F` | **NAV** (NAVE) | Navigation Computer (Europe) | K/I | E38, E39, E53 High | [nav](nav.md) | BB `ibus.h:31` (`NAVE`) · W `README.md:145` · Wa `:57` · bz `:43` |
| `0x80` | **IKE** | Instrument Cluster (KOMBI / IKE / IKI) | K/I | all | [ike](ike.md) | BB `ibus.h:32` · W `README.md:146` · Wa `:58` · bz `:44` |
| `0x9A` | **ALWR** (LWR / HAC) | Automatic Headlight Vertical Aim Control | K/I | most | [alwr](alwr.md) | W `README.md:147` · Wa `:59` · bz `:9` (`HAC`) |
| `0x9B` | **CVM** *or* **SPMFT** | Convertible Soft Top *or* Mirror Memory — Driver (chassis-dependent) | K | E36 (CVM), E46 (SPMFT) | [9b](9b.md) | W `README.md:148–149` · bz `:45` (`MMR`) |
| `0x9C` | **CVM** | Convertible Soft Top Module | K | E46 | [cvm](cvm.md) | W `README.md:150` · bz `:46` (`MM3`) |
| `0x9D` | **ETS** | Electronic Disconnecting Switch | K | E38 | [ets](ets.md) | W `README.md:151` |
| `0xA0` | **FID** | Rear Multi-functional Display | I | E38, E39 | [fid](fid.md) | W `README.md:152` · Wa `:60` · bz `:47` |
| `0xA4` | **MRS** (ABG) | Multiple Restraint System / Airbag | K | most | [mrs](mrs.md) | W `README.md:153` · Wa `:61` · bz `:19` (`ABG`) |
| `0xA7` | **FHK** | Rear Compartment Climate Control | K | E38 | [fhk](fhk.md) | W `README.md:154` · Wa `:62` · bz `:7` |
| `0xAC` | **EHC** | Electronic Height Control | K | E38 (sedan), E39 wagon | [ehc](ehc.md) | W `README.md:155` · Wa `:63` · bz `:4` |
| `0xB0` | **SES** | Speech Input / Recognition System | K/I | optional | [ses](ses.md) | BB `ibus.h:33` · W `README.md:156` · Wa `:64` · bz `:15` |
| `0xB9` | **RF/IR** | Compact Remote Control (RF/IR receiver) | K | most | [rfir](rfir.md) | W `README.md:157` · Wa `:65` |
| `0xBB` | **NAJ** (JNAV / NAVJ) | Navigation Computer (Japan) | K/I | JP-spec | [naj](naj.md) | BB `ibus.h:34` (`JNAV`) · W `README.md:158` · Wa `:66` · bz `:48` |
| `0xBF` | **GLO** | Global broadcast (every device listens) | K/I | all | [protocol/addressing](../protocol/addressing.md#broadcast) | BB `ibus.h:35` · W `README.md:159` · Wa `:67` · bz `:49` |
| `0xC0` | **MID** | Multi-Information Display | K/I | E38, E39, E53 | [mid](mid.md) | BB `ibus.h:36` · W `README.md:160` · Wa `:68` · bz `:50` |
| `0xC8` | **TEL** | Telephone | K/I | most | [tel](tel.md) | BB `ibus.h:37` · W `README.md:161` · Wa `:69` · bz `:51` |
| `0xCA` | **TCU** | Telematics Control Unit (BMW Assist) | K/I | optional | [tcu](tcu.md) | BB `ibus.h:38` · bz `:61` |
| `0xCD` | **MID** | Multi-Information Display (early variant) | K | E31 | [mid-e31](mid-e31.md) | W `README.md:162` · Wa `:70` |
| `0xD0` | **LCM** (LSZ) | Lamp Check Module / Light Switch Centre | K/I | most | [lcm](lcm.md) | BB `ibus.h:39` · W `README.md:164` · Wa `:71` · bz `:52` |
| `0xDA` | **SMB** (SMAD) | Seat Memory — Passenger | K | E46 | [smb](smb.md) | W `README.md:163` · Wa `:72` · bz `:64` (`SMAD`) |
| `0xE0` | **IRIS** | Integrated Radio and Information System | K | E39 | [iris](iris.md) | BB `ibus.h:40` · W `README.md:165` · Wa `:73` · bz `:53` |
| `0xE7` | **ANZV** | Displays multicast (front displays) | K/I | most | [protocol/addressing](../protocol/addressing.md#multicast) | BB `ibus.h:41` · W `README.md:166` · Wa `:74` · bz `:55` |
| `0xE8` | **RLS** | Rain / Driving-Light Sensor | K | E46+ | [rls](rls.md) | W `README.md:167` · Wa `:75` · bz `:56` |
| `0xEA` | **DSPC** | DSP Controller | K | E38 | [dspc](dspc.md) | W `README.md:168` · Wa `:76` · bz `:39` |
| `0xED` | **VID** (VM) | Video Module / TV Tuner | I | E38, E39 (with TV) | [vid](vid.md) | BB `ibus.h:42` (`VM`) · W `README.md:169` · Wa `:77` · bz `:57` |
| `0xF0` | **BMBT** | On-Board Monitor Control Panel | I | E38, E39, E53 High | [bmbt](bmbt.md) | BB `ibus.h:43` · W `README.md:170` · Wa `:78` · bz `:59` |
| `0xF5` | **SZM** *or* **LKM2** | Centre Console Switch Centre *or* Lamp Control Module 2 (chassis-dependent) | K | E31 (LKM2), most (SZM) | [f5](f5.md) | W `README.md:171–172` · Wa `:79` · bz `:18` (`CSU`) |
| `0xFF` | **LOC** | Bus-local broadcast | K/I | all | [protocol/addressing](../protocol/addressing.md#broadcast) | BB `ibus.h:44` · W `README.md:173` · Wa `:80` · bz `:63` |

### Notes on specific rows with disagreements

#### `0x28` — RCC (Wilhelm) vs FUH (BlueBus)

Both refer to the **radio-controlled clock** in the early E38 (the German abbreviation FUH stands for "Funkuhr"). Same device, two mnemonic traditions. The Wilhelm `README.md` bus assignment (`I`) disagrees with `address.md` (`K`); BlueBus groups the constant with K-Bus-relevant body devices. **Resolution: K-Bus**, per `address.md` and BlueBus context. The README's `I` looks like a slip.

#### `0x47` — FMBT (Wilhelm `README`/bimmerz) vs RCM (Wilhelm `address`)

The `0x47` device is variously called FMBT ("Fond MBT" — rear BMBT) or RCM ("Rear Compartment Monitor"). Both describe the rear-cabin display controls in long-wheelbase E38 entertainment packages. Same device; FMBT is the more recent name. The Wilhelm `address.md` says K-Bus, the README says I-Bus — given it's a nav-stack peripheral on E38 high, **I-Bus** is the correct assignment.

#### `0x66` — ALC (Wilhelm) vs AHL (bimmerz)

Both are headlight-position control. The mnemonic difference is historical: ALC ("Active Light Control") is the older BMW term; AHL ("Adaptive Headlight") is the marketing term for the newer system. **Resolution: same device family**; the canonical row uses ALC since both Wilhelm sources agree on it.

#### `0x71` — SMF (E31, per Wilhelm `README`) vs ZKE5 Mirror-Memory-Driver (per Wilhelm `address`)

Two different devices are assigned to `0x71` depending on chassis:

| Chassis | Device |
|---|---|
| E31 | SMF — Seat Memory, Driver (per Wilhelm `README.md:142`) |
| ZKE5 chassis (E38, E39, etc.) | Mirror Memory, Driver (per Wilhelm `address.md:54`) |

**Resolution:** chassis-dependent. Either claim is consistent with the address-pool-reuse rule.

#### `0x9B` — CVM (E36) vs SPMFT (E46)

Same address, different devices across chassis generations:

| Chassis | Device |
|---|---|
| E36 | CVM — Convertible Soft Top Module |
| E46 | SPMFT — Mirror Memory, Driver |

**Resolution:** chassis-dependent. The bimmerz label `MMR` ("Mirror Memory, Right") corresponds to E46 SPMFT.

#### `0xDA` — SMB (Wilhelm) vs SMAD (bimmerz)

Both refer to the E46 passenger-side seat memory. SMB = "Seat Memory, B-side / Beifahrer (passenger)"; SMAD is a different mnemonic for the same module. **Resolution: SMB**, since both Wilhelm sources use it.

#### `0xF5` — LKM2 (E31) vs SZM (most chassis) vs CSU (bimmerz)

`0xF5` is the centre-console switch panel on most chassis (Wilhelm SZM = "Schaltzentrum-Mittelkonsole"); on the E31 the same address was used for a second lamp-control module (LKM2). bimmerz's "CSU" (Centre Switch Control Unit) is the SZM under a different name. **Resolution: chassis-dependent** — LKM2 on E31, SZM on later chassis.

## Devices known to exist but not yet placed

| Address | Source | Notes |
|---|---|---|
| `0x02` | bimmerz `:6` (`EKM`) | Likely a bimmerz internal renumbering; Wilhelm places EKM at `0x69`. |
| `0x0F` | bimmerz `:10` (`HKM`) | Wilhelm places HKM at `0x24`. Generation difference unclear. |
| `0x52` | bimmerz `:12` (`CVM`) | Wilhelm places CVM at `0x9B`/`0x9C`. |
| `0x81` | bimmerz `:14` (`RCSC`) | "Revolution counter / steering column"; not corroborated. |
| `0xA8` | bimmerz `:11` (`NAVC`) | "Navigation China". Plausible market variant, not confirmed elsewhere. |
| `0xF1` | bimmerz `:13` (`PIC`) | Self-labelled as "custom unit" in bimmerz. Not a stock BMW device. |

These do not get their own device pages until at least one other source confirms them.

## Open questions

- **Exact bus assignment for `0x6B` (STH / Auxiliary Heater).** Wilhelm `address.md:52` hedges with "D-Bus?". This may merit a dedicated investigation pass.
- **Whether `0x73` (SDRS) is K, I, or both.** Sources are silent; given it integrates with the radio (`0x68`), K/I is plausible.
- **The systematic `I`-vs-`K` mismatch in Wilhelm `README.md`** — worth a discussion with the upstream maintainer.

## Page status

Pages linked above whose file does not yet exist are aspirational. As the reference is filled out, each becomes a [device-template](_template.md)-based page; until then the canonical row above is the available information.
