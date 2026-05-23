import type { ConfigTree } from '../stores/config'
import type { LintResult } from './index'

function isUnescapedString(value: string): boolean {
  return (
    typeof value === 'string' &&
    value.startsWith('"') &&
    !value.startsWith('\\"')
  )
}

export function innerQuoteMismatch(config: ConfigTree): LintResult[] {
  const results: LintResult[] = []
  for (let i = 0; i < config.variables.length; i++) {
    const v = config.variables[i]
    if (isUnescapedString(v.initialValue)) {
      const inner = v.initialValue.slice(1, v.initialValue.endsWith('"') ? -1 : undefined)
      results.push({
        id: 'inner-quote-mismatch',
        severity: 'warn',
        section: 'variables',
        elementIndex: i,
        field: 'initialValue',
        message:
          'initialValue starts with a literal quote but is not escaped — the expression parser will error; wrap string values as \\"value\\" so they parse as string literals.',
        learnMore:
          'https://docs.rhi.zone/statosphere-guide/reference/gotchas#string-values-in-initialvalue-need-escaped-quotes',
        autoFix: (c: ConfigTree): ConfigTree => {
          const variables = c.variables.map((variable, idx) =>
            idx !== i
              ? variable
              : { ...variable, initialValue: `"${inner}"` }
          )
          return { ...c, variables }
        },
      })
    }
  }
  return results
}
