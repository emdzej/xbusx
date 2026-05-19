import { TypedEmitter } from './emitter.js'

export type ChassisType =
  | 'E31'
  | 'E38'
  | 'E39'
  | 'E46'
  | 'E52'
  | 'E53'
  | 'E83'
  | 'E85'
  | 'E86'
  | 'E87'
  | 'R50'

export type IgnitionState = 'OFF' | 'KL_R' | 'KL_15' | 'KL_50'

export interface BusSet {
  K: boolean
  I: boolean
}

/**
 * Per-device variant identifiers learned at runtime.  Each field stays
 * `undefined` until something on the bus reveals the variant.
 */
export interface VehicleVariants {
  ike?: 'KOMBI' | 'IKE' | 'IKI'
  gm?: string
  lcm?: string
  rad?: string
  gt?: string
}

export type VehicleEvents = {
  ignitionChanged: { from: IgnitionState; to: IgnitionState }
  variantsDetected: Partial<VehicleVariants>
  chassisIdentified: ChassisType
}

export interface VehicleInit {
  chassis?: ChassisType
  buses?: Partial<BusSet>
  ignition?: IgnitionState
  variants?: Partial<VehicleVariants>
}

const VARIANT_KEYS: ReadonlyArray<keyof VehicleVariants> = ['ike', 'gm', 'lcm', 'rad', 'gt']

/**
 * Shared mutable state about the car that crosses device boundaries.
 *
 * A `Vehicle` is created once and passed to one or more `IKBus` instances
 * (on K+I chassis, two IBuses share a single Vehicle).  Devices read it to
 * dispatch correctly (e.g. ZKE3 vs ZKE5 lock commands) and write to it when
 * they discover new information (e.g. the IKE writes its variant on detect).
 */
export class Vehicle {
  chassis: ChassisType | undefined
  buses: BusSet
  ignition: IgnitionState
  variants: VehicleVariants
  readonly events: TypedEmitter<VehicleEvents>

  constructor(init: VehicleInit = {}) {
    this.chassis = init.chassis
    this.ignition = init.ignition ?? 'OFF'
    this.variants = { ...(init.variants ?? {}) }
    this.events = new TypedEmitter<VehicleEvents>()

    if (init.buses !== undefined) {
      this.buses = { K: init.buses.K ?? true, I: init.buses.I ?? false }
    } else if (init.chassis !== undefined) {
      this.buses = busSetForChassis(init.chassis)
    } else {
      this.buses = { K: true, I: false }
    }
  }

  /** Set the chassis type and derive default bus topology. */
  setChassis(chassis: ChassisType): void {
    if (this.chassis === chassis) return
    this.chassis = chassis
    this.buses = busSetForChassis(chassis)
    this.events.emit('chassisIdentified', chassis)
  }

  /** Set the ignition state.  Emits `ignitionChanged` only on actual change. */
  setIgnition(next: IgnitionState): void {
    if (this.ignition === next) return
    const previous = this.ignition
    this.ignition = next
    this.events.emit('ignitionChanged', { from: previous, to: next })
  }

  /**
   * Merge in newly-detected variant identifiers.  Emits `variantsDetected`
   * only with the subset of keys whose values actually changed.
   */
  setVariants(updates: Partial<VehicleVariants>): void {
    const changed: Partial<VehicleVariants> = {}
    let hasChange = false
    for (const key of VARIANT_KEYS) {
      const incoming = updates[key]
      if (incoming === undefined) continue
      if (this.variants[key] !== incoming) {
        // biome-ignore lint/suspicious/noExplicitAny: narrow assignment by key
        ;(changed as any)[key] = incoming
        // biome-ignore lint/suspicious/noExplicitAny: narrow assignment by key
        ;(this.variants as any)[key] = incoming
        hasChange = true
      }
    }
    if (hasChange) this.events.emit('variantsDetected', changed)
  }
}

/**
 * Default bus topology for a known chassis.  Mirrors the matrix in
 * `docs/overview.md`.  E31 is I-only; gateway chassis (E38/E39/E53) are K+I;
 * everything else is K-only.
 */
export function busSetForChassis(chassis: ChassisType): BusSet {
  switch (chassis) {
    case 'E31':
      return { K: false, I: true }
    case 'E38':
    case 'E39':
    case 'E53':
      return { K: true, I: true }
    case 'E46':
    case 'E52':
    case 'E83':
    case 'E85':
    case 'E86':
    case 'E87':
    case 'R50':
      return { K: true, I: false }
  }
}
