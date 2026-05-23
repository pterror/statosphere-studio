import type { RecipeDef } from '../types'

const def: RecipeDef = {
  id: 'hp-tracker',
  name: 'HP Tracker',
  description: 'Tracks hit points across the conversation. A classifier watches for damage and healing events, and a Stage Direction surfaces current HP and a status label every turn.',
  tags: ['hp', 'combat', 'classifier', 'stat'],
  params: [
    { kind: 'number', key: 'maxHp', label: 'Max HP', default: 100, min: 1 },
    { kind: 'label-list', key: 'damageLabels', label: 'Damage labels', default: ['hit', 'blow', 'slash'] },
    { kind: 'label-list', key: 'healLabels', label: 'Heal labels', default: ['heal', 'bandage', 'potion'] },
  ],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'hp_var',
        recipeId: 'atom/var-counter',
        defaultName: 'HP Variable',
        paramBindings: {
          name: { kind: 'literal', value: 'hp' },
          initialValue: { kind: 'parent', paramKey: 'maxHp' },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'max_hp_var',
        recipeId: 'atom/var-counter',
        defaultName: 'Max HP Variable',
        paramBindings: {
          name: { kind: 'literal', value: 'max_hp' },
          initialValue: { kind: 'parent', paramKey: 'maxHp' },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      },
      {
        refId: 'damage_cls',
        recipeId: 'atom/classifier-event-detect',
        defaultName: 'Damage Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'CombatEvents' },
          label: { kind: 'derived', expr: 'taking damage — {{damageLabels}}' },
          category: { kind: 'literal', value: 'health_event' },
          threshold: { kind: 'literal', value: 0.65 },
          hypothesis: { kind: 'literal', value: 'The character {}.' },
          updates: { kind: 'literal', value: [{ variable: 'hp', setTo: 'max(0, hp - 10)' }] },
        },
      },
      {
        refId: 'heal_cls',
        recipeId: 'atom/classifier-event-detect',
        defaultName: 'Heal Classifier',
        paramBindings: {
          name: { kind: 'literal', value: 'HealEvents' },
          label: { kind: 'derived', expr: 'healing or recovering — {{healLabels}}' },
          category: { kind: 'literal', value: 'health_event' },
          threshold: { kind: 'literal', value: 0.65 },
          hypothesis: { kind: 'literal', value: 'The character {}.' },
          updates: { kind: 'literal', value: [{ variable: 'hp', setTo: 'min(max_hp, hp + 15)' }] },
        },
      },
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'HP Status',
        paramBindings: {
          condition: { kind: 'literal', value: 'true' },
          template: { kind: 'derived', expr: '"HP: " + hp + "/" + max_hp + ". " + (hp < round({{maxHp}} * 0.15) ? "The character is critically injured." : hp < round({{maxHp}} * 0.3) ? "The character is hurt." : "The character is in reasonable shape.")' },
        },
      },
    ],
  },
}

export default def
