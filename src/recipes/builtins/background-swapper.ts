import type { RecipeDef } from '../types'

const def: RecipeDef = {
  id: 'background-swapper',
  name: 'Scene-aware Background Swapper',
  description: 'Detects location changes and generates a new background image.',
  tags: ['background', 'image', 'scene', 'classifier', 'generator'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'scene_var',
        recipeId: 'atom/var-state',
        defaultName: 'Current Scene',
        paramBindings: {
          name: { kind: 'literal', value: 'currentScene' },
          initialValue: { kind: 'literal', value: '"a quiet tavern"' },
        },
      },
      {
        refId: 'changed_var',
        recipeId: 'atom/var-flag',
        defaultName: 'Scene Changed Flag',
        paramBindings: {
          name: { kind: 'literal', value: 'sceneChanged' },
          initialValue: { kind: 'literal', value: 'false' },
          perTurnUpdate: { kind: 'literal', value: 'false' },
        },
      },
      {
        refId: 'shift_cls',
        recipeId: 'atom/classifier-event-detect',
        defaultName: 'Scene Shift Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'SceneShift' },
          label: { kind: 'literal', value: 'a new location' },
          threshold: { kind: 'literal', value: 0.6 },
          hypothesis: { kind: 'literal', value: 'The user is trying to move to or enter {}.' },
          category: { kind: 'literal', value: 'movement' },
          updates: { kind: 'literal', value: [{ variable: 'sceneChanged', setTo: 'true' }] },
        },
      },
      {
        refId: 'identify_cls',
        recipeId: 'atom/classifier-dynamic-label',
        defaultName: 'Scene Identifier',
        paramBindings: {
          name: { kind: 'literal', value: 'SceneIdentifier' },
          hypothesis: { kind: 'literal', value: 'The user wants to go to {}.' },
          label: { kind: 'literal', value: 'split("the forest|the castle|the market|the dungeon|the shore|the village", "|")' },
          threshold: { kind: 'literal', value: 0.5 },
          condition: { kind: 'literal', value: 'sceneChanged' },
          category: { kind: 'literal', value: 'destination' },
          useLlm: { kind: 'literal', value: true },
          updates: { kind: 'literal', value: [{ variable: 'currentScene', setTo: 'label' }] },
        },
      },
      {
        refId: 'bg_gen',
        recipeId: 'atom/generator-image',
        defaultName: 'Background Image',
        paramBindings: {
          name: { kind: 'literal', value: 'BackgroundImage' },
          prompt: { kind: 'literal', value: '"Fantasy scene illustration, no text: " + currentScene' },
          negativePrompt: { kind: 'literal', value: 'text, letters, watermark, logo, ui' },
          condition: { kind: 'literal', value: 'sceneChanged' },
          aspectRatio: { kind: 'literal', value: '16:9' },
          updates: { kind: 'literal', value: [{ variable: 'background', setTo: '{{content}}' }] },
        },
      },
      {
        refId: 'scene_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Scene Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"Current scene: " + currentScene + "."' },
        },
      },
      {
        refId: 'change_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Scene Change Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'sceneChanged' },
          modification: { kind: 'literal', value: '"The scene has just changed. Describe the new setting in your response."' },
        },
      },
    ],
  },
}

export default def
