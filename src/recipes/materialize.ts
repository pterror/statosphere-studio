import type { RecipeInstance, RecipeDef, SchemaArrays, ElementType, Substitution, Locals } from './types'
import type { RenameMap } from './rewrite-refs'
import { rewriteRefs } from './rewrite-refs'
import { getRecipe } from './registry'
import { resolveChildParams } from './compose'

// Lowercase, replace non-alphanumeric runs with _, trim leading/trailing _.
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

// Compute the slug and locals for a single instance.
// Slug uniqueness is NOT guaranteed here (no global de-dup); use only for
// single-instance look-ups such as the move-element rebind pass.
export function instanceLocals(inst: RecipeInstance): { slug: string; locals: Locals } {
  const recipe = getRecipe(inst.recipeId)
  const slugBase = slugify(inst.name) || slugify(inst.recipeId) || 'instance'
  const slug = slugBase // single-instance view — no count suffix
  if (!recipe) return { slug, locals: { variables: [], classifiers: [], generators: [], functions: [] } }
  const locals: Locals = recipe.source.kind === 'composed'
    ? collectComposedLocals(recipe, inst.params, slug)
    : localsFromTemplate(
        recipe.source.kind === 'builtin'
          ? recipe.source.materialize(inst.params)
          : interpretTemplate(recipe.source.template, recipe.source.substitutions, inst.params),
      )
  return { slug, locals }
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

// Collect all locals from a composed recipe by recursing into children.
// Used for extras rewriting and stripPrefix bookkeeping.
function collectComposedLocals(def: RecipeDef, params: Record<string, unknown>, slugPrefix: string): Locals {
  if (def.source.kind !== 'composed') {
    // For leaf atoms, derive locals from actual emitted output.
    if (def.source.kind === 'builtin') return localsFromTemplate(def.source.materialize(params))
    return localsFromTemplate(interpretTemplate(def.source.template, def.source.substitutions, params))
  }
  const result: Locals = { variables: [], classifiers: [], generators: [], functions: [] }
  for (const ref of def.source.refs) {
    const childDef = getRecipe(ref.recipeId)
    if (!childDef) continue
    const childSlugPrefix = slugPrefix + '_' + ref.refId
    const childParams = resolveChildParams(ref, params, undefined)
    const childLocals = collectComposedLocals(childDef, childParams, childSlugPrefix)
    for (const k of ['variables', 'classifiers', 'generators', 'functions'] as const) {
      for (const n of childLocals[k]) result[k].push(`${childSlugPrefix}_${n}`.slice(slugPrefix.length + 1))
    }
  }
  return result
}

function mergeArrays(acc: SchemaArrays, child: SchemaArrays): void {
  for (const et of ELEMENT_TYPES) {
    for (const el of child[et]) acc[et].push(el)
  }
}

function emptyArrays(): SchemaArrays {
  return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
}

interface MaterializeCtx {
  slugPrefix: string
  refIdPath: string[]
  instance: RecipeInstance
}

function materializeRecipe(
  def: RecipeDef,
  params: Record<string, unknown>,
  ctx: MaterializeCtx,
): SchemaArrays {
  if (def.source.kind === 'composed') {
    const parentRefIdPathKey = ctx.refIdPath.join('.')
    const instanceRefsAtLevel = ctx.instance.instanceRefs?.[parentRefIdPathKey] ?? []
    const allRefs = [...def.source.refs, ...instanceRefsAtLevel]

    const crossRefMap: RenameMap = { variables: {}, classifiers: {}, generators: {}, functions: {} }
    for (const ref of allRefs) {
      const childDef = getRecipe(ref.recipeId)
      if (!childDef) continue
      const childSlugPrefix = ctx.slugPrefix + '_' + ref.refId
      const refIdPath = [...ctx.refIdPath, ref.refId]
      const childOverrides = ctx.instance.childOverrides?.[refIdPath.join('.')]
      const childParams = resolveChildParams(ref, params, childOverrides)
      const childLocals = getActualLocals(childDef, childParams)
      for (const k of ['variables', 'classifiers', 'generators', 'functions'] as const) {
        for (const n of childLocals[k]) {
          crossRefMap[k][n] = `${childSlugPrefix}_${n}`
        }
      }
    }

    const acc = emptyArrays()
    for (const ref of allRefs) {
      const refIdPath = [...ctx.refIdPath, ref.refId]
      const childOverrides = ctx.instance.childOverrides?.[refIdPath.join('.')]
      const childParams = resolveChildParams(ref, params, childOverrides)
      const childDef = getRecipe(ref.recipeId)
      if (!childDef) continue
      const childSlugPrefix = ctx.slugPrefix + '_' + ref.refId
      const childArrays = materializeRecipe(childDef, childParams, {
        slugPrefix: childSlugPrefix,
        refIdPath,
        instance: ctx.instance,
      })
      mergeArrays(acc, childArrays)
    }
    return rewriteRefs(acc, crossRefMap)
  }

  let bareArrays: SchemaArrays
  if (def.source.kind === 'builtin') {
    bareArrays = def.source.materialize(params)
  } else {
    bareArrays = interpretTemplate(def.source.template, def.source.substitutions, params)
  }

  // Derive locals from actual emitted output so param-driven names are captured.
  const locals: Locals = localsFromTemplate(bareArrays)
  const renameMap = buildRenameMap(locals, ctx.slugPrefix)
  const rewritten = rewriteRefs(bareArrays, renameMap)
  return applyRenameToNames(rewritten, renameMap)
}

// Derive the locals that a recipe will actually emit given resolved params.
// For leaf atoms, materializes the bare output and reads names.
// For composed recipes, recurses using an empty slug prefix (names only, not final prefixes).
function getActualLocals(def: RecipeDef, params: Record<string, unknown>): Locals {
  if (def.source.kind === 'composed') {
    // For composed, collect all children's actual locals with their refId prefix.
    const result: Locals = { variables: [], classifiers: [], generators: [], functions: [] }
    for (const ref of def.source.refs) {
      const childDef = getRecipe(ref.recipeId)
      if (!childDef) continue
      const childParams = resolveChildParams(ref, params, undefined)
      const childLocals = getActualLocals(childDef, childParams)
      for (const k of ['variables', 'classifiers', 'generators', 'functions'] as const) {
        for (const n of childLocals[k]) result[k].push(`${ref.refId}_${n}`)
      }
    }
    return result
  }
  if (def.source.kind === 'builtin') {
    return localsFromTemplate(def.source.materialize(params))
  }
  return localsFromTemplate(interpretTemplate(def.source.template, def.source.substitutions, params))
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

    const slugBase = slugify(inst.name) || slugify(inst.recipeId) || 'instance'
    const slug = assignSlug(slugBase)

    const prefixed = materializeRecipe(recipe, inst.params, {
      slugPrefix: slug,
      refIdPath: [],
      instance: inst,
    })

    // Determine locals for stripPrefix bookkeeping.
    const locals: Locals = recipe.source.kind === 'composed'
      ? collectComposedLocals(recipe, inst.params, slug)
      : localsFromTemplate(prefixed)

    // Build pinned map keyed by prefixed name.
    const pinnedMap = new Map<string, any>()
    for (const p of inst.pinned) {
      pinnedMap.set(`${p.elementType}:${p.elementName}`, p.override)
    }

    // Build renameMap for extras rewriting (only needed for non-composed leaf locals).
    const renameMap = buildRenameMap(locals, slug)

    for (const et of ELEMENT_TYPES) {
      for (const el of prefixed[et]) {
        const prefixedName = el?.name ?? ''
        const pinned = pinnedMap.get(`${et}:${prefixedName}`)
        const resolved = pinned !== undefined ? pinned : el
        result[et].push(resolved)
      }
      // Merge extras from all paths in extrasByPath.
      for (const [_path, pathExtras] of Object.entries(inst.extrasByPath ?? {})) {
        const rewrittenExtras = rewriteRefs(pathExtras, renameMap)
        for (const el of rewrittenExtras[et]) {
          result[et].push(el)
        }
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
