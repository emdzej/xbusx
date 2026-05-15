/**
 * Description of one parameter of a control.  The `kind` discriminator drives
 * the UI rendering (enum → dropdown, number → input with min/max, etc.) and
 * runtime validation.
 */
export type ControlParam =
  | {
      kind: 'enum'
      values: readonly string[]
      label?: string
      description?: string
      default?: string
    }
  | {
      kind: 'number'
      min?: number
      max?: number
      step?: number
      label?: string
      description?: string
      default?: number
    }
  | {
      kind: 'string'
      maxLength?: number
      label?: string
      description?: string
      default?: string
    }
  | {
      kind: 'boolean'
      label?: string
      description?: string
      default?: boolean
    }

export type ControlParams = Record<string, ControlParam>

/**
 * Type-level mapping from a `ControlParams` shape to the corresponding
 * argument object the `invoke` function receives.
 */
export type ControlArgs<P extends ControlParams> = {
  [K in keyof P]: P[K] extends { kind: 'enum'; values: readonly (infer V)[] }
    ? V
    : P[K] extends { kind: 'number' }
      ? number
      : P[K] extends { kind: 'string' }
        ? string
        : P[K] extends { kind: 'boolean' }
          ? boolean
          : never
}

export type ControlMode = 'passive' | 'active'

/**
 * A single control — one method the user (via CLI, TUI, or web) can invoke on
 * a device.  Combines a metadata descriptor with a typed `invoke` function.
 */
export interface ControlDescriptor<TDevice, P extends ControlParams = ControlParams> {
  label: string
  description?: string
  /** Required device mode to invoke this control.  `active` controls
   *  refuse to run unless the device's mode is `active`. */
  requires?: ControlMode
  params: P
  invoke(device: TDevice, args: ControlArgs<P>): void | Promise<void>
}

/**
 * Manifest of all controls a device exposes.  Each device class typically
 * defines this as a `const`-asserted object and applies it via `satisfies`
 * so per-control types are preserved at the call site:
 *
 * ```ts
 * export const MFLControls = {
 *   pressButton: {
 *     label: 'Press button',
 *     requires: 'active',
 *     params: {
 *       button: { kind: 'enum', values: ['forward', 'back'] as const },
 *     },
 *     invoke: (d: MFL, a) => d.pressButton(a.button),
 *   },
 * } as const satisfies ControlsManifest<MFL>
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: per-control param type widens
export type ControlsManifest<TDevice> = Record<string, ControlDescriptor<TDevice, any>>
