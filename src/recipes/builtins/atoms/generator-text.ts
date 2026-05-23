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
    const name = (params.name as string | undefined) ?? 'TextGen'
    const phase = (params.phase as string | undefined) ?? 'On Response'
    const prompt = (params.prompt as string | undefined) ?? '"Describe what happens next in one sentence."'
    const minTokens = params.minTokens != null ? String(params.minTokens) : '5'
    const maxTokens = params.maxTokens != null ? String(params.maxTokens) : '40'
    const condition = params.condition as string | undefined
    const updates = params.updates as { variable: string; setTo: string }[] | undefined
    const gen: any = { name, phase, prompt, minTokens, maxTokens }
    if (condition) gen.condition = condition
    if (updates && updates.length > 0) gen.updates = updates
    if (params.type) gen.type = params.type as string
    if (params.lazy !== undefined) gen.lazy = params.lazy as boolean
    return {
      variables: [],
      classifiers: [],
      generators: [gen],
      contentRules: [],
      functions: [],
    }
  } },
}

export default def
