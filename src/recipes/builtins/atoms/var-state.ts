import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/var-state',
  name: 'State Variable',
  description: 'A string-valued state variable.',
  tags: ['atom', 'variable'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'state' },
    { kind: 'string', key: 'initialValue', label: 'Initial value', default: '"idle"' },
  ],
  locals: { variables: ['state'], classifiers: [], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'state'
    const initialValue = (params.initialValue as string | undefined) ?? '"idle"'
    return { variables: [{ name, initialValue }], classifiers: [], generators: [], contentRules: [], functions: [] }
  } },
}

export default def
