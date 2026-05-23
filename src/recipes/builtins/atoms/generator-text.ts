import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/generator-text',
  name: 'Text Generator',
  description: 'A text generator that runs on input or response.',
  tags: ['atom', 'generator'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'TextGen' },
    { kind: 'enum', key: 'phase', label: 'Phase', default: 'On Response', choices: ['On Input', 'On Response'] },
    { kind: 'string', key: 'prompt', label: 'Prompt', default: '"Describe what happens next in one sentence."' },
    { kind: 'string', key: 'minTokens', label: 'Min tokens', default: '5' },
    { kind: 'string', key: 'maxTokens', label: 'Max tokens', default: '40' },
  ],
  locals: { variables: [], classifiers: [], generators: ['TextGen'], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const phase = (params.phase as string | undefined) ?? 'On Response'
    const prompt = (params.prompt as string | undefined) ?? '"Describe what happens next in one sentence."'
    const minTokens = params.minTokens != null ? String(params.minTokens) : '5'
    const maxTokens = params.maxTokens != null ? String(params.maxTokens) : '40'
    return {
      variables: [],
      classifiers: [],
      generators: [{
        name: 'TextGen',
        phase,
        prompt,
        minTokens,
        maxTokens,
      }],
      contentRules: [],
      functions: [],
    }
  } },
}

export default def
