import type { RecipeDef, SchemaArrays } from '../types'

const data: SchemaArrays = {
  variables: [
    { name: 'slot1', initialValue: '"empty"' },
    { name: 'slot2', initialValue: '"empty"' },
    { name: 'slot3', initialValue: '"empty"' },
    { name: 'slot4', initialValue: '"empty"' },
    { name: 'inventoryFull', initialValue: 'false' },
  ],
  functions: [],
  classifiers: [
    {
      name: 'InventoryEvents',
      inputTemplate: '{{content}}',
      inputHypothesis: 'The user is {}.',
      responseTemplate: '{{content}}',
      responseHypothesis: 'The character {}.',
      classifications: [
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
      ],
    },
  ],
  generators: [],
  contentRules: [
    {
      category: 'Stage Direction',
      condition: 'true',
      modification:
        '"Inventory: [" + slot1 + "] [" + slot2 + "] [" + slot3 + "] [" + slot4 + "]. Track item pickups and drops. Update slot variables via /setVar when items change."',
    },
    {
      category: 'Stage Direction',
      condition: 'inventoryFull',
      modification:
        '"All inventory slots are full. If the character tries to pick up an item, they must drop something first."',
    },
  ],
}

const def: RecipeDef = {
  id: 'inventory',
  name: 'Four-slot Inventory',
  description: 'Maintains four named item slots with a full-inventory lock.',
  tags: ['inventory', 'items', 'classifier'],
  params: [],
  source: { kind: "builtin", materialize: () => JSON.parse(JSON.stringify(data)) },
}

export default def
