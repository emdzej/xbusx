import type { Device, IKBus } from '@emdzej/ibusx-core'
import { Box, Text, useApp } from 'ink'
import { type ReactElement, useEffect, useState } from 'react'
import type { DeviceEntry } from '../registry.js'
import { App } from './App.js'
import { PortPicker } from './PortPicker.js'

interface Props {
  initialPort?: string
  baudRate: number
  /**
   * Once a port is chosen, the root calls this to construct a bus + register
   * devices.  Returns the bus, port label, and the registered device list
   * that the inner `App` will read state from.  Doing this here keeps the
   * picker → bus boundary contained in React; the bin entry just renders
   * `<TuiRoot/>`.
   */
  attach: (port: string) => Promise<{
    bus: IKBus
    entries: readonly DeviceEntry[]
    // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
    devices: readonly Device<any, any>[]
  }>
}

type Stage =
  | { phase: 'picker' }
  | { phase: 'connecting'; port: string }
  | {
      phase: 'ready'
      port: string
      bus: IKBus
      entries: readonly DeviceEntry[]
      devices: readonly Device<object, never>[]
    }
  | { phase: 'error'; message: string }

export function TuiRoot({ initialPort, attach, baudRate }: Props): ReactElement {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>(() =>
    initialPort !== undefined ? { phase: 'connecting', port: initialPort } : { phase: 'picker' },
  )

  useEffect(() => {
    if (stage.phase !== 'connecting') return
    let cancelled = false
    void (async () => {
      try {
        const { bus, entries, devices } = await attach(stage.port)
        if (cancelled) {
          await bus.stop()
          return
        }
        setStage({
          phase: 'ready',
          port: stage.port,
          bus,
          entries,
          devices: devices as readonly Device<object, never>[],
        })
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        setStage({ phase: 'error', message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [stage, attach])

  if (stage.phase === 'picker') {
    return (
      <PortPicker
        onPick={(port) => {
          setStage({ phase: 'connecting', port })
        }}
      />
    )
  }

  if (stage.phase === 'connecting') {
    return (
      <Box padding={1}>
        <Text dimColor>
          Opening {stage.port} at {baudRate} 8E1…
        </Text>
      </Box>
    )
  }

  if (stage.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">{stage.message}</Text>
        <Text dimColor>Press Ctrl+C or q to exit.</Text>
        {/* exit on next render — useEffect can't read state set in render path */}
        <ExitOnMount exit={exit} />
      </Box>
    )
  }

  return <App bus={stage.bus} port={stage.port} entries={stage.entries} devices={stage.devices} />
}

function ExitOnMount({ exit }: { exit: () => void }): null {
  useEffect(() => {
    const timer = setTimeout(() => exit(), 3_000)
    return () => clearTimeout(timer)
  }, [exit])
  return null
}
