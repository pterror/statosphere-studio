import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/rule-stage-direction',
  name: 'Stage Direction Rule',
  description: 'A content rule that emits a stage direction when a condition is met.',
  tags: ['atom', 'rule'],
  params: [
    { kind: 'string', key: 'condition', label: 'Condition', default: 'true' },
    { kind: 'string', key: 'modification', label: 'Modification', default: '""' },
  ],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const condition = (params.condition as string | undefined) ?? 'true'
    const modification = (params.modification as string | undefined) ?? '""'
    return {
      variables: [],
      classifiers: [],
      generators: [],
      contentRules: [{ category: 'Stage Direction', condition, modification }],
      functions: [],
    }
  } },
}

export default def
