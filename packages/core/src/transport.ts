import type { TypedEmitter } from './emitter.js'

export type TransportEvents = {
  /** Raw bytes received from the wire. */
  data: Uint8Array
  /** Transport-layer error (port closed, hardware fault, etc.). */
  error: Error
  /** Connection established. */
  open: undefined
  /** Connection torn down. */
  close: undefined
}

/**
 * Byte-level transport.  Concrete implementations adapt serial ports,
 * WebSerial, network gateways, in-memory pipes, etc., to a common interface.
 */
export interface Transport {
  readonly events: TypedEmitter<TransportEvents>
  open(): Promise<void>
  close(): Promise<void>
  write(bytes: Uint8Array): Promise<void>
}
