import type { ParamBinding, ComposedRef } from './types'

export function resolveBinding(binding: ParamBinding, parentParams: Record<string, unknown>): unknown {
  if (binding.kind === 'literal') return binding.value
  if (binding.kind === 'parent') return parentParams[binding.paramKey]
  // derived: substitute {{key}} from parentParams
  return binding.expr.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = parentParams[key]
    return val != null ? String(val) : ''
  })
}

export function resolveChildParams(
  ref: ComposedRef,
  parentParams: Record<string, unknown>,
  childOverrides: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, binding] of Object.entries(ref.paramBindings)) {
    result[key] = resolveBinding(binding, parentParams)
  }
  if (childOverrides) {
    Object.assign(result, childOverrides)
  }
  return result
}
