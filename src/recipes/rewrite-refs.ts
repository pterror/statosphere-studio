import type { SchemaArrays } from './types'

export type RenameMap = {
  variables: Record<string, string>
  classifiers: Record<string, string>
  generators: Record<string, string>
  functions: Record<string, string>
}

// Build a regex that matches any of the given names at word boundaries.
// Names are sorted longest-first to prevent shorter prefixes from matching first.
function buildRegex(names: string[]): RegExp | null {
  if (names.length === 0) return null
  const sorted = [...names].sort((a, b) => b.length - a.length)
  const alts = sorted.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`\\b(${alts.join('|')})\\b`, 'g')
}

function rewriteString(s: string, regexes: [RegExp, Record<string, string>][]): string {
  for (const [re, map] of regexes) {
    re.lastIndex = 0
    s = s.replace(re, (_, name) => map[name] ?? name)
  }
  return s
}

function rewriteUpdates(updates: any[], varRegexes: [RegExp, Record<string, string>][], allRegexes: [RegExp, Record<string, string>][]): any[] {
  return updates.map(u => {
    if (!u || typeof u !== 'object') return u
    const clone = { ...u }
    // updates[].variable is a bare identifier — direct map lookup
    if (typeof clone.variable === 'string') {
      const varMap = varRegexes[0]?.[1]
      clone.variable = varMap?.[clone.variable] ?? clone.variable
    }
    if (typeof clone.setTo === 'string') {
      clone.setTo = rewriteString(clone.setTo, allRegexes)
    }
    return clone
  })
}

// Rewrite a comma-delimited dependencies string (bare classifier/generator names).
function rewriteDependencies(deps: string, classMap: Record<string, string>, genMap: Record<string, string>): string {
  return deps.split(',').map(part => {
    const name = part.trim()
    return classMap[name] ?? genMap[name] ?? name
  }).join(', ')
}

// Walk all expression-bearing fields in a single element and apply a visitor.
// visitor receives (value: string) and returns the replacement.
function visitElementStrings(el: any, visitor: (s: string) => string): any {
  if (!el || typeof el !== 'object') return el
  const c = { ...el }
  // Variable expression fields
  for (const field of ['initialValue', 'perTurnUpdate', 'postInputUpdate', 'preResponseUpdate', 'postResponseUpdate', 'body', 'condition', 'modification', 'prompt', 'inputTemplate', 'inputHypothesis'] as const) {
    if (typeof c[field] === 'string') c[field] = visitor(c[field])
  }
  // dependencies string
  if (typeof c.dependencies === 'string') {
    c.dependencies = c.dependencies.split(',').map((p: string) => visitor(p.trim())).join(', ')
  }
  // updates[].variable + updates[].setTo
  if (Array.isArray(c.updates)) {
    c.updates = c.updates.map((u: any) => {
      if (!u || typeof u !== 'object') return u
      const cu = { ...u }
      if (typeof cu.variable === 'string') cu.variable = visitor(cu.variable)
      if (typeof cu.setTo === 'string') cu.setTo = visitor(cu.setTo)
      return cu
    })
  }
  // classifications[].condition + classifications[].updates
  if (Array.isArray(c.classifications)) {
    c.classifications = c.classifications.map((cls: any) => {
      if (!cls || typeof cls !== 'object') return cls
      const cc = { ...cls }
      if (typeof cc.condition === 'string') cc.condition = visitor(cc.condition)
      if (Array.isArray(cc.updates)) {
        cc.updates = cc.updates.map((u: any) => {
          if (!u || typeof u !== 'object') return u
          const cu = { ...u }
          if (typeof cu.variable === 'string') cu.variable = visitor(cu.variable)
          if (typeof cu.setTo === 'string') cu.setTo = visitor(cu.setTo)
          return cu
        })
      }
      return cc
    })
  }
  return c
}

// Visit all expression-bearing strings across an entire SchemaArrays, applying
// the visitor to each string.  Returns a new SchemaArrays.
function visitArraysStrings(arrays: SchemaArrays, visitor: (s: string) => string): SchemaArrays {
  return {
    variables: arrays.variables.map(el => visitElementStrings(el, visitor)),
    classifiers: arrays.classifiers.map(el => visitElementStrings(el, visitor)),
    generators: arrays.generators.map(el => visitElementStrings(el, visitor)),
    contentRules: arrays.contentRules.map(el => visitElementStrings(el, visitor)),
    functions: arrays.functions.map(el => visitElementStrings(el, visitor)),
  }
}

