import type { RecipeDef } from '../types'
import type { LabelWithUpdates } from './atoms/classifier-multi-event'

const moodLabels: LabelWithUpdates[] = [
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
]

const def: RecipeDef = {
  id: 'mood-companion',
  name: 'Mood-aware Companion',
  description: "Tracks a companion's emotional state across the conversation.",
  tags: ['mood', 'classifier', 'companion'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'mood_var',
        recipeId: 'atom/var-state',
        defaultName: 'Mood Variable',
        paramBindings: {
          name: { kind: 'literal', value: 'mood' },
          initialValue: { kind: 'literal', value: '"neutral"' },
        },
      },
      {
        refId: 'intensity_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Mood Intensity',
        paramBindings: {
          name: { kind: 'literal', value: 'moodIntensity' },
          initialValue: { kind: 'literal', value: 0.5 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'mood_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'Mood Shift Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'MoodShift' },
          hypothesis: { kind: 'literal', value: 'This response conveys that the companion is {}.' },
          responseHypothesis: { kind: 'literal', value: 'This response conveys that the companion is {}.' },
          labelsWithUpdates: { kind: 'literal', value: moodLabels },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Mood Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"{{char}}\'s current mood: " + mood + " (intensity " + round(moodIntensity * 100) + "%). Let this color their tone and word choice."' },
        },
      },
    ],
  },
}

export default def
