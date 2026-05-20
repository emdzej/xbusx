import type { ControlsManifest } from '@emdzej/ibusx-core'
import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import type { DisplayableDevice } from '../../types.js'

interface Props {
  device: DisplayableDevice
  // biome-ignore lint/suspicious/noExplicitAny: per-device control param widens
  controls: ControlsManifest<any>
  controlIndex: number
  focused: boolean
}

export function StatePane({ device, controls, controlIndex, focused }: Props): ReactElement {
  const stateEntries = Object.entries(device.state as Record<string, unknown>)
  const controlEntries = Object.entries(controls)
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={focused ? 'cyan' : 'gray'}
      paddingX={1}
      flexGrow={1}
    >
      <Text bold {...(focused ? { color: 'cyan' as const } : {})}>
        {device.name} state
      </Text>
      {stateEntries.length === 0 && <Text dimColor>(no state)</Text>}
      {stateEntries.map(([key, value]) => (
        <Text key={key}>
          <Text color="gray">{key.padEnd(14)}</Text> {formatValue(value)}
        </Text>
      ))}

      <Box marginTop={1}>
        <Text bold>Controls</Text>
      </Box>
      {controlEntries.length === 0 && <Text dimColor>(none)</Text>}
      {controlEntries.map(([name, descriptor], i) => {
        const selected = i === controlIndex && focused
        const requires = descriptor.requires === 'active'
        return (
          <Text key={name} {...(selected ? { color: 'green' as const } : {})} inverse={selected}>
            {selected ? '▸ ' : '  '}
            {name.padEnd(18)}
            <Text dimColor>{descriptor.label}</Text>
            {requires ? <Text color="yellow"> [active]</Text> : null}
          </Text>
        )
      })}
    </Box>
  )
}

function formatValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'object') {
    const maybeBytes = value as { data?: Uint8Array }
    if (maybeBytes.data instanceof Uint8Array) {
      return `[${Array.from(maybeBytes.data, (b) => b.toString(16).padStart(2, '0')).join(' ')}]`
    }
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}
