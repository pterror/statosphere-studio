import type { RecipeDef } from '../types'
import type { LabelWithUpdates } from './atoms/classifier-multi-event'

const npcTargetLabels: LabelWithUpdates[] = [
  {
    label: 'the innkeeper',
    category: 'npc',
    threshold: 0.6,
    updates: [{ variable: 'last_npc', setTo: '"innkeeper"' }],
  },
  {
    label: 'the merchant',
    category: 'npc',
    threshold: 0.6,
    updates: [{ variable: 'last_npc', setTo: '"merchant"' }],
  },
  {
    label: 'the guard',
    category: 'npc',
    threshold: 0.6,
    updates: [{ variable: 'last_npc', setTo: '"guard"' }],
  },
]

const affinityLabels: LabelWithUpdates[] = [
  {
    label: 'kind, generous, or helpful',
    category: 'affinity_event',
    threshold: 0.65,
    updates: [
      { variable: 'affinity_innkeeper', setTo: 'last_npc == "innkeeper" ? min(100, affinity_innkeeper + 10) : affinity_innkeeper' },
      { variable: 'affinity_merchant', setTo: 'last_npc == "merchant" ? min(100, affinity_merchant + 10) : affinity_merchant' },
      { variable: 'affinity_guard', setTo: 'last_npc == "guard" ? min(100, affinity_guard + 10) : affinity_guard' },
    ],
  },
  {
    label: 'rude, threatening, or demanding',
    category: 'affinity_event',
    threshold: 0.65,
    updates: [
      { variable: 'affinity_innkeeper', setTo: 'last_npc == "innkeeper" ? max(0, affinity_innkeeper - 15) : affinity_innkeeper' },
      { variable: 'affinity_merchant', setTo: 'last_npc == "merchant" ? max(0, affinity_merchant - 15) : affinity_merchant' },
      { variable: 'affinity_guard', setTo: 'last_npc == "guard" ? max(0, affinity_guard - 15) : affinity_guard' },
    ],
  },
]

const def: RecipeDef = {
  id: 'npc-relationships',
  name: 'NPC Relationship Tracker',
  description: 'Tracks affinity scores for three named NPCs.',
  tags: ['npc', 'affinity', 'classifier', 'relationships'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'affinity_innkeeper_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Innkeeper Affinity',
        paramBindings: {
          name: { kind: 'literal', value: 'affinity_innkeeper' },
          initialValue: { kind: 'literal', value: 50 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'affinity_merchant_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Merchant Affinity',
        paramBindings: {
          name: { kind: 'literal', value: 'affinity_merchant' },
          initialValue: { kind: 'literal', value: 50 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'affinity_guard_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Guard Affinity',
        paramBindings: {
          name: { kind: 'literal', value: 'affinity_guard' },
          initialValue: { kind: 'literal', value: 50 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'last_npc_var',
        recipeId: 'atom/var-state',
        defaultName: 'Last NPC',
        paramBindings: {
          name: { kind: 'literal', value: 'last_npc' },
          initialValue: { kind: 'literal', value: '"none"' },
        },
      },
      {
        refId: 'npc_target_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'NPC Target Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'NpcTarget' },
          hypothesis: { kind: 'literal', value: 'The user is primarily talking to or interacting with {}.' },
          labelsWithUpdates: { kind: 'literal', value: npcTargetLabels },
        },
      },
      {
        refId: 'affinity_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'Affinity Shift Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'AffinityShift' },
          hypothesis: { kind: 'literal', value: 'The user is being {}.' },
          labelsWithUpdates: { kind: 'literal', value: affinityLabels },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'NPC Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"NPC affinity — Innkeeper: " + affinity_innkeeper + "/100, Merchant: " + affinity_merchant + "/100, Guard: " + affinity_guard + "/100. Let high affinity unlock warmth and favors; low affinity cause suspicion or refusal."' },
        },
      },
    ],
  },
}

export default def
