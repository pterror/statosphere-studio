import type { RecipeInstance, RecipeDef, SchemaArrays, ElementType, Substitution, Locals } from './types'
import type { RenameMap } from './rewrite-refs'
import { rewriteRefs } from './rewrite-refs'
import { getRecipe } from './registry'

// Lowercase, replace non-alphanumeric runs with _, trim leading/trailing _.
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function buildRenameMap(locals: Locals, slug: string): RenameMap {
  const mapKind = (names: string[]) =>
    Object.fromEntries(names.map(n => [n, `${slug}_${n}`]))
  return {
    variables: mapKind(locals.variables),
    classifiers: mapKind(locals.classifiers),
    generators: mapKind(locals.generators),
    functions: mapKind(locals.functions),
  }
}

function applyRenameToNames(arrays: SchemaArrays, renameMap: RenameMap): SchemaArrays {
  const result = structuredClone(arrays)
  for (const et of ['variables', 'classifiers', 'generators', 'functions'] as const) {
    const map = renameMap[et as keyof RenameMap]
    result[et] = result[et].map((el: any) => {
      if (!el || typeof el !== 'object' || typeof el.name !== 'string') return el
      return { ...el, name: map[el.name] ?? el.name }
    })
  }
  return result
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
  /** When true, element names are emitted without the instance-slug prefix.
   *  If two recipes produce the same bare name, a numeric suffix (_2, _3, …) is appended. */
  stripPrefix?: boolean
}

// Derive locals from a template by reading names from each array.
export function localsFromTemplate(template: SchemaArrays): Locals {
  const names = (arr: any[]) => arr.map((el: any) => el?.name).filter((n: any) => typeof n === 'string' && n)
  return {
    variables: names(template.variables),
    classifiers: names(template.classifiers),
    generators: names(template.generators),
    functions: names(template.functions),
  }
}

export function materializeInstances(instances: RecipeInstance[], opts: MaterializeOptions = {}): SchemaArrays {
  const result: SchemaArrays = {
    variables: [],
    classifiers: [],
    generators: [],
    contentRules: [],
    functions: [],
  }

  // Track slugs to assign unique suffixes per instance.
  const slugCounts: Map<string, number> = new Map()

  function assignSlug(base: string): string {
    const count = (slugCounts.get(base) ?? 0) + 1
    slugCounts.set(base, count)
    return count === 1 ? base : `${base}_${count}`
  }

  // For stripPrefix: track seen bare names per element type for collision dedup.
  const seenBareNames: Record<ElementType, Map<string, number>> = {
    variables: new Map(),
    classifiers: new Map(),
    generators: new Map(),
    contentRules: new Map(),
    functions: new Map(),
  }

  // Per-instance prefixed→bare maps for stripPrefix rewrite.
  // After all instances are materialized, we'll build a global rename for stripping.
  const instancePrefixedLocals: { slug: string; locals: Locals }[] = []

  for (const inst of instances) {
    const recipe = getRecipe(inst.recipeId)
    if (!recipe) continue

    let bareArrays: SchemaArrays
    if (recipe.source.kind === 'builtin') {
      bareArrays = recipe.source.materialize(inst.params)
    } else {
      bareArrays = interpretTemplate(recipe.source.template, recipe.source.substitutions, inst.params)
    }

    // Determine locals: declared on def, or derived from template for custom recipes without locals.
    const locals: Locals = recipe.locals ?? localsFromTemplate(bareArrays)

    const slugBase = slugify(inst.name) || slugify(inst.recipeId) || 'instance'
    const slug = assignSlug(slugBase)
    const renameMap = buildRenameMap(locals, slug)

    // Rewrite all identifier references in expression fields.
    const rewritten = rewriteRefs(bareArrays, renameMap)
    // Then rename the name fields themselves.
    const prefixed = applyRenameToNames(rewritten, renameMap)

    // Build pinned map keyed by bare original name (pre-prefix) and prefixed name.
    const pinnedMap = new Map<string, any>()
    for (const p of inst.pinned) {
      pinnedMap.set(`${p.elementType}:${p.elementName}`, p.override)
    }

    for (const et of ELEMENT_TYPES) {
      for (const el of prefixed[et]) {
        const prefixedName = el?.name ?? ''
        // Pinned overrides are keyed by prefixed name (post-rename).
        const pinned = pinnedMap.get(`${et}:${prefixedName}`)
        const resolved = pinned !== undefined ? pinned : el
        result[et].push(resolved)
      }
      // Extras are user-written expecting prefixed identifiers to already exist.
      // Rewrite extras with the same renameMap so refs resolve correctly.
      const rewrittenExtras = rewriteRefs(inst.extras, renameMap)
      for (const el of rewrittenExtras[et]) {
        result[et].push(el)
      }
    }

    instancePrefixedLocals.push({ slug, locals })
  }

  if (opts.stripPrefix) {
    return stripPrefixes(result, instancePrefixedLocals)
  }

  return result
}

function stripPrefixes(
  arrays: SchemaArrays,
  prefixedLocals: { slug: string; locals: Locals }[],
): SchemaArrays {
  // Build a global rename map: prefixedName → bareName with numeric-suffix collision handling.
  const seenBare: Map<string, number> = new Map()

  function assignBare(bare: string): string {
    const count = (seenBare.get(bare) ?? 0) + 1
    seenBare.set(bare, count)
    return count === 1 ? bare : `${bare}_${count}`
  }

  const stripMap: RenameMap = { variables: {}, classifiers: {}, generators: {}, functions: {} }

  for (const { slug, locals } of prefixedLocals) {
    for (const kind of ['variables', 'classifiers', 'generators', 'functions'] as const) {
      for (const bareName of locals[kind]) {
        const prefixed = `${slug}_${bareName}`
        const deduped = assignBare(bareName)
        stripMap[kind][prefixed] = deduped
      }
    }
  }

  const rewritten = rewriteRefs(arrays, stripMap)
  return applyRenameToNames(rewritten, stripMap)
}
