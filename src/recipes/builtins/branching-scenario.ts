import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'currentAct', initialValue: '"prologue"' },
    { name: 'choiceMade', initialValue: '"none"' },
    { name: 'actUnlocked', initialValue: 'false', perTurnUpdate: 'false' },
  ],
  functions: [],
  classifiers: [
    {
      name: 'SceneGate',
      inputTemplate: '{{content}}',
      inputHypothesis: 'The user is choosing to {}.',
      classifications: [
        {
          label: 'investigate the old manor',
          category: 'branch_choice',
          threshold: 0.6,
          updates: [
            { variable: 'choiceMade', setTo: '"manor"' },
            { variable: 'actUnlocked', setTo: 'currentAct == "prologue"' },
          ],
        },
        {
          label: 'follow the stranger into the forest',
          category: 'branch_choice',
          threshold: 0.6,
          updates: [
            { variable: 'choiceMade', setTo: '"forest"' },
            { variable: 'actUnlocked', setTo: 'currentAct == "prologue"' },
          ],
        },
        {
          label: 'report to the town council',
          category: 'branch_choice',
          threshold: 0.6,
          updates: [
            { variable: 'choiceMade', setTo: '"council"' },
            { variable: 'actUnlocked', setTo: 'currentAct == "prologue"' },
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
        '"Act: " + currentAct + ". Player\'s last branch choice: " + choiceMade + ". Gate gated scenes behind the correct act and choice."',
    },
    {
      category: 'Stage Direction',
      condition: 'actUnlocked and choiceMade == "manor"',
      modification:
        '"The player has chosen the manor path. Transition act to \\"act1-manor\\". Describe arriving at the decaying gates."',
    },
    {
      category: 'Stage Direction',
      condition: 'actUnlocked and choiceMade == "forest"',
      modification:
        '"The player has chosen the forest path. Transition act to \\"act1-forest\\". Describe the stranger leading them into the dark treeline."',
    },
    {
      category: 'Stage Direction',
      condition: 'actUnlocked and choiceMade == "council"',
      modification:
        '"The player has chosen the council path. Transition act to \\"act1-council\\". Describe the torchlit council chamber."',
    },
  ],
}

const def: RecipeDef = {
  id: 'branching-scenario',
  name: 'Branching Scenario',
  description: 'Models a three-way story branch gated by act.',
  tags: ['branching', 'acts', 'classifier', 'narrative'],
  params: [],
  locals: {
    variables: ['currentAct', 'choiceMade', 'actUnlocked'],
    classifiers: ['SceneGate'],
    generators: [],
    functions: [],
  },
  source: { kind: "builtin", materialize: () => JSON.parse(JSON.stringify(data)) },
}

export default def
