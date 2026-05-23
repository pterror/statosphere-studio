import type { RecipeDef } from '../types'
import type { LabelWithUpdates } from './atoms/classifier-multi-event'

const branchLabels: LabelWithUpdates[] = [
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
]

const def: RecipeDef = {
  id: 'branching-scenario',
  name: 'Branching Scenario',
  description: 'Models a three-way story branch gated by act.',
  tags: ['branching', 'acts', 'classifier', 'narrative'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'act_var',
        recipeId: 'atom/var-state',
        defaultName: 'Current Act',
        paramBindings: {
          name: { kind: 'literal', value: 'currentAct' },
          initialValue: { kind: 'literal', value: '"prologue"' },
        },
      },
      {
        refId: 'choice_var',
        recipeId: 'atom/var-state',
        defaultName: 'Choice Made',
        paramBindings: {
          name: { kind: 'literal', value: 'choiceMade' },
          initialValue: { kind: 'literal', value: '"none"' },
        },
      },
      {
        refId: 'unlocked_var',
        recipeId: 'atom/var-flag',
        defaultName: 'Act Unlocked Flag',
        paramBindings: {
          name: { kind: 'literal', value: 'actUnlocked' },
          initialValue: { kind: 'literal', value: 'false' },
          perTurnUpdate: { kind: 'literal', value: 'false' },
        },
      },
      {
        refId: 'gate_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'Scene Gate Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'SceneGate' },
          hypothesis: { kind: 'literal', value: 'The user is choosing to {}.' },
          labelsWithUpdates: { kind: 'literal', value: branchLabels },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Branch Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"Act: " + currentAct + ". Player\'s last branch choice: " + choiceMade + ". Gate gated scenes behind the correct act and choice."' },
        },
      },
      {
        refId: 'manor_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Manor Path Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'actUnlocked and choiceMade == "manor"' },
          modification: { kind: 'literal', value: '"The player has chosen the manor path. Transition act to \\"act1-manor\\". Describe arriving at the decaying gates."' },
        },
      },
      {
        refId: 'forest_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Forest Path Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'actUnlocked and choiceMade == "forest"' },
          modification: { kind: 'literal', value: '"The player has chosen the forest path. Transition act to \\"act1-forest\\". Describe the stranger leading them into the dark treeline."' },
        },
      },
      {
        refId: 'council_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Council Path Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'actUnlocked and choiceMade == "council"' },
          modification: { kind: 'literal', value: '"The player has chosen the council path. Transition act to \\"act1-council\\". Describe the torchlit council chamber."' },
        },
      },
    ],
  },
}

export default def
