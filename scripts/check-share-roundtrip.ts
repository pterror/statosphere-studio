import { encodeConfig, decodeConfig } from '../src/share/encode'
import type { ConfigTree } from '../src/stores/config'
import type { StudioSidecar } from '../src/share/encode'
import type { RecipeInstance } from '../src/recipes/types'

// Synthetic config for roundtrip testing (mirrors what hp-tracker would materialize)
const syntheticConfig: ConfigTree = {
  variables: [
    { name: 'hp_tracker.hp', initialValue: '100', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' },
    { name: 'hp_tracker.max_hp', initialValue: '100', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' },
  ],
  functions: [],
  classifiers: [],
  generators: [],
  contentRules: [{ category: 'Stage Direction', condition: 'true', modification: '"HP: " + hp + "/" + max_hp' }],
}

const syntheticInstance: RecipeInstance = {
  id: 'test-instance-id',
  recipeId: 'hp-tracker',
  name: 'HP Tracker',
  params: { maxHp: 100, damageLabels: ['hit', 'blow', 'slash'], healLabels: ['heal', 'bandage', 'potion'] },
  pinned: [],
  extrasByPath: { '': { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] } },
}

const sidecar: StudioSidecar = {
  instances: [syntheticInstance],
  customLibrary: [],
}

// --- Test 1: plain-config roundtrip (no sidecar) ---
{
  const encoded = encodeConfig(syntheticConfig)
  const decoded = decodeConfig(encoded)
  if (decoded.sidecar !== undefined) {
    console.error('FAIL: plain-config encode should not produce a sidecar key')
    process.exit(1)
  }
  const orig = JSON.stringify(syntheticConfig)
  const roundtripped = JSON.stringify(decoded.config)
  if (orig !== roundtripped) {
    console.error('FAIL: plain-config roundtrip mismatch')
    console.error('original:', orig)
    console.error('decoded:', roundtripped)
    process.exit(1)
  }
  console.log('OK: plain-config roundtrip passed')
  console.log(`   encoded length: ${encoded.length} chars`)
}

// --- Test 2: sidecar roundtrip ---
{
  const encoded = encodeConfig(syntheticConfig, sidecar)
  const decoded = decodeConfig(encoded)
  if (!decoded.sidecar) {
    console.error('FAIL: sidecar roundtrip — no sidecar in decoded payload')
    process.exit(1)
  }
  const origConfig = JSON.stringify(syntheticConfig)
  const rtConfig = JSON.stringify(decoded.config)
  if (origConfig !== rtConfig) {
    console.error('FAIL: sidecar roundtrip — config mismatch')
    process.exit(1)
  }
  const origSidecar = JSON.stringify(sidecar)
  const rtSidecar = JSON.stringify(decoded.sidecar)
  if (origSidecar !== rtSidecar) {
    console.error('FAIL: sidecar roundtrip — sidecar mismatch')
    console.error('original:', origSidecar)
    console.error('decoded:', rtSidecar)
    process.exit(1)
  }
  console.log('OK: sidecar roundtrip passed')
  console.log(`   encoded length: ${encoded.length} chars`)
}

// --- Test 3: legacy plain-config payload is recognised (no sidecar key) ---
{
  const decoded = decodeConfig(encodeConfig(syntheticConfig))
  if ('sidecar' in decoded && decoded.sidecar !== undefined) {
    console.error('FAIL: legacy plain-config should decode without sidecar')
    process.exit(1)
  }
  console.log('OK: legacy plain-config compat check passed')
}
