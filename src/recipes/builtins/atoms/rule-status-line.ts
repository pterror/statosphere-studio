import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/rule-status-line',
  name: 'Status Line Rule',
  description: 'A content rule that renders a status line from a template expression.',
  tags: ['atom', 'rule'],
  params: [
    { kind: 'string', key: 'condition', label: 'Condition', default: 'true' },
    { kind: 'string', key: 'template', label: 'Template', default: '"Status."' },
  ],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const condition = (params.condition as string | undefined) ?? 'true'
    const template = (params.template as string | undefined) ?? '"Status."'
    return {
      variables: [],
      classifiers: [],
      generators: [],
      contentRules: [{ category: 'Stage Direction', condition, modification: template }],
      functions: [],
    }
  } },
}

export default def
