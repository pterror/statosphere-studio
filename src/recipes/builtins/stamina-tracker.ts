import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'stamina', initialValue: '100' },
    { name: 'max_stamina', initialValue: '100' },
    { name: 'resting', initialValue: 'false', perTurnUpdate: 'false' },
  ],
  functions: [],
  classifiers: [
    {
      name: 'StaminaEvents',
      inputTemplate: '{{content}}',
      inputHypothesis: 'The user describes the character {}.',
      responseTemplate: '{{content}}',
      responseHypothesis: 'The character {}.',
      classifications: [
        {
          label: 'sprinting, fighting hard, or exerting themselves heavily',
          category: 'exertion_level',
          threshold: 0.65,
          updates: [
            { variable: 'stamina', setTo: 'max(0, stamina - 20)' },
            { variable: 'resting', setTo: 'false' },
          ],
        },
        {
          label: 'walking, moving, or doing light activity',
          category: 'exertion_level',
          threshold: 0.6,
          updates: [
            { variable: 'stamina', setTo: 'max(0, stamina - 5)' },
            { variable: 'resting', setTo: 'false' },
          ],
        },
        {
          label: 'resting, sleeping, or catching their breath',
          category: 'exertion_level',
          threshold: 0.6,
          updates: [
            { variable: 'resting', setTo: 'true' },
            { variable: 'stamina', setTo: 'min(max_stamina, stamina + 30)' },
          ],
        },
      ],
    },
  ],
  generators: [],
  contentRules: [
    {
      category: 'Stage Direction',
      condition: 'true',
      modification:
        '"Stamina: " + stamina + "/" + max_stamina + ". " + (stamina < 20 ? "Exhausted — movement is painful." : stamina < 50 ? "Winded — pushing hard." : "Fresh — full capability.")',
    },
    {
      category: 'Stage Direction',
      condition: 'resting',
      modification:
        '"The character is resting. Describe their recovery; let tension ease from the prose."',
    },
  ],
}

const def: RecipeDef = {
  id: 'stamina-tracker',
  name: 'Stamina Tracker',
  description: 'Models exertion and rest. Heavy activity drains stamina; resting regenerates it.',
  tags: ['stamina', 'regen', 'classifier', 'stat'],
  params: [],
  materialize: () => JSON.parse(JSON.stringify(data)),
}

export default def
