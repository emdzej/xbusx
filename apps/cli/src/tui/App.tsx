import { Box, useApp, useInput } from 'ink'
import { type ReactElement, useEffect, useState } from 'react'
import type { DisplayableDevice } from '../types.js'
import { appendLog, attachBusListeners } from './bus.js'
import { DeviceList } from './components/DeviceList.js'
import { EventLog } from './components/EventLog.js'
import { Footer } from './components/Footer.js'
import { StatePane } from './components/StatePane.js'
import type { AttachedSession } from './launch.js'
import { type LogEntry, nextLogId } from './log.js'

interface AppProps {
  session: AttachedSession
  port: string
}

type Focus = 'devices' | 'controls'

export function App({ session, port }: AppProps): ReactElement {
  const { exit } = useApp()
  const { bus, busKind, entries, devices, setActive } = session
  const [selectedDevice, setSelectedDevice] = useState(0)
  const [selectedControl, setSelectedControl] = useState(0)
  const [focus, setFocus] = useState<Focus>('devices')
  const [active, setActiveState] = useState(false)
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState<readonly LogEntry[]>([])

  useEffect(() => {
    const detach = attachBusListeners(bus, busKind, devices, (entry) => {
      setLog((prev) => appendLog(prev, entry))
    })
    setLog((prev) =>
      appendLog(prev, {
        id: nextLogId(),
        kind: 'system',
        ts: Date.now(),
        message: `listening on ${port} (${busKind})`,
      }),
    )
    return detach
  }, [bus, busKind, devices, port])

  const currentEntry = entries[selectedDevice]
  const currentDevice = devices[selectedDevice]
  const controlEntries = currentEntry ? Object.entries(currentEntry.controls) : []

  useInput((input, key) => {
    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit()
      return
    }
    if (input === 'a') {
      const next = !active
      setActiveState(next)
      setActive(next)
      return
    }
    if (key.tab) {
      setFocus((f) => (f === 'devices' ? 'controls' : 'devices'))
      return
    }
    if (focus === 'devices') {
      if (key.upArrow) {
        setSelectedDevice((i) => Math.max(0, i - 1))
        setSelectedControl(0)
      } else if (key.downArrow) {
        setSelectedDevice((i) => Math.min(devices.length - 1, i + 1))
        setSelectedControl(0)
      }
      return
    }
    // focus === 'controls'
    if (key.upArrow) {
      setSelectedControl((i) => Math.max(0, i - 1))
    } else if (key.downArrow) {
      setSelectedControl((i) => Math.min(controlEntries.length - 1, i + 1))
    } else if (key.return) {
      void invokeSelectedControl()
    }
  })

  async function invokeSelectedControl(): Promise<void> {
    if (currentDevice === undefined || currentEntry === undefined) return
    const pair = controlEntries[selectedControl]
    if (pair === undefined) return
    const [name, descriptor] = pair
    if (Object.keys(descriptor.params).length > 0) {
      setStatus(`${currentEntry.name}.${name} needs params — use CLI for now`)
      return
    }
    if (descriptor.requires === 'active' && !active) {
      setStatus(`${currentEntry.name}.${name} needs --active (press 'a' to arm)`)
      return
    }
    setStatus(`invoking ${currentEntry.name}.${name}…`)
    try {
      await descriptor.invoke(currentDevice as DisplayableDevice, {})
      setStatus(`ok ${currentEntry.name}.${name}`)
    } catch (err) {
      setStatus(`err: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <Box flexDirection="column">
      <Box>
        <DeviceList
          entries={entries}
          devices={devices}
          selectedIndex={selectedDevice}
          focused={focus === 'devices'}
        />
        {currentDevice && currentEntry ? (
          <StatePane
            device={currentDevice}
            controls={currentEntry.controls}
            controlIndex={selectedControl}
            focused={focus === 'controls'}
          />
        ) : null}
      </Box>
      <EventLog entries={log} rows={10} />
      <Footer port={port} busKind={busKind} active={active} status={status} />
    </Box>
  )
}
