import type { DBusMessage } from '@emdzej/dbus-protocol'

/**
 * DS2 response codes. Each value is the first payload byte of an ECU → tester
 * frame.
 *
 * Source: navcoder `Proc_5_5_4998B0` (ibus.bas:3214–3725) — the
 * DS2 command-name lookup. See `docs/protocol/dbus.md` § "Response codes".
 */
export const RESPONSE = {
  /** Terminate diagnostic mode (also a request byte — context-dependent). */
  TERMINATE: 0x9f,
  /** Positive acknowledgement. Payload that follows is the requested data. */
  POSITIVE_ACK: 0xa0,
  /** Diagnostic is busy — caller should retry. */
  BUSY: 0xa1,
  /** Command rejected (e.g. invalid in current ECU state). */
  REJECTED: 0xa2,
  /** Parameter error (malformed request). */
  PARAMETER_ERROR: 0xb0,
  /** Function error (request known but failed). */
  FUNCTION_ERROR: 0xb1,
  /** Coding error (write-coding refused). */
  CODING_ERROR: 0xb2,
  /** Negative ACK / unknown command. */
  NEGATIVE_ACK: 0xff,
} as const

export type ResponseCode = (typeof RESPONSE)[keyof typeof RESPONSE]

/**
 * A classified DS2 response. Discriminate on `kind`:
 *
 *   - `'positive'`: ECU accepted the request; `data` is the payload following
 *     the `0xA0` marker.
 *   - `'negative'`: ECU rejected the request; `code` identifies which failure.
 *   - `'unknown'`: response code didn't match any documented value.
 */
export type ParsedResponse =
  | { readonly kind: 'positive'; readonly code: 0xa0; readonly data: Uint8Array }
  | {
      readonly kind: 'negative'
      readonly code: 0x9f | 0xa1 | 0xa2 | 0xb0 | 0xb1 | 0xb2 | 0xff
      readonly data: Uint8Array
    }
  | { readonly kind: 'unknown'; readonly code: number; readonly data: Uint8Array }

const NEGATIVE_CODES = new Set<number>([
  RESPONSE.TERMINATE,
  RESPONSE.BUSY,
  RESPONSE.REJECTED,
  RESPONSE.PARAMETER_ERROR,
  RESPONSE.FUNCTION_ERROR,
  RESPONSE.CODING_ERROR,
  RESPONSE.NEGATIVE_ACK,
])

/**
 * Classify the first payload byte of a D-bus response frame as one of the
 * documented DS2 response codes (or `'unknown'` if it isn't one).
 */
export function parseResponse(message: DBusMessage): ParsedResponse {
  const code = message.payload[0] ?? -1
  const data = message.payload.slice(1)
  if (code === RESPONSE.POSITIVE_ACK) {
    return { kind: 'positive', code: 0xa0, data }
  }
  if (NEGATIVE_CODES.has(code)) {
    return {
      kind: 'negative',
      code: code as 0x9f | 0xa1 | 0xa2 | 0xb0 | 0xb1 | 0xb2 | 0xff,
      data,
    }
  }
  return { kind: 'unknown', code, data }
}

/** Convenience: human-readable name for a response code. */
export function responseCodeName(code: number): string {
  switch (code) {
    case RESPONSE.TERMINATE:
      return 'TERMINATE'
    case RESPONSE.POSITIVE_ACK:
      return 'POSITIVE_ACK'
    case RESPONSE.BUSY:
      return 'BUSY'
    case RESPONSE.REJECTED:
      return 'REJECTED'
    case RESPONSE.PARAMETER_ERROR:
      return 'PARAMETER_ERROR'
    case RESPONSE.FUNCTION_ERROR:
      return 'FUNCTION_ERROR'
    case RESPONSE.CODING_ERROR:
      return 'CODING_ERROR'
    case RESPONSE.NEGATIVE_ACK:
      return 'NEGATIVE_ACK'
    default:
      return `0x${code.toString(16).padStart(2, '0').toUpperCase()}`
  }
}
