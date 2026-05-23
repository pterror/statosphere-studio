import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'turn_count', initialValue: '0', perTurnUpdate: 'turn_count + 1' },
    { name: 'time_of_day', initialValue: '"morning"' },
  ],
  functions: [],
  classifiers: [],
  generators: [],
  contentRules: [
    {
      category: 'Stage Direction',
      condition: 'true',
      modification:
        '"Time of day: " + (turn_count < 4 ? "morning" : turn_count < 8 ? "afternoon" : turn_count < 12 ? "evening" : "night") + " (turn " + turn_count + "). Let lighting, ambient sounds, and NPC availability reflect the time."',
    },
    {
      category: 'Stage Direction',
      condition: 'turn_count >= 12',
      modification:
        '"It is now night. Shops are closed, guards are fewer, and the streets are quiet. Darkness shapes what is possible."',
    },
  ],
}

const def: RecipeDef = {
  id: 'time-of-day',
  name: 'Time-of-Day Proxy',
  description: 'A turn counter that maps turn ranges to morning, afternoon, evening, and night.',
  tags: ['time', 'proxy', 'ambient'],
  params: [],
  source: { kind: "builtin", materialize: () => JSON.parse(JSON.stringify(data)) },
}

export default def
