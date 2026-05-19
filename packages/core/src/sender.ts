import type { IKBusMessage } from '@emdzej/ikbus-protocol'

/**
 * Interface used by devices to emit frames.  In normal operation an `IKBus`
 * instance implements this; tests can substitute a stub.
 */
export interface FrameSender {
  send(message: IKBusMessage): Promise<void>
}
