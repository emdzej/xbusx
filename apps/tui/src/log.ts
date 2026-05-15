export type LogEntry =
  | {
      id: number
      kind: 'frame'
      ts: number
      source: string
      dest: string
      cmd: number
      len: number
    }
  | { id: number; kind: 'event'; ts: number; device: string; event: string; payload: unknown }
  | { id: number; kind: 'error'; ts: number; message: string }
  | { id: number; kind: 'system'; ts: number; message: string }

export const LOG_CAPACITY = 200

let nextId = 0
export function nextLogId(): number {
  nextId += 1
  return nextId
}