// Rewrite identifiers in all expression-bearing fields using a flat from→to map.
// Identifiers are matched at word boundaries; no kind-awareness.
export function rewriteIdentifiers(arrays: SchemaArrays, fromTo: Record<string, string>): SchemaArrays {
  const entries = Object.entries(fromTo)
  if (entries.length === 0) return arrays
  // Build a single regex matching all source identifiers at word boundaries.
  const sorted = [...entries].sort((a, b) => b[0].length - a[0].length)
  const alts = sorted.map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`\\b(${alts.join('|')})\\b`, 'g')
  const visitor = (s: string): string => {
    re.lastIndex = 0
    return s.replace(re, (_, id) => fromTo[id] ?? id)
  }
  return visitArraysStrings(arrays, visitor)
}

export function rewriteRefs(arrays: SchemaArrays, renameMap: RenameMap): SchemaArrays {
  const result: SchemaArrays = structuredClone(arrays)

  const varEntries = Object.entries(renameMap.variables)
  const classEntries = Object.entries(renameMap.classifiers)
  const genEntries = Object.entries(renameMap.generators)
  const fnEntries = Object.entries(renameMap.functions)

  const varRe = buildRegex(varEntries.map(([k]) => k))
  const classRe = buildRegex(classEntries.map(([k]) => k))
  const genRe = buildRegex(genEntries.map(([k]) => k))
  const fnRe = buildRegex(fnEntries.map(([k]) => k))

  // Regexes paired with their maps, for string-field rewriting
  const allRegexes: [RegExp, Record<string, string>][] = []
  if (varRe) allRegexes.push([varRe, renameMap.variables])
  if (classRe) allRegexes.push([classRe, renameMap.classifiers])
  if (genRe) allRegexes.push([genRe, renameMap.generators])
  if (fnRe) allRegexes.push([fnRe, renameMap.functions])

  const varRegexes: [RegExp, Record<string, string>][] = varRe ? [[varRe, renameMap.variables]] : []

  // Variables: rewrite expression fields (perTurnUpdate, postInputUpdate, preResponseUpdate, postResponseUpdate, initialValue treated as expression)
  result.variables = result.variables.map(v => {
    if (!v || typeof v !== 'object') return v
    const c = { ...v }
    for (const field of ['initialValue', 'perTurnUpdate', 'postInputUpdate', 'preResponseUpdate', 'postResponseUpdate'] as const) {
      if (typeof c[field] === 'string') c[field] = rewriteString(c[field], allRegexes)
    }
    return c
  })

  // Functions: rewrite body
  result.functions = result.functions.map(f => {
    if (!f || typeof f !== 'object') return f
    const c = { ...f }
    if (typeof c.body === 'string') c.body = rewriteString(c.body, allRegexes)
    return c
  })

  // Classifiers
  result.classifiers = result.classifiers.map(cl => {
    if (!cl || typeof cl !== 'object') return cl
    const c = { ...cl }
    if (typeof c.condition === 'string') c.condition = rewriteString(c.condition, allRegexes)
    if (typeof c.dependencies === 'string') c.dependencies = rewriteDependencies(c.dependencies, renameMap.classifiers, renameMap.generators)
    if (typeof c.inputTemplate === 'string') c.inputTemplate = rewriteString(c.inputTemplate, allRegexes)
    if (typeof c.inputHypothesis === 'string') c.inputHypothesis = rewriteString(c.inputHypothesis, allRegexes)
    if (Array.isArray(c.classifications)) {
      c.classifications = c.classifications.map((cls: any) => {
        if (!cls || typeof cls !== 'object') return cls
        const cc = { ...cls }
        if (typeof cc.condition === 'string') cc.condition = rewriteString(cc.condition, allRegexes)
        if (Array.isArray(cc.updates)) cc.updates = rewriteUpdates(cc.updates, varRegexes, allRegexes)
        return cc
      })
    }
    return c
  })

  // Generators
  result.generators = result.generators.map(g => {
    if (!g || typeof g !== 'object') return g
    const c = { ...g }
    if (typeof c.condition === 'string') c.condition = rewriteString(c.condition, allRegexes)
    if (typeof c.dependencies === 'string') c.dependencies = rewriteDependencies(c.dependencies, renameMap.classifiers, renameMap.generators)
    if (typeof c.prompt === 'string') c.prompt = rewriteString(c.prompt, allRegexes)
    if (Array.isArray(c.updates)) c.updates = rewriteUpdates(c.updates, varRegexes, allRegexes)
    return c
  })

  // Content rules
  result.contentRules = result.contentRules.map(cr => {
    if (!cr || typeof cr !== 'object') return cr
    const c = { ...cr }
    if (typeof c.condition === 'string') c.condition = rewriteString(c.condition, allRegexes)
    if (typeof c.modification === 'string') c.modification = rewriteString(c.modification, allRegexes)
    return c
  })

  return result
}
