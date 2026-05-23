import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/classifier-multi-event',
  name: 'Multi-Event Classifier',
  description: 'A classifier with multiple labels.',
  tags: ['atom', 'classifier'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'MultiEvent' },
    { kind: 'string', key: 'hypothesis', label: 'Hypothesis', default: 'The user is {}.' },
    { kind: 'label-list', key: 'labels', label: 'Labels', default: ['option a', 'option b'] },
    { kind: 'number', key: 'threshold', label: 'Threshold', default: 0.65, min: 0, max: 1 },
  ],
  locals: { variables: [], classifiers: ['MultiEvent'], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const hypothesis = (params.hypothesis as string | undefined) ?? 'The user is {}.'
    const labels = (params.labels as string[] | undefined) ?? ['option a', 'option b']
    const threshold = (params.threshold as number | undefined) ?? 0.65
    return {
      variables: [],
      classifiers: [{
        name: 'MultiEvent',
        inputTemplate: '{{content}}',
        inputHypothesis: hypothesis,
        classifications: labels.map(label => ({ label, threshold, updates: [] })),
      }],
      generators: [],
      contentRules: [],
      functions: [],
    }
  } },
}

export default def
