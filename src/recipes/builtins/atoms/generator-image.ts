import type { RecipeDef, SchemaArrays } from '../../types'

const def: RecipeDef = {
  id: 'atom/generator-image',
  name: 'Image Generator',
  description: 'An image generator with optional condition and variable updates.',
  tags: ['atom', 'generator'],
  params: [
    { kind: 'string', key: 'name', label: 'Name', default: 'ImageGen' },
    { kind: 'string', key: 'prompt', label: 'Prompt', default: '"A fantasy scene."' },
    { kind: 'string', key: 'negativePrompt', label: 'Negative prompt', default: 'text, watermark' },
    { kind: 'string', key: 'condition', label: 'Condition', default: 'true' },
    { kind: 'enum', key: 'aspectRatio', label: 'Aspect ratio', default: '16:9', choices: ['1:1', '4:3', '16:9', '9:16'] },
  ],
  locals: { variables: [], classifiers: [], generators: ['ImageGen'], functions: [] },
  source: { kind: 'builtin', materialize(params): SchemaArrays {
    const name = (params.name as string | undefined) ?? 'ImageGen'
    const prompt = (params.prompt as string | undefined) ?? '"A fantasy scene."'
    const negativePrompt = (params.negativePrompt as string | undefined) ?? 'text, watermark'
    const condition = (params.condition as string | undefined) ?? 'true'
    const aspectRatio = (params.aspectRatio as string | undefined) ?? '16:9'
    const updates = (params.updates as { variable: string; setTo: string }[] | undefined) ?? []
    const gen: any = {
      name,
      type: 'Image',
      phase: 'On Response',
      lazy: false,
      condition,
      prompt,
      negativePrompt,
      aspectRatio,
    }
    if (updates.length > 0) gen.updates = updates
    return { variables: [], classifiers: [], generators: [gen], contentRules: [], functions: [] }
  } },
}

export default def
