import type { RecipeDef } from '../types'
import type { LabelWithUpdates } from './atoms/classifier-multi-event'

const discoveryLabels: LabelWithUpdates[] = [
  {
    label: 'discovering or examining a physical clue',
    category: 'discovery',
    threshold: 0.65,
    updates: [{ variable: 'clues_found', setTo: 'clues_found + 1' }],
  },
  {
    label: 'finding evidence pointing toward the butler',
    category: 'suspicion',
    threshold: 0.6,
    updates: [{ variable: 'suspect_butler', setTo: 'suspect_butler + 1' }],
  },
  {
    label: 'finding evidence pointing toward the maid',
    category: 'suspicion',
    threshold: 0.6,
    updates: [{ variable: 'suspect_maid', setTo: 'suspect_maid + 1' }],
  },
  {
    label: 'finding evidence pointing toward the nephew',
    category: 'suspicion',
    threshold: 0.6,
    updates: [{ variable: 'suspect_nephew', setTo: 'suspect_nephew + 1' }],
  },
  {
    label: 'making a formal accusation',
    category: 'accusation',
    threshold: 0.7,
    updates: [{ variable: 'case_solved', setTo: 'true' }],
  },
]

const def: RecipeDef = {
  id: 'mystery-game',
  name: 'Mystery Investigation',
  description: 'Clue counter, per-suspect suspicion scores, and a case-solved flag.',
  tags: ['mystery', 'clues', 'suspects', 'classifier'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'clues_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Clues Found',
        paramBindings: {
          name: { kind: 'literal', value: 'clues_found' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'butler_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Butler Suspicion',
        paramBindings: {
          name: { kind: 'literal', value: 'suspect_butler' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'maid_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Maid Suspicion',
        paramBindings: {
          name: { kind: 'literal', value: 'suspect_maid' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'nephew_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Nephew Suspicion',
        paramBindings: {
          name: { kind: 'literal', value: 'suspect_nephew' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'solved_var',
        recipeId: 'atom/var-flag',
        defaultName: 'Case Solved Flag',
        paramBindings: {
          name: { kind: 'literal', value: 'case_solved' },
          initialValue: { kind: 'literal', value: 'false' },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'discovery_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'Discovery Events',
        paramBindings: {
          name: { kind: 'literal', value: 'DiscoveryEvents' },
          hypothesis: { kind: 'literal', value: 'The response reveals that {}.' },
          responseHypothesis: { kind: 'literal', value: 'The response reveals that {}.' },
          labelsWithUpdates: { kind: 'literal', value: discoveryLabels },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Mystery Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"Mystery state — Clues found: " + clues_found + ". Suspicion: Butler " + suspect_butler + ", Maid " + suspect_maid + ", Nephew " + suspect_nephew + ". Gate key revelations behind clue count; steer toward the most-suspected character\'s evidence."' },
        },
      },
      {
        refId: 'accusation_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Accusation Prompt',
        paramBindings: {
          condition: { kind: 'literal', value: 'clues_found >= 5 and not case_solved' },
          modification: { kind: 'literal', value: '"The player has gathered enough evidence to make an accusation. Gently signal that they have what they need."' },
        },
      },
    ],
  },
}

export default def
