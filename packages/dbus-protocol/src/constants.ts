/**
 * Smallest valid D-bus frame: DST + LEN + CMD + XOR.
 * Source: navcoder enforces `≥ 4` on the D-bus receive path
 * (NavCoderMainForm.frm:55784–55787).
 */
export const DBUS_MIN_FRAME_LENGTH = 4

/**
 * Hard ceiling: LEN is a single byte, so total frame length can't exceed
 * 0xFF. navcoder enforces no D-bus-specific maximum beyond what the byte
 * itself encodes.
 */
export const DBUS_MAX_MSG_LENGTH = 0xff

/**
 * Tester address (the PC). Used as the `destination` byte on ECU → tester
 * responses, and conventionally as the implicit source on tester → ECU
 * requests (the wire format itself has no source byte).
 */
export const DBUS_TESTER_ADDRESS = 0xf1

/** UART line rate — identical to I/K-bus (9600 8E1). */
export const DBUS_BAUD_RATE = 9600

/**
 * RX idle timeout — drop a partial buffer if no new byte arrives for this
 * long. D-bus has no documented timing constants in navcoder; we reuse the
 * I/K-bus baseline as a conservative default.
 */
export const DBUS_RX_BUFFER_TIMEOUT_MS = 71
