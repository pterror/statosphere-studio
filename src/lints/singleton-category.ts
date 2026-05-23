import type { ConfigTree } from '../stores/config'
import type { LintResult } from './index'

export function singletonCategory(config: ConfigTree): LintResult[] {
  const results: LintResult[] = []
  for (let i = 0; i < config.classifiers.length; i++) {
    const cl = config.classifiers[i]
    const categoryCounts = new Map<string, number>()
    for (const cls of cl.classifications) {
      if (cls.category) {
        categoryCounts.set(cls.category, (categoryCounts.get(cls.category) ?? 0) + 1)
      }
    }
    for (const [category, count] of categoryCounts) {
      if (count === 1) {
        results.push({
          id: 'singleton-category',
          severity: 'info',
          section: 'classifiers',
          elementIndex: i,
          field: 'category',
          message: `Category "${category}" appears on only one label — categories are only meaningful when shared by multiple labels in mutual competition.`,
          learnMore:
            'https://docs.rhi.zone/statosphere-guide/reference/gotchas',
        })
      }
    }
  }
  return results
}
