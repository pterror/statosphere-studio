import type { RecipeInstance, SchemaArrays, ElementType } from './types'
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

function mergeArrays(a: SchemaArrays, b: SchemaArrays): SchemaArrays {
  return {
    variables: [...a.variables, ...b.variables],
    classifiers: [...a.classifiers, ...b.classifiers],
    generators: [...a.generators, ...b.generators],
    contentRules: [...a.contentRules, ...b.contentRules],
    functions: [...a.functions, ...b.functions],
  }
}

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

export function materializeInstances(instances: RecipeInstance[]): SchemaArrays {
  const result: SchemaArrays = {
    variables: [],
    classifiers: [],
    generators: [],
    contentRules: [],
    functions: [],
  }

  for (const inst of instances) {
    const recipe = getRecipe(inst.recipeId)
    if (!recipe) continue

    const materialized = recipe.materialize(inst.params)
    const prefix = safeName(inst.name) || safeName(inst.recipeId)

    const pinnedMap = new Map<string, any>()
    for (const p of inst.pinned) {
      pinnedMap.set(`${p.elementType}:${p.elementName}`, p.override)
    }

    for (const et of ELEMENT_TYPES) {
      for (const el of materialized[et]) {
        const name = el?.name ?? ''
        const pinned = pinnedMap.get(`${et}:${name}`)
        const resolved = pinned !== undefined ? pinned : prefixElement(el, prefix, et)
        result[et].push(resolved)
      }
      for (const el of inst.extras[et]) {
        result[et].push(el)
      }
    }
  }

  return result
}
