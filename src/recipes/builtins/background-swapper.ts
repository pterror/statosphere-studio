import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'currentScene', initialValue: '"a quiet tavern"' },
    { name: 'sceneChanged', initialValue: 'false', perTurnUpdate: 'false' },
  ],
  functions: [],
  classifiers: [
    {
      name: 'SceneShift',
      inputTemplate: '{{content}}',
      inputHypothesis: 'The user is trying to move to or enter {}.',
      classifications: [
        {
          label: 'a new location',
          category: 'movement',
          threshold: 0.6,
          updates: [{ variable: 'sceneChanged', setTo: 'true' }],
        },
      ],
    },
    {
      name: 'SceneIdentifier',
      condition: 'sceneChanged',
      useLlm: true,
      inputTemplate: '{{content}}',
      inputHypothesis: 'The user wants to go to {}.',
      classifications: [
        {
          label: 'split("the forest|the castle|the market|the dungeon|the shore|the village", "|")',
          dynamic: true,
          category: 'destination',
          threshold: 0.5,
          updates: [{ variable: 'currentScene', setTo: 'label' }],
        },
      ],
    },
  ],
  generators: [
    {
      name: 'BackgroundImage',
      type: 'Image',
      phase: 'On Response',
      lazy: false,
      condition: 'sceneChanged',
      prompt: '"Fantasy scene illustration, no text: " + currentScene',
      negativePrompt: 'text, letters, watermark, logo, ui',
      aspectRatio: '16:9',
      updates: [{ variable: 'background', setTo: '{{content}}' }],
    },
  ],
  contentRules: [
    {
      category: 'Stage Direction',
      condition: 'true',
      modification: '"Current scene: " + currentScene + "."',
    },
    {
      category: 'Stage Direction',
      condition: 'sceneChanged',
      modification: '"The scene has just changed. Describe the new setting in your response."',
    },
  ],
}

const def: RecipeDef = {
  id: 'background-swapper',
  name: 'Scene-aware Background Swapper',
  description: 'Detects location changes and generates a new background image.',
  tags: ['background', 'image', 'scene', 'classifier', 'generator'],
  params: [],
  materialize: () => JSON.parse(JSON.stringify(data)),
}

export default def
