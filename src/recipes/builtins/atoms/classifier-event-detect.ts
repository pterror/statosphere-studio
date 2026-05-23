import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/classifier-event-detect',
  name: 'Event Detect Classifier',
  description: 'A single-label classifier that detects when an event occurs.',
  tags: ['atom', 'classifier'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'EventDetect' },
    { kind: 'string', key: 'label', label: 'Label', default: 'an event happens' },
    { kind: 'number', key: 'threshold', label: 'Threshold', default: 0.65, min: 0, max: 1 },
    { kind: 'string', key: 'hypothesis', label: 'Hypothesis', default: 'The user is {}.' },
    { kind: 'string', key: 'inputTemplate', label: 'Input template', default: '{{content}}' },
  ],
  locals: { variables: [], classifiers: ['EventDetect'], generators: [], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'EventDetect'
    const label = (params.label as string | undefined) ?? 'an event happens'
    const threshold = (params.threshold as number | undefined) ?? 0.65
    const hypothesis = (params.hypothesis as string | undefined) ?? 'The user is {}.'
    const inputTemplate = (params.inputTemplate as string | undefined) ?? '{{content}}'
    const updates = (params.updates as { variable: string; setTo: string }[] | undefined) ?? []
    const category = params.category as string | undefined
    const responseHypothesis = params.responseHypothesis as string | undefined
    const cls: any = {
      name,
      ...(inputTemplate ? { inputTemplate, inputHypothesis: hypothesis } : {}),
      ...(responseHypothesis ? { responseTemplate: '{{content}}', responseHypothesis } : {}),
      classifications: [{
        label,
        ...(category ? { category } : {}),
        threshold,
        updates,
      }],
    }
    return {
      variables: [],
      classifiers: [cls],
      generators: [],
      contentRules: [],
      functions: [],
    }
  } },
}

export default def
