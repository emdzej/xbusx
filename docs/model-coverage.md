# Model coverage

**Status:** Draft.

This page consolidates what varies across BMW chassis on the I/K-bus. Most of this information is also documented on individual device pages — this is the single-page summary, useful when porting software from one chassis to another.

## Chassis × bus matrix

| Chassis | Series | Period | I-Bus | K-Bus | Gateway |
|---|---|---|:-:|:-:|:-:|
| E31 | 8 Series | 1989–1999 | ✅ |  |  |
| E38 | 7 Series | 1994–2001 | ✅ | ✅ | IKE |
| E39 | 5 Series | 1995–2004 | ✅ | ✅ | IKE |
| E46 | 3 Series | 1997–2006 |  | ✅ |  |
| E52 | Z8 | 2000–2003 |  | ✅ |  |
| E53 | X5 | 1999–2006 | ✅ | ✅ | IKE |
| E83 | X3 | 2003–2010 |  | ✅ |  |
| E85 | Z4 Roadster | 2002–2008 |  | ✅ |  |
| E86 | Z4 Coupé | 2005–2008 |  | ✅ |  |
| E87 | 1 Series | 2004–2013 |  | ✅ |  |
| R50/R52/R53 | MINI | 2000–2006 |  | ✅ |  |

> *Source:* Wilhelm `README.md:41–53`; cross-checked against BlueBus's supported-platform list.

## BlueBus vehicle-type detection

BlueBus collapses the chassis matrix into four internal types based on the upper nibble of `0x15` byte 1 (vehicle config, broadcast by IKE):

| `0x15` DB1 upper nibble | BlueBus type | Chassis |
|---|---|---|
| `0x0` | `IBUS_VEHICLE_TYPE_E38_E39_E52_E53` (`0x01`) | E38, E39, E52, E53 with high OBC |
| `0x2` | `IBUS_VEHICLE_TYPE_E38_E39_E52_E53` (`0x01`) | E38, E39, E53 with low OBC |
| `0xA` | `IBUS_VEHICLE_TYPE_E46` (`0x02`) | E46 / Z4 |
| `0xF` | `IBUS_VEHICLE_TYPE_E46` (`0x02`) | E46 / Z4 |
| (other) | `IBUS_VEHICLE_TYPE_E8X` (`0x03`) | E83, E85, E86 |
| (other) | `IBUS_VEHICLE_TYPE_R50` (`0x04`) | R50/R52/R53 MINI |

> *Source:* BlueBus `ibus.h:561–576`, `handler_ibus.c:1087–1117`. The E8X / R50 cases use additional discrimination beyond the IKE nibble.

## Per-device variation

### Instrument cluster (IKE / IKI / KOMBI)

- **KOMBI (low cluster):** E46, E83/E85/E86, R50. Limited OBC; sensor frame `0x13` payload is 3 bytes.
- **IKE (high cluster, early):** E38, E39, E53 High pre-October 2001. Full OBC; `0x13` payload 3 bytes.
- **IKI (high cluster, late):** E38, E39, E53 High from October 2001. Full OBC; `0x13` payload extended to **7 bytes** with engine-failsafe / ACC / DSC / fuel-level fields.

> *Source:* Wilhelm `ike/13.md:5–9`; BlueBus `ibus.h:565–566`.

### Light module (LCM)

Eight variants, detected by diagnostic-index (DI) and coding-index (CI) bytes returned in the `0x00` ident response:

| Variant | Detection rule | Chassis | Battery scale |
|---|---|---|---|
| LME38  | `DI < 0x10`                                  | E38 early                | 136 |
| LCM    | `DI == 0x10`                                 | E38, E39 (mid)           | 136 |
| LCM_A  | `DI == 0x11`                                 | E39 variant              | 136 |
| LCM_II | `DI == 0x12 && CI == 0x16`                   | E39, E46 (early)         | 136 |
| LCM_III| `(DI == 0x12 && CI == 0x17) || DI == 0x13`   | E39, E46                 | 136 |
| LCM_IV | `DI == 0x14`                                 | E46 late, E8X            | 132 |
| LSZ    | `0x20 ≤ DI ≤ 0x2F`                           | E6x+                     | 136 |
| LSZ_2  | `0x30 ≤ DI ≤ 0x40`                           | E8X+                     | 132 |

