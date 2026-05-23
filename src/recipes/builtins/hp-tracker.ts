import type { RecipeDef, SchemaArrays } from '../types'

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
  materialize(params): SchemaArrays {
    const maxHp = (params.maxHp as number | undefined) ?? 100
    const damageLabels = (params.damageLabels as string[] | undefined) ?? ['hit', 'blow', 'slash']
    const healLabels = (params.healLabels as string[] | undefined) ?? ['heal', 'bandage', 'potion']

    const damageLabel = damageLabels.join(', ')
    const healLabel = healLabels.join(', ')

    return {
      variables: [
        { name: 'hp', initialValue: String(maxHp) },
        { name: 'max_hp', initialValue: String(maxHp) },
      ],
      functions: [],
      classifiers: [
        {
          name: 'CombatEvents',
          inputTemplate: '{{content}}',
          inputHypothesis: 'The user describes the character {}.',
          responseTemplate: '{{content}}',
          responseHypothesis: 'The character {}.',
          classifications: [
            {
              label: `taking damage — ${damageLabel}`,
              category: 'health_event',
              threshold: 0.65,
              updates: [{ variable: 'hp', setTo: 'max(0, hp - 10)' }],
            },
            {
              label: `healing or recovering — ${healLabel}`,
              category: 'health_event',
              threshold: 0.65,
              updates: [{ variable: 'hp', setTo: 'min(max_hp, hp + 15)' }],
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
            '"HP: " + hp + "/" + max_hp + ". " + (hp < ' +
            Math.round(maxHp * 0.15) +
            ' ? "The character is critically injured." : hp < ' +
            Math.round(maxHp * 0.30) +
            ' ? "The character is hurt." : "The character is in reasonable shape.")',
        },
      ],
    }
  },
}

export default def
