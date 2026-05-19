import { decode, encode } from '@emdzej/ikbus-protocol'
import { describe, expect, it } from 'vitest'
import {
  buildRADNGStationAck,
  buildRADNGStationListChunk,
  buildRADNGStationSet,
  parseRADNGStationList,
  RAD_NG_STATION_MSG,
} from '../../src/rad/ng-station-list.js'

describe('RAD NG-Radio Station List 0xD4', () => {
  it('decodes Wilhelm 1-station list example (MDR JUMP, selected)', () => {
    // 68 0F 3B D4 03 01 00 4D 44 52 20 4A 55 4D 50 10 E3
    const msg = decode(
      new Uint8Array([
        0x68, 0x0f, 0x3b, 0xd4, 0x03, 0x01, 0x00, 0x4d, 0x44, 0x52, 0x20, 0x4a, 0x55, 0x4d, 0x50,
        0x10, 0xe3,
      ]),
    )
    const list = parseRADNGStationList(msg)
    expect(list.msgType).toBe(RAD_NG_STATION_MSG.STATION_LIST)
    expect(list.stationCount).toBe(1)
    expect(list.msgIndex).toBe(0)
    expect(list.entries).toEqual([{ name: 'MDR JUMP', selected: true }])
  })

  it('decodes Wilhelm 2-station list example (ANT.THUE selected)', () => {
    // 68 18 3B D4 03 02 00 "MDR JUMP" 00 "ANT.THUE" 10 8E
    const msg = decode(
      new Uint8Array([
        0x68, 0x18, 0x3b, 0xd4, 0x03, 0x02, 0x00, 0x4d, 0x44, 0x52, 0x20, 0x4a, 0x55, 0x4d, 0x50,
        0x00, 0x41, 0x4e, 0x54, 0x2e, 0x54, 0x48, 0x55, 0x45, 0x10, 0x8e,
      ]),
    )
    const list = parseRADNGStationList(msg)
    expect(list.entries).toEqual([
      { name: 'MDR JUMP', selected: false },
      { name: 'ANT.THUE', selected: true },
    ])
  })

  it('decodes SET_STATION (3B 05 68 D4 01 01 82)', () => {
    const msg = decode(new Uint8Array([0x3b, 0x05, 0x68, 0xd4, 0x01, 0x01, 0x82]))
    expect(parseRADNGStationList(msg).msgType).toBe(RAD_NG_STATION_MSG.SET_STATION)
  })

  it('rebuilds a 2-station chunk that round-trips', () => {
    const built = buildRADNGStationListChunk({
      totalStationCount: 2,
      msgIndex: 0,
      entries: [
        { name: 'MDR JUMP', selected: false },
        { name: 'ANT.THUE', selected: true },
      ],
    })
    const p = parseRADNGStationList(decode(encode(built)))
    expect(p.entries).toEqual([
      { name: 'MDR JUMP', selected: false },
      { name: 'ANT.THUE', selected: true },
    ])
  })

  it('builds SET_STATION and ACK_RESPONSE frames', () => {
    const set = buildRADNGStationSet({ station: 2 })
    const ack = buildRADNGStationAck({})
    expect(parseRADNGStationList(decode(encode(set))).msgType).toBe(RAD_NG_STATION_MSG.SET_STATION)
    expect(parseRADNGStationList(decode(encode(ack))).msgType).toBe(RAD_NG_STATION_MSG.ACK_RESPONSE)
  })
})
