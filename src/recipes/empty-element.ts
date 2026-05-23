import type {
  ElementType,
  RecipeInstance,
  VariableElement,
  ClassifierElement,
  GeneratorElement,
  ContentRuleElement,
  FunctionElement,
  AnyElement,
} from './types'

// Prefix used in generated names for each element type.
const KIND_PREFIX: Record<ElementType, string> = {
  variables: 'var',
  classifiers: 'cls',
  generators: 'gen',
  contentRules: 'rule',
  functions: 'fn',
}

// Pattern: <prefix>_<number>
function maxCounterForKind(kind: ElementType, instance: RecipeInstance): number {
  const prefix = KIND_PREFIX[kind]
  const re = new RegExp(`^${prefix}_(\\d+)$`)
  let max = 0
  for (const bucket of Object.values(instance.extrasByPath ?? {})) {
    for (const el of bucket[kind]) {
      const name = (el as { name?: string })?.name ?? ''
      const m = name.match(re)
      if (m) max = Math.max(max, Number(m[1]))
    }
  }
  return max
}

function nextN(kind: ElementType, instance: RecipeInstance): number {
  return maxCounterForKind(kind, instance) + 1
}

export function emptyElement(kind: ElementType, instance: RecipeInstance): AnyElement {
  const n = nextN(kind, instance)
  if (kind === 'variables') {
    return { name: `var_${n}`, initialValue: '0' } satisfies VariableElement
  }
  if (kind === 'classifiers') {
    return { name: `cls_${n}`, classifications: [] } satisfies ClassifierElement
  }
  if (kind === 'generators') {
    return {
      name: `gen_${n}`,
      type: 'Text',
      prompt: '""',
      minTokens: 5,
      maxTokens: 40,
      phase: 'On Response',
    } satisfies GeneratorElement
  }
  if (kind === 'contentRules') {
    return { category: 'Stage Direction', condition: 'true', modification: '""' } satisfies ContentRuleElement
  }
  // functions
  return { name: `fn_${n}`, body: '0' } satisfies FunctionElement
}
