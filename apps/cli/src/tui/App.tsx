import type { Device, IKBus } from '@emdzej/ibusx-core'
import { Box, useApp, useInput } from 'ink'
import { type ReactElement, useEffect, useState } from 'react'
import type { DeviceEntry } from '../registry.js'
import { appendLog, attachBusListeners } from './bus.js'
import { DeviceList } from './components/DeviceList.js'
import { EventLog } from './components/EventLog.js'
import { Footer } from './components/Footer.js'
import { StatePane } from './components/StatePane.js'
import { type LogEntry, nextLogId } from './log.js'

interface AppProps {
  bus: IKBus
  port: string
  entries: readonly DeviceEntry[]
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous generics
  devices: readonly Device<any, any>[]
}

type Focus = 'devices' | 'controls'

export function App({ bus, port, entries, devices }: AppProps): ReactElement {
  const { exit } = useApp()
  const [selectedDevice, setSelectedDevice] = useState(0)
  const [selectedControl, setSelectedControl] = useState(0)
  const [focus, setFocus] = useState<Focus>('devices')
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState('idle')
  const [log, setLog] = useState<readonly LogEntry[]>([])

  useEffect(() => {
    const detach = attachBusListeners(bus, devices, (entry) => {
      setLog((prev) => appendLog(prev, entry))
    })
    setLog((prev) =>
      appendLog(prev, {
        id: nextLogId(),
        kind: 'system',
        ts: Date.now(),
        message: `listening on ${port}`,
      }),
    )
    return detach
  }, [bus, devices, port])

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
      setActive(next)
      for (const d of devices) d.mode = next ? 'active' : 'passive'
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
      await descriptor.invoke(currentDevice, {})
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
      <Footer port={port} active={active} status={status} />
    </Box>
  )
}
