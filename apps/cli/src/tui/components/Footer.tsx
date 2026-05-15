import { Box, Text } from 'ink'
import type { ReactElement } from 'react'

interface Props {
  port: string
  active: boolean
  status: string
}

export function Footer({ port, active, status }: Props): ReactElement {
  return (
    <Box paddingX={1} justifyContent="space-between">
      <Text>
        <Text dimColor>port</Text> <Text>{port}</Text> <Text dimColor>·</Text>{' '}
        <Text color={active ? 'green' : 'gray'}>{active ? 'ACTIVE' : 'passive'}</Text>{' '}
        <Text dimColor>·</Text> <Text>{status}</Text>
      </Text>
      <Text dimColor>↑/↓ select ⇥ pane ⏎ invoke a active q quit</Text>
    </Box>
  )
}
