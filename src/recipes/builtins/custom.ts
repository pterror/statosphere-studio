import type { RecipeDef, SchemaArrays } from '../types'

const empty: SchemaArrays = {
  variables: [],
  classifiers: [],
  generators: [],
  contentRules: [],
  functions: [],
}

const def: RecipeDef = {
  id: 'custom',
  name: 'Custom',
  description: 'A freeform bucket for raw elements — added via "+ Element" or JSON import.',
  tags: [],
  params: [],
  materialize: () => JSON.parse(JSON.stringify(empty)),
}

export default def
