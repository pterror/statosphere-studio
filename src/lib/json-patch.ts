/**
 * Minimal JSON-Patch-style delta library (RFC 6902-flavored).
 * Ops: add, remove, replace — addressed by JSON Pointer paths.
 * No move/copy/test. Naive structural diff; optimize if profiling warrants.
 */

import { cloneJson } from './clone'

export type PatchOp =
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string; oldValue: unknown }

export type Patch = PatchOp[]

// ── JSON Pointer helpers ───────────────────────────────────────────────────

function escapeSegment(s: string): string {
  return s.replace(/~/g, '~0').replace(/\//g, '~1')
}

function unescapeSegment(s: string): string {
  return s.replace(/~1/g, '/').replace(/~0/g, '~')
}

function getAtPath(obj: unknown, path: string): unknown {
  if (path === '') return obj
  const segments = path.slice(1).split('/').map(unescapeSegment)
  let cur: unknown = obj
  for (const seg of segments) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

function setAtPath(obj: unknown, path: string, value: unknown): unknown {
  if (path === '') return value
  const segments = path.slice(1).split('/').map(unescapeSegment)
  const root = cloneJson(obj) as Record<string, unknown>
  let cur: Record<string, unknown> = root
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (cur[seg] == null || typeof cur[seg] !== 'object') {
      cur[seg] = {}
    } else {
      cur[seg] = cloneJson(cur[seg])
    }
    cur = cur[seg] as Record<string, unknown>
  }
  const last = segments[segments.length - 1]
  cur[last] = value
  return root
}

function deleteAtPath(obj: unknown, path: string): unknown {
  if (path === '') return undefined
  const segments = path.slice(1).split('/').map(unescapeSegment)
  const root = cloneJson(obj) as Record<string, unknown>
  let cur: Record<string, unknown> = root
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (cur[seg] == null || typeof cur[seg] !== 'object') return root
    cur[seg] = cloneJson(cur[seg])
    cur = cur[seg] as Record<string, unknown>
  }
  delete cur[segments[segments.length - 1]]
  return root
}

// ── Structural diff ────────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, k)) return false
    if (!deepEqual(aObj[k], bObj[k])) return false
  }
  return true
}

function diffAt(a: unknown, b: unknown, path: string, ops: PatchOp[]): void {
  if (deepEqual(a, b)) return

  // Both are plain objects (not arrays) — recurse into keys
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)])
    for (const k of allKeys) {
      const childPath = `${path}/${escapeSegment(k)}`
      const inA = Object.prototype.hasOwnProperty.call(aObj, k)
      const inB = Object.prototype.hasOwnProperty.call(bObj, k)
      if (!inA) {
        ops.push({ op: 'add', path: childPath, value: cloneJson(bObj[k]) })
      } else if (!inB) {
        ops.push({ op: 'remove', path: childPath, oldValue: cloneJson(aObj[k]) })
      } else {
        diffAt(aObj[k], bObj[k], childPath, ops)
      }
    }
    return
  }

  // Arrays — emit a single replace for the whole array (naive; sufficient for our use case)
  ops.push({ op: 'replace', path, value: cloneJson(b), oldValue: cloneJson(a) } as PatchOp & { oldValue?: unknown })
}

export function diff<T>(a: T, b: T): Patch {
  const ops: PatchOp[] = []
  diffAt(a, b, '', ops)
  return ops
}

// ── Apply ──────────────────────────────────────────────────────────────────

export function apply<T>(state: T, patch: Patch): T {
  let result: unknown = state
  for (const op of patch) {
    if (op.op === 'replace' || op.op === 'add') {
      result = setAtPath(result, op.path, op.value)
    } else if (op.op === 'remove') {
      result = deleteAtPath(result, op.path)
    }
  }
  return result as T
}

// ── Invert ─────────────────────────────────────────────────────────────────
// Returns the patch that, when applied to apply(state, patch), yields state.

export function invert<T>(state: T, patch: Patch): Patch {
  const inverse: PatchOp[] = []
  // Walk forward to compute intermediate state for each op, then emit the reversal.
  let cur: unknown = state
  for (const op of patch) {
    if (op.op === 'replace') {
      const old = getAtPath(cur, op.path)
      inverse.push({ op: 'replace', path: op.path, value: cloneJson(old) })
      cur = setAtPath(cur, op.path, op.value)
    } else if (op.op === 'add') {
      inverse.push({ op: 'remove', path: op.path, oldValue: op.value })
      cur = setAtPath(cur, op.path, op.value)
    } else if (op.op === 'remove') {
      inverse.push({ op: 'add', path: op.path, value: (op as PatchOp & { oldValue?: unknown }).oldValue })
      cur = deleteAtPath(cur, op.path)
    }
  }
  return inverse.reverse()
}
