import type { ConfigTree } from '../stores/config'
import type { LintResult } from './index'

function containsReplace(value: string | undefined): boolean {
  return typeof value === 'string' && value.includes('.replace(')
}

export function replaceBug(config: ConfigTree): LintResult[] {
  const results: LintResult[] = []

  for (let i = 0; i < config.variables.length; i++) {
    const v = config.variables[i]
    const fields: Array<[string, string | undefined]> = [
      ['initialValue', v.initialValue],
      ['perTurnUpdate', v.perTurnUpdate],
      ['postInputUpdate', v.postInputUpdate],
      ['preResponseUpdate', v.preResponseUpdate],
      ['postResponseUpdate', v.postResponseUpdate],
    ]
    for (const [field, value] of fields) {
      if (containsReplace(value)) {
        results.push({
          id: 'replace-bug',
          severity: 'warn',
          section: 'variables',
          elementIndex: i,
          field,
          message:
            'The built-in replace() function has a bug where it references the wrong local variable — use split()/join() or a full JS function body instead.',
          learnMore:
            'https://docs.rhi.zone/statosphere-guide/reference/gotchas#the-replace-built-in-bug',
        })
      }
    }
  }

  for (let i = 0; i < config.contentRules.length; i++) {
    const cr = config.contentRules[i]
    const fields: Array<[string, string | undefined]> = [
      ['condition', cr.condition],
      ['modification', cr.modification],
    ]
    for (const [field, value] of fields) {
      if (containsReplace(value)) {
        results.push({
          id: 'replace-bug',
          severity: 'warn',
          section: 'contentRules',
          elementIndex: i,
          field,
          message:
            'The built-in replace() function has a bug where it references the wrong local variable — use split()/join() or a full JS function body instead.',
          learnMore:
            'https://docs.rhi.zone/statosphere-guide/reference/gotchas#the-replace-built-in-bug',
        })
      }
    }
  }

  for (let i = 0; i < config.generators.length; i++) {
    const gen = config.generators[i]
    if (!gen.updates) continue
    for (const update of gen.updates) {
      if (containsReplace(update.setTo)) {
        results.push({
          id: 'replace-bug',
          severity: 'warn',
          section: 'generators',
          elementIndex: i,
          field: 'updates',
          message:
            'The built-in replace() function has a bug where it references the wrong local variable — use split()/join() or a full JS function body instead.',
          learnMore:
            'https://docs.rhi.zone/statosphere-guide/reference/gotchas#the-replace-built-in-bug',
        })
        break
      }
    }
  }

  return results
}
