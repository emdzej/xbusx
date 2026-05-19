/**
 * Compute the XOR checksum over `bytes[0..end)`.  If `end` is omitted, the
 * whole buffer is XOR'd.
 */
export function computeChecksum(bytes: Uint8Array, end?: number): number {
  const limit = end ?? bytes.length
  let crc = 0
  for (let i = 0; i < limit; i++) {
    crc ^= bytes[i]!
  }
  return crc
}

/**
 * Verify that the last byte of `bytes` equals the XOR of all preceding bytes.
 * Returns false for buffers shorter than 2 bytes (no checksum to check).
 */
export function verifyChecksum(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false
  const last = bytes.length - 1
  return computeChecksum(bytes, last) === bytes[last]
}
