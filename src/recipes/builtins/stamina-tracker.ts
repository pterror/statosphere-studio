import type { RecipeDef } from '../types'
import type { LabelWithUpdates } from './atoms/classifier-multi-event'

const staminaLabels: LabelWithUpdates[] = [
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
]

const def: RecipeDef = {
  id: 'stamina-tracker',
  name: 'Stamina Tracker',
  description: 'Models exertion and rest. Heavy activity drains stamina; resting regenerates it.',
  tags: ['stamina', 'regen', 'classifier', 'stat'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'stamina_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Stamina Variable',
        paramBindings: {
          name: { kind: 'literal', value: 'stamina' },
          initialValue: { kind: 'literal', value: 100 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'max_stamina_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Max Stamina Variable',
        paramBindings: {
          name: { kind: 'literal', value: 'max_stamina' },
          initialValue: { kind: 'literal', value: 100 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'resting_var',
        recipeId: 'atom/var-flag',
        defaultName: 'Resting Flag',
        paramBindings: {
          name: { kind: 'literal', value: 'resting' },
          initialValue: { kind: 'literal', value: 'false' },
          perTurnUpdate: { kind: 'literal', value: 'false' },
        },
      },
      {
        refId: 'exertion_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'Stamina Events',
        paramBindings: {
          name: { kind: 'literal', value: 'StaminaEvents' },
          hypothesis: { kind: 'literal', value: 'The character {}.' },
          responseHypothesis: { kind: 'literal', value: 'The character {}.' },
          labelsWithUpdates: { kind: 'literal', value: staminaLabels },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Stamina Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"Stamina: " + stamina + "/" + max_stamina + ". " + (stamina < 20 ? "Exhausted — movement is painful." : stamina < 50 ? "Winded — pushing hard." : "Fresh — full capability.")' },
        },
      },
      {
        refId: 'resting_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Resting Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'resting' },
          modification: { kind: 'literal', value: '"The character is resting. Describe their recovery; let tension ease from the prose."' },
        },
      },
    ],
  },
}

export default def
