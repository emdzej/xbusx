# Message index

**Status:** Draft.

Every known command byte on the I/K-bus, sorted ascending. For each: what it's called, who originates it, who consumes it, where to read the details.

**The same command byte means different things depending on source and destination.** This table tries to disambiguate by listing each `(SRC, DST)` combination separately where they differ; some rows are unavoidably ambiguous (e.g., `0x21` is used by three devices for three different purposes).

## Quick navigation

- Diagnostic / module-presence: [`0x00`–`0x06`](#0x00--0x06)
- Cluster / vehicle state: [`0x10`–`0x1F`](#0x10--0x1f)
- Display writes: [`0x20`–`0x2F`](#0x20--0x2f)
- User input / button events: [`0x30`–`0x3F`](#0x30--0x3f)
- OBC / GT-RAD UI: [`0x40`–`0x4F`](#0x40--0x4f)
- Check-control / cluster indicators: [`0x50`–`0x5F`](#0x50--0x5f)
- GT writes / TMC / MRS: [`0x60`–`0x7F`](#0x60--0x7f)
- HVAC / climate: [`0x80`–`0x8F`](#0x80--0x8f)
- Telematics / nav / TEL extended: [`0xA0`–`0xAF`](#0xa0--0xaf)
- BlueBus / extended: [`0xB0`–`0xFF`](#0xb0--0xff)

---

## 0x00 – 0x06

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x00` | Ident response (diagnostic) | LCM, others | DIA `0x3F` | [lcm](devices/lcm.md), [gt](devices/gt.md) |
| `0x01` | Ping | any | any | [overview](overview.md), [02.md (Wilhelm)] |
| `0x02` | Pong / Announce | any | broadcast / unicast | per device — see each page |
| `0x05` | BMBT Service Mode Request | GT `0x3B` | BMBT `0xF0` | [bmbt](devices/bmbt.md) |
| `0x06` | BMBT Service Mode Reply | BMBT `0xF0` | GT `0x3B` | [bmbt](devices/bmbt.md#0x06--service-mode-reply) |
| `0x07` | PDC Status | PDC `0x60` | broadcast | [pdc](devices/pdc.md) |
| `0x0B` | Diagnostic Read IO Status | DIA `0x3F` | LCM `0xD0` | [lcm](devices/lcm.md) |
| `0x0C` | Diagnostic Activate / Job Request | DIA `0x3F` | LCM `0xD0`, GM `0x00` | [lcm](devices/lcm.md), [gm](devices/gm.md) |

## 0x10 – 0x1F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x10` | Ignition Status Request | any | IKE `0x80` | [ike](devices/ike.md#0x10--ignition-status-request--0x11--ignition-status) |
| `0x11` | Ignition Status | IKE `0x80` | `0xBF` | [ike](devices/ike.md), [ignition-state](subsystems/ignition-state.md) |
| `0x12` | Sensors Request | any | IKE `0x80` | [ike](devices/ike.md) |
| `0x13` | Sensors | IKE `0x80` | `0xBF` | [ike](devices/ike.md#0x12--sensors-request--0x13--sensors) |
| `0x14` | Language/Region Request | any | IKE `0x80` | [ike](devices/ike.md) |
| `0x15` | Language & Region / Vehicle Config | IKE `0x80` | `0xBF` | [ike](devices/ike.md#0x14--languageregion-request--0x15--vehicle-config--language--region) |
| `0x16` | Odometer Request | any | IKE `0x80` | [ike](devices/ike.md) |
| `0x17` | Odometer | IKE `0x80` | `0xBF` | [ike](devices/ike.md#0x16--odometer-request--0x17--odometer) |
| `0x18` | Speed / RPM | IKE `0x80` | `0xBF` | [ike](devices/ike.md#0x18--speed--rpm-update) |
| `0x19` | Temperature | IKE `0x80` | `0xBF` | [ike](devices/ike.md#0x19--temperature--0x1d--temperature-request) |
| `0x1A` | Check Control Message | CCM `0x30` / IKE-internal | IKE `0x80` | [ccm](devices/ccm.md#0x1a--check-control-message) |
| `0x1B` | Check Control Priority **/** PDC Sensor Request | varies | varies | [pdc](devices/pdc.md) (PDC variant) |
| `0x1D` | Temperature Request | any | IKE `0x80` | [ike](devices/ike.md) |
| `0x1F` | GPS Time | NAV `0x7F` | IKE `0x80` | [nav](devices/nav.md), [gt](devices/gt.md#0x1f--gps-time-received-from-nav) |

## 0x20 – 0x2F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x20` | MID Button **/** Change UI Request **/** Telephone Mode | varies | varies | [mid](devices/mid.md), [gt](devices/gt.md), [tel](devices/tel.md) |
| `0x21` | Menu Text (TEL/RAD) **/** Write No-Cursor (GT) **/** C43 Screen Update (RAD) | varies | varies | [tel](devices/tel.md#0x21--menu-text), [gt](devices/gt.md), [rad](devices/rad.md) |
| `0x22` | Menu Buffer Status | GT `0x3B` | broadcast | [gt](devices/gt.md) |
| `0x23` | Title Text | RAD, TEL, IKE | GT, MID, IKE, `0xE7` | [rad](devices/rad.md#0x23--title-text-update-main-area), [tel](devices/tel.md#0x23--title-text) |
| `0x24` | Property Text | IKE, TEL | `0xE7`, MID, GT | [ike](devices/ike.md#0x24--obc-text-multicast), [tel](devices/tel.md#0x24--property-text) |
| `0x27` | Set Mode | TEL `0xC8` | MID `0xC0` | [mid](devices/mid.md#0x27--set-mode-dst) |
| `0x2A` | OBC Status | IKE `0x80` | `0xE7` | [ike](devices/ike.md#0x2a--obc-status-multicast) |
| `0x2B` | Telephone LEDs | TEL `0xC8` | `0xE7` | [tel](devices/tel.md#0x2b--led-status) |
| `0x2C` | Telephone Status | TEL `0xC8` | `0xE7` | [tel](devices/tel.md#0x2c--status) |
| `0x2D` | Telephone Direct Dial | GT `0x3B` | TEL `0xC8` | [tel](devices/tel.md#0x2d--direct-dial-dst) |

## 0x30 – 0x3F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x31` | Menu Select **/** Menu Button **/** MID Button Press | varies | varies | [mid](devices/mid.md#0x31--button-press), [gt](devices/gt.md), [tel](devices/tel.md#0x31--menu-button-dst) |
| `0x32` | Volume | MFL `0x50`, BMBT `0xF0`, RAD `0x68` | RAD, TEL | [mfl](devices/mfl.md#0x32--volume-control), [bmbt](devices/bmbt.md#0x32--volume), [rad](devices/rad.md) |
| `0x33` | Radio Playback Control | RAD `0x68` | broadcast | [rad](devices/rad.md) |
| `0x34` | DSP Control | varies | DSP `0x6A` | [dsp](devices/dsp.md) |
| `0x36` | Radio EQ **/** DSP Config Set | RAD `0x68` | GT, DSP | [rad](devices/rad.md#0x36--eq-tone-0x37--toneselect-menu), [dsp](devices/dsp.md#0x36--config-set) |
| `0x37` | Radio Tone/Select **/** Display Radio Menu | RAD, GT | GT, RAD | [rad](devices/rad.md), [gt](devices/gt.md) |
| `0x38` | CDC Request | RAD `0x68` | CDC `0x18` | [cdc](devices/cdc.md#0x38--cdc-request), [cdc-emulation](subsystems/cdc-emulation.md) |
| `0x39` | CDC Status | CDC `0x18` | RAD `0x68` | [cdc](devices/cdc.md#0x39--cdc-status-response) |
| `0x3B` | MFL Buttons | MFL `0x50` | RAD, TEL | [mfl](devices/mfl.md#0x3b--button-press) |

## 0x40 – 0x4F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x40` | OBC Input | GT `0x3B` | IKE `0x80` | [gt](devices/gt.md#0x40--obc-input), [obc-display](subsystems/obc-display.md) |
| `0x41` | OBC Control | GT `0x3B` | IKE `0x80` | [gt](devices/gt.md#0x41--obc-control), [obc-display](subsystems/obc-display.md) |
| `0x42` | OBC Remote Control | varies | IKE `0x80` | [ike](devices/ike.md) |
| `0x44` | IKE Write Numeric | any | IKE `0x80` | [ike](devices/ike.md) |
| `0x45` | Set Radio UI | GT `0x3B` | RAD `0x68` | [radio-gt-arbitration](subsystems/radio-gt-arbitration.md), [gt](devices/gt.md#0x45--set-radio-ui) |
| `0x46` | Request Radio UI | RAD `0x68` | GT `0x3B` | [rad](devices/rad.md#0x46--screen-mode-update--request-ui), [radio-gt-arbitration](subsystems/radio-gt-arbitration.md) |
| `0x47` | BMBT Soft Buttons | BMBT `0xF0` | `0xBF` | [bmbt](devices/bmbt.md#0x47--soft-buttons-widescreen-only) |
| `0x48` | BMBT Hard Buttons | BMBT `0xF0` | GT, RAD, `0xFF` | [bmbt](devices/bmbt.md#0x48--hard-buttons) |
| `0x49` | BMBT Navigation Dial | BMBT `0xF0` | GT `0x3B` | [bmbt](devices/bmbt.md#0x49--navigation-dial) |
| `0x4A` | BMBT Tape / LED Control | RAD `0x68` | BMBT `0xF0` | [bmbt](devices/bmbt.md#0x4a--tape--led-control-dst) |
| `0x4B` | BMBT Tape Status | BMBT `0xF0` | RAD `0x68` | [bmbt](devices/bmbt.md) |
| `0x4E` | Radio Input Source | GT `0x3B` | RAD `0x68` | [rad](devices/rad.md) |
| `0x4F` | BMBT Monitor Control | GT, VID | BMBT `0xF0` | [bmbt](devices/bmbt.md#0x4f--monitor-control), [gt](devices/gt.md), [vid](devices/vid.md) |

## 0x50 – 0x5F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x50` | Check Control Status Request | any | LCM / CCM | [lcm](devices/lcm.md), [ccm](devices/ccm.md) |
| `0x51` | Check Control Status | LCM / CCM | broadcast | [lcm](devices/lcm.md#0x51--check-control-status-1-byte-low-cluster-chassis-only), [ccm](devices/ccm.md) |
| `0x52` | Check Control Message Relay | CCM / LCM | IKE `0x80` | [ccm](devices/ccm.md) |
| `0x53` | Redundant Data Request | IKE `0x80` | LCM `0xD0` | [ike](devices/ike.md), [lcm](devices/lcm.md), [obc-display](subsystems/obc-display.md) |
| `0x54` | Redundant Data | LCM `0xD0` | IKE `0x80` | [lcm](devices/lcm.md) |
| `0x55` | Replicate Data | IKE `0x80` | broadcast | [ike](devices/ike.md), [obc-display](subsystems/obc-display.md) |
| `0x57` | Cluster Buttons | IKE `0x80` | broadcast | [ike](devices/ike.md) |
| `0x58` | RLS → GM (TBC) | RLS `0xE8` | GM `0x00` | [rls](devices/rls.md) |
| `0x59` | Light Sensor Status | RLS `0xE8` | LCM `0xD0` | [rls](devices/rls.md#0x59--light-sensor-status) |
| `0x5A` | Cluster Indicators Request | any | LCM `0xD0` | [lcm](devices/lcm.md#0x5a--cluster-indicators-request) |
| `0x5B` | Cluster Indicators | LCM `0xD0` | broadcast | [lcm](devices/lcm.md#0x5b--cluster-indicators) |
| `0x5C` | Instrument Backlighting / Dimmer Status | LCM `0xD0` | broadcast | [lcm](devices/lcm.md) |
| `0x5D` | Instrument Backlighting Request | any | LCM `0xD0` | [lcm](devices/lcm.md) |

## 0x60 – 0x7F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x60` | GT Write Index | GT `0x3B` | broadcast | [gt](devices/gt.md) |
| `0x61` | GT Write Index TMC **/** EHC → GLO (TBC) | varies | varies | [gt](devices/gt.md), [ehc](devices/ehc.md) |
| `0x62` | GT Write Zone | GT `0x3B` | broadcast | [gt](devices/gt.md) |
| `0x63` | GT Write Static (MKIV_STATIC only) | GT `0x3B` | broadcast | [gt](devices/gt.md) |
| `0x70` | MRS → GLO (TBC) | MRS `0xA4` | `0xBF` | [mrs](devices/mrs.md) |
| `0x71` | Remote Keyless Entry Request | any | GM `0x00` | [gm](devices/gm.md) |
| `0x72` | Remote Keyless Entry | GM `0x00` | broadcast | [gm](devices/gm.md), [door-locks](subsystems/door-locks-zke3-vs-zke5.md#remote-key-entry-0x72) |
| `0x73` | Key Status Request | any | EWS `0x44` | [ews](devices/ews.md) |
| `0x74` | Key Status | EWS `0x44` | broadcast | [ews](devices/ews.md) |
| `0x75` | RLS → GM (TBC) | RLS `0xE8` | GM `0x00` | [rls](devices/rls.md) |
| `0x76` | Visual Indicators | any | GM `0x00` | [gm](devices/gm.md#0x76--visual-indicators) |
| `0x77` | GM → RLS (TBC) | GM `0x00` | RLS `0xE8` | [rls](devices/rls.md) |
| `0x78` | Memory | varies | varies | (no per-device page) |
| `0x79` | Door / Lid Status Request | any | GM `0x00` | [gm](devices/gm.md#0x79--door--lid-status-request) |
| `0x7A` | Door / Lid Status | GM `0x00` | broadcast | [gm](devices/gm.md#0x7a--door--lid-status-response) |
| `0x7C` | SHD → GLO (TBC) | SHD `0x08` | `0xBF` | [shd](devices/shd.md) |
| `0x7D` | GM → SHD (TBC) | GM `0x00` | SHD `0x08` | [shd](devices/shd.md) |

## 0x80 – 0x8F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x82` | IHKA → GLO (TBC) | IHKA `0x5B` | `0xBF` | [ihka](devices/ihka.md) |
| `0x83` | IHKA AC Control | varies | IHKA `0x5B` | [ihka](devices/ihka.md) |
| `0x86` | IHKA → Nav (TBC) | IHKA `0x5B` | NAV `0x7F` | [ihka](devices/ihka.md) |
| `0x87` | Nav → IHKA (TBC) | NAV `0x7F` | IHKA `0x5B` | [ihka](devices/ihka.md) |

## 0x90 – 0x9F

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0x90` | LCM IO Status | LCM `0xD0` | DIA `0x3F` | [lcm](devices/lcm.md#0x90--io-status-diagnostic) |
| `0x9E` | GT → RCM (TBC) | GT `0x3B` | RCM | (no page; Wilhelm `README.md:294`) |

## 0xA0 – 0xAF

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0xA0` | PDC Sensor Response **/** Diagnostic Response | PDC `0x60`, DIA | varies | [pdc](devices/pdc.md#0xa0--sensor-response) |
| `0xA2` | Telematics Coordinates | NAV `0x7F` | TEL `0xC8` | [nav](devices/nav.md), [gt](devices/gt.md) |
| `0xA4` | Telematics Location | NAV `0x7F` | TEL `0xC8` | [nav](devices/nav.md), [gt](devices/gt.md) |
| `0xA5` | Body Text **/** Write with Cursor | TEL, GT | various | [tel](devices/tel.md#0xa5--body-text-with-cursor-offset), [gt](devices/gt.md) |
| `0xA6` | SMS Icon | TEL `0xC8` | `0xE7` | [tel](devices/tel.md#0xa6--sms-icon) |
| `0xA7` | Traffic Management Channel Request | various | NAV / TMC | (no per-device page) |
| `0xA8` | Traffic Management Channel | NAV `0x7F` | various | [nav](devices/nav.md) |
| `0xA9` | BMW Assist Data | TCU `0xCA` | various | [tcu](devices/tcu.md) |
| `0xAA` | Navigation Control | GT, GTF, SES | NAV `0x7F` | [nav](devices/nav.md), [gt](devices/gt.md#0xaa--navigation-control), [ses](devices/ses.md) |
| `0xAB` | Navigation View Status | NAV `0x7F` | GTF `0x43` | [nav](devices/nav.md), [gtf](devices/gtf.md) |
| `0xAF` | Nav → SES (TBC) | NAV `0x7F` | SES `0xB0` | [ses](devices/ses.md) |

## 0xB0 – 0xFF

| Cmd | Name | `SRC` | `DST` | Page |
|---|---|---|---|---|
| `0xBB` | `IBUS_BLUEBUS_CMD_SET_STATUS` | BlueBus-internal | — | (BlueBus extension; `ibus.h:510`) |
| `0xBC` | `IBUS_BLUEBUS_CARPHONICS_EXTERNAL_CONTROL` | BlueBus-internal | — | (BlueBus extension; `ibus.h:509`) |
| `0xC0` | RAD C43 Set Menu Mode | RAD `0x68` | GT `0x3B` | [rad](devices/rad.md) |
| `0xC4` | RAD C43 Title Mode | RAD `0x68` | — | [rad](devices/rad.md) |
| `0xD4` | NG-Radio Station List | RAD `0x68` (BM54) | GT `0x3B` | [rad](devices/rad.md#0xd4--ng-radio-station-list-bm54-only) |

---

## How to use this index

- **Looking up a frame from a capture:** find the command byte's row, identify the most likely `(SRC, DST)` pair, follow the link.
- **Disambiguating overloaded bytes:** rows like `0x21` and `0x32` list multiple `(SRC, DST)` combinations. Match on the *full triple* `(SRC, DST, CMD)` not just on `CMD`.
- **TBC entries:** rows where Wilhelm's command index references the command but no detail exists. Treat as guidance — capture and characterise on a real vehicle if you need to use the byte.

## Open questions / TBC

- **Frames not yet catalogued.** This index covers what's documented across the surveyed sources. There are likely 30–50 more command bytes that appear in real traffic but aren't documented anywhere — capture-driven enumeration is the next step.
- **Per-`(SRC, DST, CMD)` semantics tables.** The biggest gap is fully disambiguating overloaded bytes (`0x21`, `0x32`, `0x36`, `0x4F`). Per-device pages have most of the information; consolidating into a `(SRC, DST, CMD)`-keyed lookup table is left for a future pass.
