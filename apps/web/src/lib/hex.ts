/**
 * Parse a whitespace-tolerant hex string into a byte array.  Accepts both
 * `0xAB` and bare `AB`, separators of any whitespace, optional commas.
 * Rejects bytes > 0xFF and any non-hex character.
 *
 * Returns `{ ok: true, bytes }` on success, `{ ok: false, error }` otherwise.
 */
export type ParseResult = { ok: true; bytes: Uint8Array } | { ok: false; error: string }

export function parseHex(input: string): ParseResult {
  const cleaned = input.trim()
  if (cleaned.length === 0) return { ok: false, error: 'empty input' }
  const tokens = cleaned.split(/[\s,]+/).filter((t) => t.length > 0)
  const out = new Uint8Array(tokens.length)
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i] ?? ''
    const stripped = raw.toLowerCase().startsWith('0x') ? raw.slice(2) : raw
    if (!/^[0-9a-fA-F]{1,2}$/.test(stripped)) {
      return { ok: false, error: `token ${i + 1} (\`${raw}\`) is not a valid hex byte` }
    }
    const n = Number.parseInt(stripped, 16)
    if (n < 0 || n > 0xff) {
      return { ok: false, error: `token ${i + 1} (\`${raw}\`) is out of byte range` }
    }
    out[i] = n
  }
  return { ok: true, bytes: out }
}

export function formatHex(bytes: Uint8Array | readonly number[]): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}
