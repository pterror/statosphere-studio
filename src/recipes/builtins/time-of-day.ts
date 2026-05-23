import type { RecipeDef } from '../types'

const def: RecipeDef = {
  id: 'time-of-day',
  name: 'Time-of-Day Proxy',
  description: 'A turn counter that maps turn ranges to morning, afternoon, evening, and night.',
  tags: ['time', 'proxy', 'ambient'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'turn_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Turn Counter',
        paramBindings: {
          name: { kind: 'literal', value: 'turn_count' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: 'turn_count + 1' },
        },
      },
      {
        refId: 'time_var',
        recipeId: 'atom/var-state',
        defaultName: 'Time of Day',
        paramBindings: {
          name: { kind: 'literal', value: 'time_of_day' },
          initialValue: { kind: 'literal', value: '"morning"' },
        },
      },
      {
        refId: 'time_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Time of Day Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"Time of day: " + (turn_count < 4 ? "morning" : turn_count < 8 ? "afternoon" : turn_count < 12 ? "evening" : "night") + " (turn " + turn_count + "). Let lighting, ambient sounds, and NPC availability reflect the time."' },
        },
      },
      {
        refId: 'night_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Night Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'turn_count >= 12' },
          modification: { kind: 'literal', value: '"It is now night. Shops are closed, guards are fewer, and the streets are quiet. Darkness shapes what is possible."' },
        },
      },
    ],
  },
}

export default def
