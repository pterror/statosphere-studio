/**
 * Smoke tests for src/lib/json-patch.ts
 * Roundtrip 10 hand-built cases; fail loudly on mismatches.
 */

import { diff, apply, invert } from '../src/lib/json-patch'

let passed = 0
let failed = 0

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function assert(label: string, actual: unknown, expected: unknown): void {
  if (deepEqual(actual, expected)) {
    console.log(`  PASS  ${label}`)
    passed++
  } else {
    console.error(`  FAIL  ${label}`)
    console.error(`    expected: ${JSON.stringify(expected)}`)
    console.error(`    actual:   ${JSON.stringify(actual)}`)
    failed++
  }
}

function roundtrip(label: string, a: unknown, b: unknown): void {
  console.log(`\n[${label}]`)
  const patch = diff(a, b)
  const applied = apply(a, patch)
  assert('apply(a, diff(a,b)) === b', applied, b)

  const inv = invert(a, patch)
  const reverted = apply(applied, inv)
  assert('apply(apply(a,p), invert(a,p)) === a', reverted, a)
}

// 1. Primitive replacement
roundtrip('primitive replace', 42, 99)

// 2. String replace
roundtrip('string replace', 'hello', 'world')

// 3. Null → value
roundtrip('null to value', null, { x: 1 })

// 4. Value → null
roundtrip('value to null', { x: 1 }, null)

// 5. Nested object — change one key
roundtrip('nested object change', { a: { b: 1, c: 2 }, d: 3 }, { a: { b: 99, c: 2 }, d: 3 })

// 6. Nested object — add key
roundtrip('nested add key', { a: 1 }, { a: 1, b: 2 })

// 7. Nested object — remove key
roundtrip('nested remove key', { a: 1, b: 2 }, { a: 1 })

// 8. Array growing
roundtrip('array grow', [1, 2, 3], [1, 2, 3, 4, 5])

// 9. Array shrinking
roundtrip('array shrink', [1, 2, 3, 4], [1, 2])

// 10. Complex nested with array
roundtrip(
  'complex nested',
  { name: 'foo', items: [{ id: 'a', val: 1 }, { id: 'b', val: 2 }], meta: { active: true } },
  { name: 'bar', items: [{ id: 'a', val: 99 }], meta: { active: false, extra: 'x' } },
)

console.log(`\n${passed} passed, ${failed} failed.`)
if (failed > 0) process.exit(1)
