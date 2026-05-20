import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import type { BusKind } from '../../types.js'

interface Props {
  port: string
  busKind: BusKind
  active: boolean
  status: string
}

export function Footer({ port, busKind, active, status }: Props): ReactElement {
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Text>
        <Text dimColor>port</Text> <Text>{port}</Text> <Text dimColor>·</Text>{' '}
        <Text color={busKind === 'ikbus' ? 'cyan' : 'magenta'}>{busKind}</Text>{' '}
        <Text dimColor>·</Text>{' '}
        <Text color={active ? 'green' : 'gray'}>{active ? 'ACTIVE' : 'passive'}</Text>{' '}
        <Text dimColor>·</Text> <Text>{status}</Text>
      </Text>
      <Text dimColor>↑/↓ select ⇥ pane ⏎ invoke a active q quit</Text>
    </Box>
  )
}
