import { Box, Text } from 'ink'
import type { ReactElement } from 'react'
import type { LogEntry } from '../log.js'

interface Props {
  entries: readonly LogEntry[]
  rows: number
}

export function EventLog({ entries, rows }: Props): ReactElement {
  const visible = entries.slice(-rows)
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold>Bus log</Text>
      {visible.length === 0 && <Text dimColor>(waiting for frames…)</Text>}
      {visible.map((entry) => (
        <Text key={entry.id}>{renderEntry(entry)}</Text>
      ))}
    </Box>
  )
}

function renderEntry(entry: LogEntry): ReactElement {
  const ts = formatTs(entry.ts)
  switch (entry.kind) {
    case 'frame': {
      const cmd = `0x${entry.cmd.toString(16).padStart(2, '0').toUpperCase()}`
      return (
        <Text>
          <Text dimColor>{ts}</Text> <Text color="cyan">{entry.source.padEnd(5)}</Text>→{' '}
          <Text color="cyan">{entry.dest.padEnd(5)}</Text> <Text color="yellow">{cmd}</Text>{' '}
          <Text dimColor>({entry.len}B)</Text>
        </Text>
      )
    }
    case 'event': {
      return (
        <Text>
          <Text dimColor>{ts}</Text> <Text color="magenta">{entry.device.padEnd(5)}</Text>{' '}
          <Text color="green">{entry.event}</Text>{' '}
          <Text dimColor>{formatPayload(entry.payload)}</Text>
        </Text>
      )
    }
    case 'error':
      return (
        <Text>
          <Text dimColor>{ts}</Text> <Text color="red">err</Text> {entry.message}
        </Text>
      )
    case 'system':
      return (
        <Text>
          <Text dimColor>{ts}</Text> <Text color="blue">sys</Text> {entry.message}
        </Text>
      )
  }
}

function formatPayload(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number, w = 2): string => n.toString().padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}
