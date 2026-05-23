import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/var-flag',
  name: 'Flag Variable',
  description: 'A boolean flag variable.',
  tags: ['atom', 'variable'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'flag' },
    { kind: 'string', key: 'initialValue', label: 'Initial value', default: 'false' },
  ],
  locals: { variables: ['flag'], classifiers: [], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const initialValue = (params.initialValue as string | undefined) ?? 'false'
    return { variables: [{ name: 'flag', initialValue }], classifiers: [], generators: [], contentRules: [], functions: [] }
  } },
}

export default def
