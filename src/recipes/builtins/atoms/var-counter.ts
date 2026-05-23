import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/var-counter',
  name: 'Counter Variable',
  description: 'A numeric variable with an optional per-turn update expression.',
  tags: ['atom', 'variable'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'counter' },
    { kind: 'number', key: 'initialValue', label: 'Initial value', default: 0 },
    { kind: 'string', key: 'perTurnUpdate', label: 'Per-turn update', default: '' },
  ],
  locals: { variables: ['counter'], classifiers: [], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'counter'
    const initialValue = (params.initialValue as number | undefined) ?? 0
    const perTurnUpdate = (params.perTurnUpdate as string | undefined) ?? ''
    const variable: any = { name, initialValue: String(initialValue) }
    if (perTurnUpdate) variable.perTurnUpdate = perTurnUpdate
    return { variables: [variable], classifiers: [], generators: [], contentRules: [], functions: [] }
  } },
}

export default def
