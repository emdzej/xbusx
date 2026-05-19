import { Device, type EventMap } from '@emdzej/ibusx-core'
import { DEVICE_ADDRESSES, type DeviceAddress, type IBusMessage } from '@emdzej/ibusx-protocol'

/**
 * Stub device base.  Used for addresses we know about but haven't yet
 * implemented full codec coverage for.  The twin still appears in the IBus
 * device registry, accepts frames addressed to its address, and can be
 * listed by CLI / TUI / web — but it has no typed state, events, or
 * controls.  Each `docs/devices/<name>.md` page documents what's currently
 * known about the device protocol.
 */
abstract class StubDevice extends Device<object, EventMap> {
  readonly state: Readonly<object> = {}
  handle(_message: IBusMessage): void {
    // No codec coverage yet.  See docs/devices/<name>.md.
  }
}

// Concrete `new (): StubDevice` shape — the inner class is concrete even
// though `StubDevice` itself is abstract.  Returning `typeof StubDevice`
// would propagate the abstract-ness and block `new` in callers.
function stub(name: string, address: DeviceAddress): new () => StubDevice {
  return class extends StubDevice {
    readonly address = address
    readonly name = name
  }
}

// 0x08 — Tilt/Slide Sunroof (K-bus)
export const SHD = stub('SHD', DEVICE_ADDRESSES.SHD)

// 0x24 — Trunk Lid Module (E38, E39)
export const HKM = stub('HKM', DEVICE_ADDRESSES.HKM)

// 0x28 — Radio Clock Control / Funkuhr (E38 early)
export const RCC = stub('RCC', DEVICE_ADDRESSES.RCC)

// 0x2E — Electronic Damper Control (E38, E39)
export const EDC = stub('EDC', DEVICE_ADDRESSES.EDC)

// 0x30 — Check Control Module (E38)
export const CCM = stub('CCM', DEVICE_ADDRESSES.CCM)

// 0x3F — Diagnostics endpoint
export const DIA = stub('DIA', DEVICE_ADDRESSES.DIA)

// 0x40 — Remote Control for Central Locking (E31, older E38)
export const FBZV = stub('FBZV', DEVICE_ADDRESSES.FBZV)

// 0x43 — Rear Graphics Stage (E38)
export const GTF = stub('GTF', DEVICE_ADDRESSES.GTF)

// 0x45 — Anti-Theft System
export const DWA = stub('DWA', DEVICE_ADDRESSES.DWA)

// 0x46 — Central Information Display (E83, E85)
export const CID = stub('CID', DEVICE_ADDRESSES.CID)

// 0x47 — Rear Compartment Monitor / Control Panel (E38)
export const FMBT = stub('FMBT', DEVICE_ADDRESSES.FMBT)

// 0x48 — Japanese telephone variant
export const JBIT = stub('JBIT', DEVICE_ADDRESSES.JBIT)

// 0x51 — Mirror Memory: Passenger
export const SPMBT = stub('SPMBT', DEVICE_ADDRESSES.SPMBT)

// 0x5B — Automatic Climate Control
export const IHKA = stub('IHKA', DEVICE_ADDRESSES.IHKA)

// 0x66 — Active / Adaptive Light Control
export const ALC = stub('ALC', DEVICE_ADDRESSES.ALC)

// 0x69 — Electronic Body Module (E31)
export const EKM = stub('EKM', DEVICE_ADDRESSES.EKM)

// 0x6A — Digital Sound Processor
export const DSP = stub('DSP', DEVICE_ADDRESSES.DSP)

// 0x6B — Standheizung (auxiliary heater)
export const STH = stub('STH', DEVICE_ADDRESSES.STH)

// 0x70 — Tyre-pressure / deflation warning
export const RDC = stub('RDC', DEVICE_ADDRESSES.RDC)

// 0x71 — Seat Memory Driver (E31) / Mirror Memory Driver (ZKE5)
export const SMF_E31 = stub('SMF_E31', DEVICE_ADDRESSES.SMF_E31)

// 0x72 — Seat Memory Driver (E46, E53+)
export const SM = stub('SM', DEVICE_ADDRESSES.SM)

// 0x73 — Sirius Satellite Radio (US-spec)
export const SDRS = stub('SDRS', DEVICE_ADDRESSES.SDRS)

// 0x76 — CD Changer (DIN size)
export const CDCD = stub('CDCD', DEVICE_ADDRESSES.CDCD)

// 0x7F — Navigation Computer: implemented as a full twin in `nav.ts`.

// 0x9A — Automatic Headlight Vertical Aim Control
export const ALWR = stub('ALWR', DEVICE_ADDRESSES.ALWR)

// 0x9C — Convertible Soft Top Module (E46)
export const CVM = stub('CVM', DEVICE_ADDRESSES.CVM)

// 0x9D — Electronic Disconnecting Switch (E38)
export const ETS = stub('ETS', DEVICE_ADDRESSES.ETS)

// 0xA0 — Rear Multi-Functional Display (E38, E39)
export const FID = stub('FID', DEVICE_ADDRESSES.FID)

// 0xA4 — Multiple Restraint System (airbag)
export const MRS = stub('MRS', DEVICE_ADDRESSES.MRS)

// 0xA7 — Rear Compartment Climate Control (E38)
export const FHK = stub('FHK', DEVICE_ADDRESSES.FHK)

// 0xAC — Electronic Height Control
export const EHC = stub('EHC', DEVICE_ADDRESSES.EHC)

// 0xB0 — Speech Input / Recognition System
export const SES = stub('SES', DEVICE_ADDRESSES.SES)

// 0xB9 — Compact Remote Control (RF/IR)
export const RFIR = stub('RFIR', DEVICE_ADDRESSES.RFIR)

// 0xBB — Japanese Navigation
export const NAJ = stub('NAJ', DEVICE_ADDRESSES.NAJ)

// 0xCA — Telematics Control Unit (BMW Assist)
export const TCU = stub('TCU', DEVICE_ADDRESSES.TCU)

// 0xCD — Multi-Information Display (E31)
export const MID_E31 = stub('MID_E31', DEVICE_ADDRESSES.MID_E31)

// 0xDA — Seat Memory: Passenger (E46)
export const SMB = stub('SMB', DEVICE_ADDRESSES.SMB)

// 0xE0 — Integrated Radio and Information System (E39)
export const IRIS = stub('IRIS', DEVICE_ADDRESSES.IRIS)

// 0xEA — DSP Controller (E38)
export const DSPC = stub('DSPC', DEVICE_ADDRESSES.DSPC)

// 0xED — Video Module / TV tuner
export const VID = stub('VID', DEVICE_ADDRESSES.VID)
