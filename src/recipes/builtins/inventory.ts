import type { RecipeDef } from '../types'
import type { LabelWithUpdates } from './atoms/classifier-multi-event'

const inventoryLabels: LabelWithUpdates[] = [
  {
    label: 'picking up, grabbing, or taking an item',
    category: 'inventory_event',
    threshold: 0.65,
    updates: [
      {
        variable: 'inventoryFull',
        setTo: 'slot1 != "empty" and slot2 != "empty" and slot3 != "empty" and slot4 != "empty"',
      },
    ],
  },
  {
    label: 'dropping, discarding, or leaving an item behind',
    category: 'inventory_event',
    threshold: 0.65,
    updates: [{ variable: 'inventoryFull', setTo: 'false' }],
  },
]

const def: RecipeDef = {
  id: 'inventory',
  name: 'Four-slot Inventory',
  description: 'Maintains four named item slots with a full-inventory lock.',
  tags: ['inventory', 'items', 'classifier'],
  params: [],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'slot1_var',
        recipeId: 'atom/var-state',
        defaultName: 'Slot 1',
        paramBindings: {
          name: { kind: 'literal', value: 'slot1' },
          initialValue: { kind: 'literal', value: '"empty"' },
        },
      },
      {
        refId: 'slot2_var',
        recipeId: 'atom/var-state',
        defaultName: 'Slot 2',
        paramBindings: {
          name: { kind: 'literal', value: 'slot2' },
          initialValue: { kind: 'literal', value: '"empty"' },
        },
      },
      {
        refId: 'slot3_var',
        recipeId: 'atom/var-state',
        defaultName: 'Slot 3',
        paramBindings: {
          name: { kind: 'literal', value: 'slot3' },
          initialValue: { kind: 'literal', value: '"empty"' },
        },
      },
      {
        refId: 'slot4_var',
        recipeId: 'atom/var-state',
        defaultName: 'Slot 4',
        paramBindings: {
          name: { kind: 'literal', value: 'slot4' },
          initialValue: { kind: 'literal', value: '"empty"' },
        },
      },
      {
        refId: 'full_var',
        recipeId: 'atom/var-flag',
        defaultName: 'Inventory Full Flag',
        paramBindings: {
          name: { kind: 'literal', value: 'inventoryFull' },
          initialValue: { kind: 'literal', value: 'false' },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'inventory_cls',
        recipeId: 'atom/classifier-multi-event',
        defaultName: 'Inventory Events',
        paramBindings: {
          name: { kind: 'literal', value: 'InventoryEvents' },
          hypothesis: { kind: 'literal', value: 'The character {}.' },
          responseHypothesis: { kind: 'literal', value: 'The character {}.' },
          labelsWithUpdates: { kind: 'literal', value: inventoryLabels },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Inventory Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'literal', value: '"Inventory: [" + slot1 + "] [" + slot2 + "] [" + slot3 + "] [" + slot4 + "]. Track item pickups and drops. Update slot variables via /setVar when items change."' },
        },
      },
      {
        refId: 'full_rule',
        recipeId: 'atom/rule-stage-direction',
        defaultName: 'Inventory Full Direction',
        paramBindings: {
          condition: { kind: 'literal', value: 'inventoryFull' },
          modification: { kind: 'literal', value: '"All inventory slots are full. If the character tries to pick up an item, they must drop something first."' },
        },
      },
    ],
  },
}

export default def
