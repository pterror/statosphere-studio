import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'mood', initialValue: '"neutral"' },
    { name: 'moodIntensity', initialValue: '0.5' },
  ],
  functions: [],
  classifiers: [
    {
      name: 'MoodShift',
      inputTemplate: '{{content}}',
      inputHypothesis: 'The user is {}.',
      responseTemplate: '{{content}}',
      responseHypothesis: 'This response conveys that the companion is {}.',
      classifications: [
        {
          label: 'expressing affection or warmth',
          category: 'mood_event',
          threshold: 0.65,
          updates: [
            { variable: 'mood', setTo: '"happy"' },
            { variable: 'moodIntensity', setTo: 'min(1, moodIntensity + 0.2)' },
          ],
        },
        {
          label: 'being rude, dismissive, or unkind',
          category: 'mood_event',
          threshold: 0.65,
          updates: [
            { variable: 'mood', setTo: '"sad"' },
            { variable: 'moodIntensity', setTo: 'min(1, moodIntensity + 0.2)' },
          ],
        },
        {
          label: 'describing something frightening or dangerous',
          category: 'mood_event',
          threshold: 0.65,
          updates: [
            { variable: 'mood', setTo: '"anxious"' },
            { variable: 'moodIntensity', setTo: 'min(1, moodIntensity + 0.2)' },
          ],
        },
        {
          label: 'telling a joke or being playful',
          category: 'mood_event',
          threshold: 0.6,
          updates: [
            { variable: 'mood', setTo: '"playful"' },
            { variable: 'moodIntensity', setTo: 'min(1, moodIntensity + 0.15)' },
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
        '"{{char}}\'s current mood: " + mood + " (intensity " + round(moodIntensity * 100) + "%). Let this color their tone and word choice."',
    },
  ],
}

const def: RecipeDef = {
  id: 'mood-companion',
  name: 'Mood-aware Companion',
  description: 'Tracks a companion\'s emotional state across the conversation.',
  tags: ['mood', 'classifier', 'companion'],
  params: [],
  locals: {
    variables: ['mood', 'moodIntensity'],
    classifiers: ['MoodShift'],
    generators: [],
    functions: [],
  },
  source: { kind: "builtin", materialize: () => JSON.parse(JSON.stringify(data)) },
}

export default def
