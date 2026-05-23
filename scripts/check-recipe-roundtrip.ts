import { encodeRecipe, decodeRecipe } from '../src/share/recipe-encode'
import type { RecipeDef } from '../src/recipes/types'

const synthetic: RecipeDef = {
  id: 'custom-test-1234',
  name: 'Test Recipe',
  description: 'A synthetic recipe for roundtrip testing.',
  tags: ['test'],
  params: [
    { kind: 'string', key: 'label', label: 'Label', default: 'Hero' },
    { kind: 'number', key: 'maxHp', label: 'Max HP', default: 100 },
  ],
  source: {
    kind: 'template',
    template: {
      variables: [{ name: 'hp', initialValue: '{{maxHp}}', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' }],
      classifiers: [],
      generators: [],
      contentRules: [],
      functions: [],
    },
    substitutions: [
      { path: { elementType: 'variables', index: 0, fieldPath: ['initialValue'] }, paramKey: 'maxHp' },
    ],
  },
}

const encoded = encodeRecipe(synthetic)
const decoded = decodeRecipe(encoded)

// id is reassigned on decode — compare everything else
const { id: _origId, ...origRest } = synthetic
const { id: _decodedId, ...decodedRest } = decoded

const orig = JSON.stringify(origRest)
const roundtripped = JSON.stringify(decodedRest)

if (orig !== roundtripped) {
  console.error('FAIL: recipe roundtrip mismatch')
  console.error('original:', orig)
  console.error('decoded:', roundtripped)
  process.exit(1)
}

// Verify builtin guard
try {
  encodeRecipe({ ...synthetic, source: { kind: 'builtin', materialize: () => ({ variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }) } })
  console.error('FAIL: should have thrown on builtin recipe')
  process.exit(1)
} catch (e) {
  // expected
}

console.log('OK: recipe roundtrip passed')
console.log(`encoded length: ${encoded.length} chars`)
