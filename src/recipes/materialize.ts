import type { RecipeInstance, SchemaArrays, ElementType, Substitution } from './types'
import { getRecipe } from './registry'

function safeName(prefix: string): string {
  return prefix.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_+|_+$/g, '')
}

function prefixElement(element: any, prefix: string, elementType: ElementType): any {
  if (!element || typeof element !== 'object') return element
  const clone = { ...element }
  if (elementType === 'contentRules') return clone
  if ('name' in clone && typeof clone.name === 'string' && clone.name) {
    clone.name = `${prefix}.${clone.name}`
  }
  return clone
}

function stripPrefixFromElement(element: any, elementType: ElementType): any {
  if (!element || typeof element !== 'object') return element
  if (elementType === 'contentRules') return { ...element }
  const clone = { ...element }
  if ('name' in clone && typeof clone.name === 'string') {
    // Strip "<prefix>." prefix if present
    const dotIdx = clone.name.indexOf('.')
    if (dotIdx !== -1) clone.name = clone.name.slice(dotIdx + 1)
  }
  return clone
}

function mergeArrays(a: SchemaArrays, b: SchemaArrays): SchemaArrays {
  return {
    variables: [...a.variables, ...b.variables],
    classifiers: [...a.classifiers, ...b.classifiers],
    generators: [...a.generators, ...b.generators],
    contentRules: [...a.contentRules, ...b.contentRules],
    functions: [...a.functions, ...b.functions],
  }
}

// Walk a nested object/array by fieldPath and set the leaf to value.
function setDeep(obj: any, path: string[], value: string): void {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    cur = cur?.[path[i]]
  }
  if (cur != null && path.length > 0) {
    cur[path[path.length - 1]] = value
  }
}

// Generic interpreter for serializable custom recipes.
// Clones the template and substitutes paramKey values at each declared path.
export function interpretTemplate(
  template: SchemaArrays,
  substitutions: Substitution[],
  params: Record<string, unknown>,
): SchemaArrays {
  const result: SchemaArrays = JSON.parse(JSON.stringify(template))
  for (const sub of substitutions) {
    const { elementType, index, fieldPath } = sub.path
    const arr = result[elementType]
    if (index < arr.length) {
      const val = params[sub.paramKey]
      if (typeof val === 'string') {
        setDeep(arr[index], fieldPath, val)
      } else if (Array.isArray(val)) {
        setDeep(arr[index], fieldPath, val.join(', '))
      } else if (val != null) {
        setDeep(arr[index], fieldPath, String(val))
      }
    }
  }
  return result
}

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

export interface MaterializeOptions {
  /** When true, element names are emitted without the "<instanceName>." prefix.
   *  If two recipes produce the same bare name, a numeric suffix (_2, _3, …) is appended. */
  stripPrefix?: boolean
}

export function materializeInstances(instances: RecipeInstance[], opts: MaterializeOptions = {}): SchemaArrays {
  const result: SchemaArrays = {
    variables: [],
    classifiers: [],
    generators: [],
    contentRules: [],
    functions: [],
  }

  // Track seen bare names per element type for collision handling when stripPrefix is on.
  const seenNames: Record<ElementType, Map<string, number>> = {
    variables: new Map(),
    classifiers: new Map(),
    generators: new Map(),
    contentRules: new Map(),
    functions: new Map(),
  }

  function dedupName(et: ElementType, name: string): string {
    if (!name || et === 'contentRules') return name
    const seen = seenNames[et]
    const count = (seen.get(name) ?? 0) + 1
    seen.set(name, count)
    return count === 1 ? name : `${name}_${count}`
  }

  for (const inst of instances) {
    const recipe = getRecipe(inst.recipeId)
    if (!recipe) continue

    let materialized: SchemaArrays
    if (recipe.source.kind === 'builtin') {
      materialized = recipe.source.materialize(inst.params)
    } else {
      materialized = interpretTemplate(recipe.source.template, recipe.source.substitutions, inst.params)
    }

    const prefix = safeName(inst.name) || safeName(inst.recipeId)

    const pinnedMap = new Map<string, any>()
    for (const p of inst.pinned) {
      pinnedMap.set(`${p.elementType}:${p.elementName}`, p.override)
    }

    for (const et of ELEMENT_TYPES) {
      for (const el of materialized[et]) {
        const name = el?.name ?? ''
        const pinned = pinnedMap.get(`${et}:${name}`)
        let resolved: any
        if (pinned !== undefined) {
          resolved = pinned
        } else if (opts.stripPrefix) {
          const stripped = stripPrefixFromElement(el, et)
          if (stripped?.name) stripped.name = dedupName(et, stripped.name)
          resolved = stripped
        } else {
          resolved = prefixElement(el, prefix, et)
        }
        result[et].push(resolved)
      }
      for (const el of inst.extras[et]) {
        result[et].push(el)
      }
    }
  }

  return result
}
