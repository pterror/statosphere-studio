import type { ConfigTree } from '../stores/config'
import type { LintResult } from './index'

export function initializationPhase(config: ConfigTree): LintResult[] {
  const results: LintResult[] = []
  for (let i = 0; i < config.generators.length; i++) {
    const gen = config.generators[i]
    if ((gen.phase as string) === 'Initialization') {
      results.push({
        id: 'initialization-phase',
        severity: 'warn',
        section: 'generators',
        elementIndex: i,
        field: 'phase',
        message:
          'The "Initialization" phase does not exist in the current runtime — use "On Input" with a condition that checks whether the target variable is null.',
        learnMore:
          'https://docs.rhi.zone/statosphere-guide/reference/gotchas#the-initialization-phase-does-not-exist',
        autoFix: (c: ConfigTree): ConfigTree => {
          const generators = c.generators.map((g, idx) =>
            idx !== i ? g : { ...g, phase: 'On Input' as const }
          )
          return { ...c, generators }
        },
      })
    }
  }
  return results
}
