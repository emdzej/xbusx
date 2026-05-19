import type { Device } from '@emdzej/ibusx-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import type { DeviceEntry } from '../../registry.js'

interface Props {
  entries: readonly DeviceEntry[]
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous device generics
  devices: readonly Device<any, any>[]
  selectedIndex: number
  focused: boolean
}

const WINDOW_SIZE = 16

export function DeviceList({ entries, devices, selectedIndex, focused }: Props): ReactElement {
  // Window the list so it doesn't overflow on terminals with 53 devices.
  const total = devices.length
  const half = Math.floor(WINDOW_SIZE / 2)
  let start = Math.max(0, selectedIndex - half)
  const end = Math.min(total, start + WINDOW_SIZE)
  if (end - start < WINDOW_SIZE) start = Math.max(0, end - WINDOW_SIZE)
  const visible = devices.slice(start, end)

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={focused ? 'cyan' : 'gray'}
      paddingX={1}
      width={22}
    >
      <Text bold {...(focused ? { color: 'cyan' as const } : {})}>
        Devices ({total})
      </Text>
      {start > 0 && <Text dimColor> ↑ {start} more</Text>}
      {visible.map((device, viewportI) => {
        const i = start + viewportI
        const entry = entries[i]
        const selected = i === selectedIndex
        const addr = `0x${device.address.toString(16).padStart(2, '0').toUpperCase()}`
        const color = selected ? (focused ? 'green' : 'yellow') : undefined
        const isStub = entry?.implemented === false
        return (
          <Text
            key={device.address}
            {...(color !== undefined ? { color } : {})}
            inverse={selected && focused}
            dimColor={isStub && !selected}
          >
            {selected ? '▸ ' : '  '}
            {device.name.padEnd(7)} {addr}
          </Text>
        )
      })}
      {end < total && <Text dimColor> ↓ {total - end} more</Text>}
    </Box>
  )
}
