import type { IBusMessage } from '@emdzej/ibusx-protocol'

/**
 * Interface used by devices to emit frames.  In normal operation an `IBus`
 * instance implements this; tests can substitute a stub.
 */
export interface FrameSender {
  send(message: IBusMessage): Promise<void>
}
