import { Select } from '@inkjs/ui'
import { Box, Text } from 'ink'
import { type ReactElement, useEffect, useState } from 'react'

interface PortInfo {
  path: string
  manufacturer: string | undefined
}

interface Props {
  onPick: (path: string) => void
}

/**
 * Initial screen shown when `ibusx` is invoked bare.  Lists the host's serial
 * ports and lets the user pick one with arrow keys + Enter.  On pick, the
 * parent App swaps in the main TUI bound to that port.
 */
export function PortPicker({ onPick }: Props): ReactElement {
  const [ports, setPorts] = useState<PortInfo[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { SerialPort } = await import('serialport')
        const list = await SerialPort.list()
        if (!cancelled) {
          setPorts(list.map((p) => ({ path: p.path, manufacturer: p.manufacturer })))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error !== undefined) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">Could not enumerate serial ports: {error}</Text>
        <Text dimColor>Press Ctrl+C to exit.</Text>
      </Box>
    )
  }

  if (ports === undefined) {
    return (
      <Box padding={1}>
        <Text dimColor>Scanning serial ports…</Text>
      </Box>
    )
  }

  if (ports.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No serial ports detected.</Text>
        <Text dimColor>
          Plug in an FTDI adapter and re-run, or use <Text bold>ibusx tui -p /dev/...</Text> with an
          explicit path.
        </Text>
        <Text dimColor>Press Ctrl+C to exit.</Text>
      </Box>
    )
  }

  const options = ports.map((p) => ({ label: formatLabel(p), value: p.path }))

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Select a serial port</Text>
      <Text dimColor>↑/↓ to navigate, Enter to confirm, Ctrl+C to quit.</Text>
      <Box marginTop={1}>
        <Select
          options={options}
          onChange={(path) => {
            onPick(path)
          }}
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>(or pass --port to skip this picker)</Text>
      </Box>
    </Box>
  )
}

function formatLabel(p: PortInfo): string {
  const trailer =
    p.manufacturer !== undefined && p.manufacturer.length > 0 ? `  (${p.manufacturer})` : ''
  return `${p.path}${trailer}`
}