> *Source:* BlueBus `ibus.h:375–383`, `ibus.c:1477–1515`. Full per-variant byte-offset table is on [`devices/lcm.md`](devices/lcm.md#variants).

### Body module (GM / ZKE)

Eight generations:

| Variant | BlueBus constant | Notes |
|---|---|---|
| ZKE3 GM1 | `IBUS_GM_ZKE3_GM1` | E39 Touring 6/97 baseline; 4-byte job request. |
| ZKE3 GM4 | `IBUS_GM_ZKE3_GM4` | E31/E38. Distinct job codes from GM1. |
| ZKE3 GM5 | `IBUS_GM_ZKE3_GM5` | E46/E53 touring. Lock-high/low. |
| ZKE3 GM6 | `IBUS_GM_ZKE3_GM6` | E46/E53 sedan. Lock-all only. |
| ZKE4     | `IBUS_GM_ZKE4`     | Undocumented in surveyed sources. |
| ZKE5     | `IBUS_GM_ZKE5`     | E46/E8X. 3-byte job request. |
| ZKE5_S12 | `IBUS_GM_ZKE5_S12` | Undocumented variant. |
| ZKEBC1   | `IBUS_GM_ZKEBC1`   | Highly integrated post-CAN. |
| ZKEBC1RD | `IBUS_GM_ZKEBC1RD` | Retrofit / diagnostic variant. |

> *Source:* BlueBus `ibus.h:580–589`. Full lock-job table is on [`devices/gm.md`](devices/gm.md#messages-where-gm-is-dst).

### Graphics terminal (GT)

Six generations:

| Variant | Notes |
|---|---|
| MK1 | First-gen navigation. |
| MK2 | Second-gen. |
| MK3 | Standard UI. |
| MK3 new UI | MK3 with SW version ≥ 40 — "new UI". |
| MK4 | Fourth-gen. |
| MK4 static | MK4 with SW version ≥ 40 — supports static screens (`0x63`). |

> *Source:* BlueBus `ibus.h:241–249`. Detection at fixed offsets `IBUS_GT_HW_ID_OFFSET 11`, `IBUS_GT_DI_ID_OFFSET 15`, `IBUS_GT_SW_ID_OFFSET 33` from the diagnostic ident response (`ibus.h:250–252`).

### Radio (RAD)

Six radio types — variant inferred from message patterns rather than from an explicit announce signature:

| Variant | Constant |
|---|---|
| C43 | `IBUS_RADIO_TYPE_C43 1` |
| BM53 | `IBUS_RADIO_TYPE_BM53 2` |
| BM54 | `IBUS_RADIO_TYPE_BM54 3` |
| BRCD | `IBUS_RADIO_TYPE_BRCD 4` |
| BRTP | `IBUS_RADIO_TYPE_BRTP 5` |
| BM24 | `IBUS_RADIO_TYPE_BM24 6` |

> *Source:* BlueBus `ibus.h:519–525`. See [`devices/rad.md`](devices/rad.md#variants).

### Telephone (TEL)

Three announce variants:

| Variant | Signature | Era |
|---|---|---|
| CMT3000 | `0x00` | Original cradle-based GSM. |
| Motorola V-Series | `0x30` | Discrete handset. |
| Everest / Bluetooth | `0x38` | Bluetooth-integrated. |

> *Source:* Wilhelm `02.md:100–105`. BMW Assist's TCU at `0xCA` is a separate address — see [`devices/tcu.md`](devices/tcu.md).

### BMBT

Four variants (signatures from `0x02` announce):

| Variant | Signature |
|---|---|
| 4×3 (tape) | `0x00` |
| 16×9 (tape) | `0x30` |
| 16×9 CD | `0x70` |
| 16×9 MD | `0xB0` |

> *Source:* Wilhelm `02.md:42–45`.

### NAV

Two variant signatures: `0x40` (MK4-ish, base) and `0xC0` (MK4-ish + BMW Assist).

> *Source:* Wilhelm `02.md:88–96`.

## Chassis-dependent address reassignment

A handful of addresses host **different devices on different chassis**. The address-pool reuse rule (Wilhelm `README.md:108–109`) means once an address is allocated it stays bound to *some* device, even if the original device disappears.

| Address | E31 / earlier | Later chassis |
|---|---|---|
| `0x71` | SMF (Seat Memory Driver) | Mirror Memory Driver (ZKE5) |
| `0x9B` | CVM (Convertible top, E36) | SPMFT (Mirror Memory Driver, E46) |
| `0xF5` | LKM2 (Lamp Control Module 2, E31) | SZM (Centre Console Switch Centre) |

See:
- [`devices/sm-driver.md`](devices/sm-driver.md) for `0x71`.
- [`devices/9b.md`](devices/9b.md) for `0x9B`.
- [`devices/f5.md`](devices/f5.md) for `0xF5`.

## Bus assignment varies by chassis

A device whose protocol surface is K/I-bus might in practice ride **only K** on K-only chassis because the I-Bus does not exist there:

| Device | E38/E39/E53 High | E46 / E8X / E87 |
|---|---|---|
| IKE (`0x80`) | K/I (acts as gateway) | K only |
| MFL (`0x50`) | K/I | K only |
| MID (`0xC0`) | K/I | K only |
| RAD (`0x68`) | K/I | K only |
| CDC (`0x18`) | K/I | K only |
| DSP (`0x6A`) | K/I | K only |
| PDC (`0x60`) | K/I | K only |
| LCM (`0xD0`) | K/I | K only |
| GT (`0x3B`) | I | (absent) |
| BMBT (`0xF0`) | I | (absent) |
| NAV (`0x7F`) | K/I | (absent) |

## Region-specific variants

| Region | Variant |
|---|---|
| Europe (default) | NAV `0x7F`, TEL CMT3000 / Motorola V / Everest |
| Japan | JBIT `0x48`, NAJ (Japanese NAV) `0xBB` |
| US (US-spec radio packages) | SDRS (Sirius satellite radio) `0x73` |

## Notable chassis-specific quirks

### E31

- Uses I-Bus only — body electronics ride on the I-Bus rather than a separate K-Bus.
- EKM at `0x69` (body module, predecessor to GM `0x00`).
- LKM2 at `0xF5` (second lamp control module).
- SMF at `0x71` (seat memory).
- MID at `0xCD` (early variant).
- FBZV at `0x40` (key fob receiver — predecessor of the integrated remote-key-entry in later GMs).

### E38

- The "full nav stack" chassis — GT, BMBT, NAV all present. Long-wheelbase variants add FMBT, GTF, FID for rear-seat duplication, FHK for rear climate, RCC for radio-clock, EHC for self-levelling, ETS at `0x9D`.
- Has the discrete CCM at `0x30` for check-control messages; later chassis fold this into IKE.
- ZKE-III body module (`0x00`) — uses 4-byte diagnostic-job lock commands.
- Early E38s use LME38 light module — distinct byte layout from later LCMs.

### E39

- Like E38, but with the IRIS at `0xE0` available as an integrated radio+display unit on some trim levels.
- Sport-package variants have EDC at `0x2E`.

### E46

- K-Bus only. No GT, no BMBT, no NAV.
- ZKE-V (`IBUS_GM_ZKE5`) — uses 3-byte diagnostic-job lock commands, *different from* E38/E39's ZKE-III.
- Mirror-memory addresses reassigned (see chassis-dependent reassignment above).
- Convertible variants have CVM at `0x9C` (and SPMFT at `0x9B`).
- IKE is "low cluster" (KOMBI) — no full OBC.

### E83 / E85 / E86

- K-Bus only.
- CID at `0x46` — small flip-up LCD in the centre console.
- ZKE-V family GM.

### E87

- K-Bus only, latest of the listed chassis.
- Many modules use newer LCM / LSZ variants (LSZ_2).

### R50/R52/R53 MINI

- K-Bus only.
- BlueBus has dedicated detection (`IBUS_VEHICLE_TYPE_R50`).

---

## Open questions / TBC

- **E87 specifics** — most of E87's device set is undocumented in the surveyed sources; it's at the boundary of where BMW transitioned to FlexRay / MOST / fully-CAN, with the I/K-bus playing a reduced role.
- **MINI specifics** — BlueBus has the R50 detection but no R50-specific message coverage in the surveyed code.
- **Year-of-transition for IKE → IKI on E53** — Wilhelm dates the transition to October 2001 for E38/E39 but says nothing about E53. TBC.

---

## Sources

This page consolidates per-device facts; the underlying citations are on the device pages. Cross-cutting references:

- BlueBus `firmware/application/lib/ibus.h:241–249, 375–383, 519–525, 561–576, 580–589` — variant enums.
- Wilhelm `README.md:41–53` — chassis × bus matrix.
- Wilhelm `02.md:42–45, 88–96, 100–105, 108–114` — variant announce tables.
- [`devices/`](devices/) per-device pages — chassis-specific notes are in each "Variants" and "Open questions" section.
