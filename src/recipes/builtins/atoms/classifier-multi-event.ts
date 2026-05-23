import type { RecipeDef, SchemaArrays } from '../../types'

export interface LabelWithUpdates {
  label: string
  threshold?: number
  category?: string
  updates?: { variable: string; setTo: string }[]
}

const def: RecipeDef = {
  id: 'atom/classifier-multi-event',
  name: 'Multi-Event Classifier',
  description: 'A classifier with multiple labels, each optionally carrying variable updates.',
  tags: ['atom', 'classifier'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'MultiEvent' },
    { kind: 'string', key: 'hypothesis', label: 'Hypothesis', default: 'The user is {}.' },
    { kind: 'label-list', key: 'labels', label: 'Labels', default: ['option a', 'option b'] },
    { kind: 'number', key: 'threshold', label: 'Threshold', default: 0.65, min: 0, max: 1 },
  ],
  locals: { variables: [], classifiers: ['MultiEvent'], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'MultiEvent'
    const hypothesis = (params.hypothesis as string | undefined) ?? 'The user is {}.'
    const threshold = (params.threshold as number | undefined) ?? 0.65
    // labelsWithUpdates: array of { label, threshold?, category?, updates? } — overrides labels/threshold when provided
    const labelsWithUpdates = params.labelsWithUpdates as LabelWithUpdates[] | undefined
    let classifications: any[]
    if (labelsWithUpdates) {
      classifications = labelsWithUpdates.map(lw => ({
        label: lw.label,
        ...(lw.category !== undefined ? { category: lw.category } : {}),
        threshold: lw.threshold ?? threshold,
        updates: lw.updates ?? [],
      }))
    } else {
      const labels = (params.labels as string[] | undefined) ?? ['option a', 'option b']
      classifications = labels.map(label => ({ label, threshold, updates: [] }))
    }
    const classifier: any = {
      name,
      inputTemplate: '{{content}}',
      inputHypothesis: hypothesis,
      classifications,
    }
    if (params.responseHypothesis) {
      classifier.responseTemplate = '{{content}}'
      classifier.responseHypothesis = params.responseHypothesis as string
    }
    return {
      variables: [],
      classifiers: [classifier],
      generators: [],
      contentRules: [],
      functions: [],
    }
  } },
}

export default def
