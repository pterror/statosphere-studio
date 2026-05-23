import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/classifier-dynamic-label',
  name: 'Dynamic-Label Classifier',
  description: 'A single-classification classifier with a dynamic (expression) label and optional LLM mode.',
  tags: ['atom', 'classifier'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'DynamicLabel' },
    { kind: 'string', key: 'hypothesis', label: 'Hypothesis', default: 'The user wants to go to {}.' },
    { kind: 'string', key: 'label', label: 'Label expression', default: '"unknown"' },
    { kind: 'number', key: 'threshold', label: 'Threshold', default: 0.5, min: 0, max: 1 },
    { kind: 'string', key: 'condition', label: 'Condition', default: '' },
    { kind: 'string', key: 'category', label: 'Category', default: '' },
  ],
  locals: { variables: [], classifiers: ['DynamicLabel'], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'DynamicLabel'
    const hypothesis = (params.hypothesis as string | undefined) ?? 'The user wants to go to {}.'
    const label = (params.label as string | undefined) ?? '"unknown"'
    const threshold = (params.threshold as number | undefined) ?? 0.5
    const condition = params.condition as string | undefined
    const category = params.category as string | undefined
    const updates = (params.updates as { variable: string; setTo: string }[] | undefined) ?? []
    const useLlm = params.useLlm as boolean | undefined
    const cls: any = {
      name,
      ...(condition ? { condition } : {}),
      ...(useLlm ? { useLlm: true } : {}),
      inputTemplate: '{{content}}',
      inputHypothesis: hypothesis,
      classifications: [{
        label,
        dynamic: true,
        ...(category ? { category } : {}),
        threshold,
        updates,
      }],
    }
    return { variables: [], classifiers: [cls], generators: [], contentRules: [], functions: [] }
  } },
}

export default def
