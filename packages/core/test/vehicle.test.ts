import { describe, expect, it, vi } from 'vitest'
import { busSetForChassis, Vehicle } from '../src/vehicle.js'

describe('Vehicle', () => {
  it('defaults to KL-30, no chassis, K-only bus topology', () => {
    const v = new Vehicle()
    expect(v.chassis).toBeUndefined()
    expect(v.ignition).toBe('OFF')
    expect(v.buses).toEqual({ K: true, I: false })
  })

  it('derives bus topology from chassis at construction', () => {
    expect(new Vehicle({ chassis: 'E31' }).buses).toEqual({ K: false, I: true })
    expect(new Vehicle({ chassis: 'E38' }).buses).toEqual({ K: true, I: true })
    expect(new Vehicle({ chassis: 'E39' }).buses).toEqual({ K: true, I: true })
    expect(new Vehicle({ chassis: 'E46' }).buses).toEqual({ K: true, I: false })
    expect(new Vehicle({ chassis: 'E53' }).buses).toEqual({ K: true, I: true })
    expect(new Vehicle({ chassis: 'E87' }).buses).toEqual({ K: true, I: false })
  })

  it('honours explicit buses init even when chassis is given', () => {
    const v = new Vehicle({ chassis: 'E39', buses: { K: true, I: false } })
    expect(v.buses).toEqual({ K: true, I: false })
  })

  describe('setIgnition', () => {
    it('emits ignitionChanged with from/to on change', () => {
      const v = new Vehicle()
      const fn = vi.fn()
      v.events.on('ignitionChanged', fn)
      v.setIgnition('KL_R')
      expect(fn).toHaveBeenCalledWith({ from: 'OFF', to: 'KL_R' })
      expect(v.ignition).toBe('KL_R')
    })

    it('does not emit when the value is unchanged', () => {
      const v = new Vehicle({ ignition: 'KL_15' })
      const fn = vi.fn()
      v.events.on('ignitionChanged', fn)
      v.setIgnition('KL_15')
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('setChassis', () => {
    it('emits chassisIdentified and resets bus topology', () => {
      const v = new Vehicle()
      const fn = vi.fn()
      v.events.on('chassisIdentified', fn)
      v.setChassis('E39')
      expect(fn).toHaveBeenCalledWith('E39')
      expect(v.buses).toEqual({ K: true, I: true })
    })

    it('does not emit when the value is unchanged', () => {
      const v = new Vehicle({ chassis: 'E39' })
      const fn = vi.fn()
      v.events.on('chassisIdentified', fn)
      v.setChassis('E39')
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('setVariants', () => {
    it('emits variantsDetected with only the changed keys', () => {
      const v = new Vehicle()
      const fn = vi.fn()
      v.events.on('variantsDetected', fn)
      v.setVariants({ ike: 'IKE', gm: 'ZKE3_GM1' })
      expect(fn).toHaveBeenCalledWith({ ike: 'IKE', gm: 'ZKE3_GM1' })
      expect(v.variants.ike).toBe('IKE')
      expect(v.variants.gm).toBe('ZKE3_GM1')
    })

    it('does not emit when nothing changed', () => {
      const v = new Vehicle({ variants: { ike: 'IKI' } })
      const fn = vi.fn()
      v.events.on('variantsDetected', fn)
      v.setVariants({ ike: 'IKI' })
      expect(fn).not.toHaveBeenCalled()
    })

    it('emits only the subset that actually changed', () => {
      const v = new Vehicle({ variants: { ike: 'IKE' } })
      const fn = vi.fn()
      v.events.on('variantsDetected', fn)
      v.setVariants({ ike: 'IKE', gm: 'ZKE5' })
      expect(fn).toHaveBeenCalledWith({ gm: 'ZKE5' })
    })

    it('does not emit for an empty update', () => {
      const v = new Vehicle({ variants: { ike: 'IKE' } })
      const fn = vi.fn()
      v.events.on('variantsDetected', fn)
      v.setVariants({})
      expect(fn).not.toHaveBeenCalled()
    })
  })

  it('busSetForChassis matches the documented matrix', () => {
    expect(busSetForChassis('E31')).toEqual({ K: false, I: true })
    expect(busSetForChassis('E38')).toEqual({ K: true, I: true })
    expect(busSetForChassis('E46')).toEqual({ K: true, I: false })
    expect(busSetForChassis('R50')).toEqual({ K: true, I: false })
  })
})
