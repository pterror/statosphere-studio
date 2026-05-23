import { encodeConfig, decodeConfig } from '../src/share/encode'
import type { ConfigTree } from '../src/stores/config'
import hpTracker from '../templates/hp-tracker.json'

const template = hpTracker as ConfigTree

const encoded = encodeConfig(template)
const decoded = decodeConfig(encoded)

const original = JSON.stringify(template)
const roundtripped = JSON.stringify(decoded)

if (original !== roundtripped) {
  console.error('FAIL: roundtrip mismatch')
  console.error('original:', original)
  console.error('decoded:', roundtripped)
  process.exit(1)
}

console.log('OK: roundtrip passed')
console.log(`encoded length: ${encoded.length} chars`)
