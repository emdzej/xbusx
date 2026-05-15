import type { Device } from '@emdzej/ibusx-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

interface Props {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous device generics
  devices: readonly Device<any, any>[]
  selectedIndex: number
  focused: boolean
}

export function DeviceList({ devices, selectedIndex, focused }: Props): ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={focused ? 'cyan' : 'gray'}
      paddingX={1}
      width={20}
    >
      <Text bold {...(focused ? { color: 'cyan' as const } : {})}>
        Devices
      </Text>
      {devices.map((device, i) => {
        const selected = i === selectedIndex
        const addr = `0x${device.address.toString(16).padStart(2, '0').toUpperCase()}`
        const color = selected ? (focused ? 'green' : 'yellow') : undefined
        return (
          <Text
            key={device.address}
            {...(color !== undefined ? { color } : {})}
            inverse={selected && focused}
          >
            {selected ? '▸ ' : '  '}
            {device.name.padEnd(5)} {addr}
          </Text>
        )
      })}
    </Box>
  )
}
