import type { ConfigTree } from '../stores/config'
import type { LintResult } from './index'

const TAG_RE = /\{\{(\w+)\}\}/g

function extractTags(value: string | undefined): string[] {
  if (!value) return []
  const names: string[] = []
  let m: RegExpExecArray | null
  TAG_RE.lastIndex = 0
  while ((m = TAG_RE.exec(value)) !== null) {
    names.push(m[1])
  }
  return names
}

export function undeclaredVariable(config: ConfigTree): LintResult[] {
  const declared = new Set(config.variables.map((v) => v.name))
  const results: LintResult[] = []

  function check(
    section: LintResult['section'],
    elementIndex: number,
    field: string,
    value: string | undefined,
  ) {
    for (const name of extractTags(value)) {
      if (!declared.has(name)) {
        results.push({
          id: 'undeclared-variable',
          severity: 'warn',
          section,
          elementIndex,
          field,
          message: `Template tag {{${name}}} references a variable that is not declared in the Variables section.`,
          learnMore:
            'https://docs.rhi.zone/statosphere-guide/reference/gotchas#template-tags-only-expand-inside-string-literals',
        })
      }
    }
  }

  for (let i = 0; i < config.classifiers.length; i++) {
    const cl = config.classifiers[i]
    check('classifiers', i, 'condition', cl.condition)
    check('classifiers', i, 'inputTemplate', cl.inputTemplate)
    check('classifiers', i, 'inputHypothesis', cl.inputHypothesis)
    check('classifiers', i, 'responseTemplate', cl.responseTemplate)
    check('classifiers', i, 'responseHypothesis', cl.responseHypothesis)
    for (const cls of cl.classifications) {
      check('classifiers', i, 'labelCondition', cls.condition)
    }
  }

  for (let i = 0; i < config.generators.length; i++) {
    const gen = config.generators[i]
    check('generators', i, 'condition', gen.condition)
    check('generators', i, 'prompt', gen.prompt)
    if (gen.updates) {
      for (const upd of gen.updates) {
        check('generators', i, 'updates', upd.setTo)
      }
    }
  }

  for (let i = 0; i < config.contentRules.length; i++) {
    const cr = config.contentRules[i]
    check('contentRules', i, 'condition', cr.condition)
    check('contentRules', i, 'modification', cr.modification)
  }

  return results
}
