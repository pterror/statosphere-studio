import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/var-flag',
  name: 'Flag Variable',
  description: 'A boolean flag variable with an optional per-turn reset.',
  tags: ['atom', 'variable'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'flag' },
    { kind: 'string', key: 'initialValue', label: 'Initial value', default: 'false' },
    { kind: 'string', key: 'perTurnUpdate', label: 'Per-turn update', default: '' },
  ],
  locals: { variables: ['flag'], classifiers: [], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'flag'
    const initialValue = (params.initialValue as string | undefined) ?? 'false'
    const perTurnUpdate = (params.perTurnUpdate as string | undefined) ?? ''
    const variable: any = { name, initialValue }
    if (perTurnUpdate) variable.perTurnUpdate = perTurnUpdate
    return { variables: [variable], classifiers: [], generators: [], contentRules: [], functions: [] }
  } },
}

export default def
