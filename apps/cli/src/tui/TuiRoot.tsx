import { Box, Text, useApp } from 'ink'
import { type ReactElement, useEffect, useState } from 'react'
import type { BusKind } from '../types.js'
import { App } from './App.js'
import type { AttachedSession } from './launch.js'
import { PortPicker } from './PortPicker.js'

interface Props {
  initialPort?: string
  baudRate: number
  bus: BusKind
  /**
   * Once a port is chosen, the root calls this to construct a bus +
   * register devices. Returns an `AttachedSession` that the inner `App`
   * reads state and controls from.
   */
  attach: (port: string) => Promise<AttachedSession>
}

type Stage =
  | { phase: 'picker' }
  | { phase: 'connecting'; port: string }
  | { phase: 'ready'; port: string; session: AttachedSession }
  | { phase: 'error'; message: string }

export function TuiRoot({ initialPort, attach, baudRate, bus }: Props): ReactElement {
  const { exit } = useApp()
  const [stage, setStage] = useState<Stage>(() =>
    initialPort !== undefined ? { phase: 'connecting', port: initialPort } : { phase: 'picker' },
  )

  useEffect(() => {
    if (stage.phase !== 'connecting') return
    let cancelled = false
    void (async () => {
      try {
        const session = await attach(stage.port)
        if (cancelled) {
          await session.stop()
          return
        }
        setStage({ phase: 'ready', port: stage.port, session })
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
        bus={bus}
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
          Opening {stage.port} at {baudRate} 8E1 ({bus})…
        </Text>
      </Box>
    )
  }

  if (stage.phase === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">{stage.message}</Text>
        <Text dimColor>Press Ctrl+C or q to exit.</Text>
        <ExitOnMount exit={exit} />
      </Box>
    )
  }

  return <App session={stage.session} port={stage.port} />
}

function ExitOnMount({ exit }: { exit: () => void }): null {
  useEffect(() => {
    const timer = setTimeout(() => exit(), 3_000)
    return () => clearTimeout(timer)
  }, [exit])
  return null
}
