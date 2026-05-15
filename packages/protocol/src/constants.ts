/** Maximum total frame length on the wire (BlueBus ibus.h:650). */
export const IBUS_MAX_MSG_LENGTH = 47

/** Smallest valid frame: SRC + LEN + DST + CMD + XOR. */
export const MIN_FRAME_LENGTH = 5

/** RX idle timeout — drop partial buffer if no new byte for this long. */
export const IBUS_RX_BUFFER_TIMEOUT_MS = 71

/** Minimum quiet-time before a device may begin transmitting. */
export const IBUS_TX_FRAME_IDLE_WAIT_MS = 8

/** Window for a TX'd frame to appear on RX (loopback ack). */
export const IBUS_TX_LOOPBACK_TIMEOUT_MS = 790

/** Maximum ARQ retry attempts before giving up on a frame. */
export const IBUS_TX_MAX_RETRIES = 3

/** UART line rate. */
export const IBUS_BAUD_RATE = 9600
