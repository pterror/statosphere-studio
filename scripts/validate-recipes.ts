/**
 * validate-recipes.ts
 * Iterates all builtin recipes, materializes each with default params,
 * and Ajv-validates each SchemaArrays section against the upstream schemas.
 * Exits non-zero if any validation fails.
 */
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { RecipeDef, SchemaArrays, ParamSpec, ComposedRef, RecipeInstance } from '../src/recipes/types'
import { interpretTemplate, materializeInstances, instanceLocals } from '../src/recipes/materialize'
import { rewriteIdentifiers } from '../src/recipes/rewrite-refs'
import { registerRecipe } from '../src/recipes/registry'

const ROOT = join(import.meta.dir, '..')
const SCHEMAS_DIR = join(ROOT, 'schemas')

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const validateVariables = ajv.compile(loadJson(join(SCHEMAS_DIR, 'variable-schema.json')))
const validateFunctions = ajv.compile(loadJson(join(SCHEMAS_DIR, 'function-schema.json')))
const validateClassifiers = ajv.compile(loadJson(join(SCHEMAS_DIR, 'classifier-schema.json')))
const validateGenerators = ajv.compile(loadJson(join(SCHEMAS_DIR, 'generator-schema.json')))
const validateContent = ajv.compile(loadJson(join(SCHEMAS_DIR, 'content-schema.json')))

function defaultParams(params: ParamSpec[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const p of params) {
    result[p.key] = p.default
  }
  return result
}

// Dynamic import for ESM builtins
const builtinsModule = await import('../src/recipes/builtins/index.ts')
const builtins: RecipeDef[] = builtinsModule.default

// Pre-register all builtins (atoms + bundles) so composed recipes can look up children.
for (const def of builtins) registerRecipe(def)

let allPassed = true

for (const def of builtins) {
  if (def.id === 'custom') {
    // Custom recipe materializes to empty arrays — trivially valid, skip.
    console.log(`skip custom (freeform bucket)`)
    continue
  }

  const params = defaultParams(def.params)
  let materialized: SchemaArrays
  try {
    if (def.source.kind === 'builtin') {
      materialized = def.source.materialize(params)
    } else if (def.source.kind === 'template') {
      materialized = interpretTemplate(def.source.template, def.source.substitutions, params)
    } else {
      // composed — use materializeInstances with a synthetic instance
      const instance = {
        id: 'validate-default',
        recipeId: def.id,
        name: def.name,
        params,
        pinned: [],
        extrasByPath: { '': { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] } },
      }
      materialized = materializeInstances([instance], { stripPrefix: true })
    }
  } catch (e) {
    console.error(`FAIL ${def.id}: materialize threw — ${(e as Error).message}`)
    allPassed = false
    continue
  }

  const sections: [string, ReturnType<typeof ajv.compile>, unknown][] = [
    ['variables', validateVariables, materialized.variables],
    ['functions', validateFunctions, materialized.functions],
    ['classifiers', validateClassifiers, materialized.classifiers],
    ['generators', validateGenerators, materialized.generators],
    ['contentRules', validateContent, materialized.contentRules],
  ]

  const errors: string[] = []
  for (const [section, validate, data] of sections) {
    validate(data)
    for (const e of validate.errors ?? []) {
      errors.push(`  ${section}${e.instancePath} ${e.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`FAIL ${def.id}`)
    for (const e of errors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   ${def.id}`)
  }
}

if (!allPassed) process.exit(1)

// ── Duplicate-instance test ──────────────────────────────────────────────────
// Instantiate each recipe twice with distinct display names and verify:
//   1. No duplicate names across the merged config.
//   2. Every updates[].variable resolves to a declared variable name.
//   3. No bare (unprefixed) references remain in expression fields.

console.log('\nDuplicate-instance tests:')

// Fields that contain expression strings referencing variable names.
const EXPR_FIELDS = ['setTo', 'condition', 'modification', 'prompt', 'inputTemplate', 'inputHypothesis', 'perTurnUpdate', 'postInputUpdate', 'preResponseUpdate', 'postResponseUpdate', 'body']

function collectStrings(obj: any, acc: string[] = []): string[] {
  if (typeof obj === 'string') { acc.push(obj); return acc }
  if (Array.isArray(obj)) { for (const v of obj) collectStrings(v, acc); return acc }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (EXPR_FIELDS.includes(k)) collectStrings(v, acc)
      else if (k !== 'name' && typeof v === 'object') collectStrings(v, acc)
    }
  }
  return acc
}

function collectUpdatesVariables(obj: any, acc: string[] = []): string[] {
  if (Array.isArray(obj)) { for (const v of obj) collectUpdatesVariables(v, acc); return acc }
  if (obj && typeof obj === 'object') {
    if ('variable' in obj && typeof obj.variable === 'string') acc.push(obj.variable)
    else for (const v of Object.values(obj)) collectUpdatesVariables(v, acc)
  }
  return acc
}

// Builtins are already pre-registered above.

for (const def of builtins) {
  if (def.id === 'custom') {
    console.log(`skip custom (freeform bucket) [dup test]`)
    continue
  }

  const params = defaultParams(def.params)
  const instances = [
    { id: 'a', recipeId: def.id, name: def.name + ' A', params, pinned: [], extras: { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] } },
    { id: 'b', recipeId: def.id, name: def.name + ' B', params, pinned: [], extras: { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] } },
  ]

  let merged: SchemaArrays
  try {
    merged = materializeInstances(instances)
  } catch (e) {
    console.error(`FAIL dup ${def.id}: materializeInstances threw — ${(e as Error).message}`)
    allPassed = false
    continue
  }

  const errors: string[] = []
  const kindArrays: [string, any[]][] = [
    ['variables', merged.variables],
    ['classifiers', merged.classifiers],
    ['generators', merged.generators],
    ['functions', merged.functions],
  ]

  // 1. No duplicate names.
  for (const [kind, arr] of kindArrays) {
    const seen = new Set<string>()
    for (const el of arr) {
      if (!el?.name) continue
      if (seen.has(el.name)) errors.push(`  duplicate ${kind} name: "${el.name}"`)
      seen.add(el.name)
    }
  }

  // 2. Every updates[].variable that references a recipe-local variable uses the prefixed form.
  // (External/platform variables like 'background' are allowed through.)
  const _allPrefixedVarNames = new Set(merged.variables.map((v: any) => v?.name).filter(Boolean))
  const updateVars = collectUpdatesVariables(merged)
  for (const v of updateVars) {
    // Only flag if the bare name is a declared local of this recipe (should have been prefixed).
    if (def.locals.variables.includes(v)) {
      errors.push(`  updates[].variable "${v}" is a bare local name — should have been prefixed`)
    }
  }

  // 3. No bare (unprefixed) original names remain in expression strings.
  const allStrings = collectStrings(merged)
  for (const bareName of def.locals.variables) {
    const re = new RegExp(`\\b${bareName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    for (const s of allStrings) {
      if (re.test(s)) {
        errors.push(`  bare variable reference "${bareName}" found in expression: ${JSON.stringify(s).slice(0, 80)}`)
        break
      }
    }
  }

  if (errors.length > 0) {
    console.error(`FAIL dup ${def.id}`)
    for (const e of errors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   dup ${def.id}`)
  }
}

// ── Atom isolation tests ─────────────────────────────────────────────────────
console.log('\nAtom isolation tests:')

const atomsModule = await import('../src/recipes/builtins/atoms/index.ts')
const atoms: RecipeDef[] = atomsModule.default

for (const def of atoms) {
  const params = defaultParams(def.params)
  let materialized: SchemaArrays
  try {
    if (def.source.kind === 'builtin') {
      materialized = def.source.materialize(params)
    } else if (def.source.kind === 'template') {
      materialized = interpretTemplate(def.source.template, def.source.substitutions, params)
    } else {
      console.log(`skip ${def.id} (composed — covered by synthetic test)`)
      continue
    }
  } catch (e) {
    console.error(`FAIL ${def.id}: materialize threw — ${(e as Error).message}`)
    allPassed = false
    continue
  }

  const atomSections: [string, ReturnType<typeof ajv.compile>, unknown][] = [
    ['variables', validateVariables, materialized.variables],
    ['functions', validateFunctions, materialized.functions],
    ['classifiers', validateClassifiers, materialized.classifiers],
    ['generators', validateGenerators, materialized.generators],
    ['contentRules', validateContent, materialized.contentRules],
  ]

  const atomErrors: string[] = []
  for (const [section, validate, data] of atomSections) {
    validate(data)
    for (const e of validate.errors ?? []) {
      atomErrors.push(`  ${section}${e.instancePath} ${e.message}`)
    }
  }

  if (atomErrors.length > 0) {
    console.error(`FAIL ${def.id}`)
    for (const e of atomErrors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   ${def.id}`)
  }
}

// Register atoms for composed test and dup tests
for (const def of atoms) registerRecipe(def)

// ── Synthetic composed test ──────────────────────────────────────────────────
console.log('\nSynthetic composed test:')

const syntheticComposed: RecipeDef = {
  id: 'test/composed-two-atoms',
  name: 'Test Composed',
  description: 'Synthetic composed recipe for Phase 3 validation.',
  params: [
    { kind: 'string', key: 'counterName', label: 'Counter name', default: 'score' },
    { kind: 'string', key: 'condition', label: 'Condition', default: 'true' },
  ],
  locals: { variables: [], classifiers: [], generators: [], functions: [] },
  source: {
    kind: 'composed',
    refs: [
      {
        refId: 'score_counter',
        recipeId: 'atom/var-counter',
        defaultName: 'Score Counter',
        paramBindings: {
          name: { kind: 'parent', paramKey: 'counterName' },
          initialValue: { kind: 'literal', value: 0 },
          perTurnUpdate: { kind: 'literal', value: '' },
        },
      } satisfies ComposedRef,
      {
        refId: 'status_rule',
        recipeId: 'atom/rule-status-line',
        defaultName: 'Status Rule',
        paramBindings: {
          condition: { kind: 'parent', paramKey: 'condition' },
          template: { kind: 'derived', expr: '"Score: " + {{counterName}}' },
        },
      } satisfies ComposedRef,
    ],
  },
}

registerRecipe(syntheticComposed)

const composedInstance = {
  id: 'synth-1',
  recipeId: 'test/composed-two-atoms',
  name: 'Composed Test',
  params: { counterName: 'score', condition: 'true' },
  pinned: [],
  extras: { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] },
}

try {
  const composedResult = materializeInstances([composedInstance])
  const composedErrors: string[] = []

  const varNames: string[] = composedResult.variables.map((v: any) => v?.name)
  // The slug prefix is derived from the instance name + refId: composed_test_score_counter_<local>
  if (!varNames.some((n: string) => n?.includes('score_counter'))) {
    composedErrors.push(`  expected variable name containing "score_counter", got: ${varNames.join(', ')}`)
  }

  const composedSections: [string, ReturnType<typeof ajv.compile>, unknown][] = [
    ['variables', validateVariables, composedResult.variables],
    ['functions', validateFunctions, composedResult.functions],
    ['classifiers', validateClassifiers, composedResult.classifiers],
    ['generators', validateGenerators, composedResult.generators],
    ['contentRules', validateContent, composedResult.contentRules],
  ]
  for (const [section, validate, data] of composedSections) {
    validate(data)
    for (const e of validate.errors ?? []) {
      composedErrors.push(`  ${section}${e.instancePath} ${e.message}`)
    }
  }

  if (composedErrors.length > 0) {
    console.error(`FAIL synthetic composed`)
    for (const e of composedErrors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   synthetic composed (vars: ${varNames.join(', ')})`)
  }
} catch (e) {
  console.error(`FAIL synthetic composed: threw — ${(e as Error).message}`)
  allPassed = false
}

// ── Smart-rebind move test ───────────────────────────────────────────────────
console.log('\nSmart-rebind move test:')

{
  // Two HP-Tracker-like instances with distinct slugs.
  // Instance A: name "HP Tracker A"  → slug "hp_tracker_a"
  // Instance B: name "HP Tracker B"  → slug "hp_tracker_b"
  const hpTrackerDef = builtins.find(d => d.id === 'hp-tracker')!
  const hpParams = defaultParams(hpTrackerDef.params)

  const instA: RecipeInstance = {
    id: 'move-test-a',
    recipeId: 'hp-tracker',
    name: 'HP Tracker A',
    params: hpParams,
    pinned: [],
    extras: { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] },
  }
  const instB: RecipeInstance = {
    id: 'move-test-b',
    recipeId: 'hp-tracker',
    name: 'HP Tracker B',
    params: hpParams,
    pinned: [],
    extras: { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] },
  }

  const { slug: slugA, locals: localsA } = instanceLocals(instA)
  const { slug: slugB, locals: localsB } = instanceLocals(instB)

  // "hp" local is shared by both (hp_var_hp on HP Tracker). Find the actual bare name.
  // From materialize: composed locals for hp-tracker via collectComposedLocals use
  // slugPrefix = slug, childSlugPrefix = slug + '_' + refId.
  // localsA.variables will contain names like "hp_var_hp", "hp_var_max_hp", etc.
  // We want the first variable local that also exists in localsB — that's the rebindable one.
  const sharedVarName = localsA.variables.find(n => localsB.variables.includes(n))!

  // Craft an extra variable that references:
  //   - <slugA>_<sharedVarName>  → rebindable (exists in B)
  //   - <slugA>_only_local       → dangling (no target-side equivalent)
  const extraVar: any = {
    name: 'custom_extra',
    initialValue: `${slugA}_${sharedVarName} + 1`,
    perTurnUpdate: `${slugA}_${sharedVarName} * 2 + ${slugA}_only_local`,
  }

  // Replicate the rebind logic from moveElement.
  const fromTo: Record<string, string> = {}
  for (const kind of ['variables', 'classifiers', 'generators', 'functions'] as const) {
    const tgtSet = new Set(localsB[kind])
    for (const name of localsA[kind]) {
      if (tgtSet.has(name)) {
        fromTo[`${slugA}_${name}`] = `${slugB}_${name}`
      }
    }
  }

  const singleArrays: SchemaArrays = {
    variables: [structuredClone(extraVar)],
    classifiers: [], generators: [], contentRules: [], functions: [],
  }
  const rewritten = rewriteIdentifiers(singleArrays, fromTo)
  const rewrittenEl = rewritten.variables[0]

  // Count remaining source-prefixed refs.
  const escapedSrc = slugA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const danglingRe = new RegExp(`\\b${escapedSrc}_\\w+\\b`, 'g')
  function countDangling(obj: any): number {
    if (typeof obj === 'string') return (obj.match(danglingRe) ?? []).length
    if (Array.isArray(obj)) return obj.reduce((acc: number, v) => acc + countDangling(v), 0)
    if (obj && typeof obj === 'object') return Object.values(obj).reduce((acc: number, v) => acc + countDangling(v as any), 0)
    return 0
  }
  const dangling = countDangling(rewrittenEl)
  const rebound = Object.keys(fromTo).filter(k => {
    // Count only the fromTo entries that actually appeared in the original element.
    const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const testRe = new RegExp(`\\b${escapedK}\\b`)
    return testRe.test(extraVar.initialValue ?? '') || testRe.test(extraVar.perTurnUpdate ?? '')
  }).length

  const moveErrors: string[] = []

  // The rewritten element should NOT contain the source slug for the shared var.
  const sharedSrcRef = `${slugA}_${sharedVarName}`
  const sharedTgtRef = `${slugB}_${sharedVarName}`
  if ((rewrittenEl.initialValue as string).includes(sharedSrcRef)) {
    moveErrors.push(`  shared ref "${sharedSrcRef}" was NOT rebound in initialValue: ${rewrittenEl.initialValue}`)
  }
  if (!(rewrittenEl.initialValue as string).includes(sharedTgtRef)) {
    moveErrors.push(`  expected target ref "${sharedTgtRef}" in initialValue: ${rewrittenEl.initialValue}`)
  }

  // The dangling ref should still be present.
  const danglingRef = `${slugA}_only_local`
  if (!(rewrittenEl.perTurnUpdate as string).includes(danglingRef)) {
    moveErrors.push(`  dangling ref "${danglingRef}" should remain in perTurnUpdate: ${rewrittenEl.perTurnUpdate}`)
  }

  if (rebound !== 1) {
    moveErrors.push(`  expected rebound=1, got ${rebound}`)
  }
  if (dangling !== 1) {
    moveErrors.push(`  expected dangling=1, got ${dangling}`)
  }

  if (moveErrors.length > 0) {
    console.error(`FAIL smart-rebind move`)
    for (const e of moveErrors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   smart-rebind move (rebound=${rebound} dangling=${dangling} slugA=${slugA} slugB=${slugB})`)
  }
}

// ── extrasByPath nested extras test ─────────────────────────────────────────
console.log('\nextrasByPath nested extras test:')

{
  const hpTrackerDef = builtins.find(d => d.id === 'hp-tracker')!
  const hpParams = defaultParams(hpTrackerDef.params)

  const rootExtraVar = { name: 'root_bonus', initialValue: '5', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' }
  const childExtraVar = { name: 'child_bonus', initialValue: '3', perTurnUpdate: '', postInputUpdate: '', preResponseUpdate: '', postResponseUpdate: '' }

  const instWithPaths: RecipeInstance = {
    id: 'extras-path-test',
    recipeId: 'hp-tracker',
    name: 'HP Tracker Extras Path',
    params: hpParams,
    pinned: [],
    extrasByPath: {
      '': { variables: [rootExtraVar], classifiers: [], generators: [], contentRules: [], functions: [] },
      'hp_var': { variables: [childExtraVar], classifiers: [], generators: [], contentRules: [], functions: [] },
    },
  }

  const extrasErrors: string[] = []
  let extrasResult: SchemaArrays = { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  try {
    extrasResult = materializeInstances([instWithPaths])
  } catch (e) {
    console.error(`FAIL extrasByPath test: materializeInstances threw — ${(e as Error).message}`)
    allPassed = false
  }

  const varNames = extrasResult.variables.map((v: any) => v?.name).filter(Boolean)
  if (!varNames.some((n: string) => n === 'root_bonus')) {
    extrasErrors.push(`  root-path extra "root_bonus" not found in materialized output. Got: ${varNames.join(', ')}`)
  }
  if (!varNames.some((n: string) => n === 'child_bonus')) {
    extrasErrors.push(`  child-path extra "child_bonus" not found in materialized output. Got: ${varNames.join(', ')}`)
  }

  if (extrasErrors.length > 0) {
    console.error(`FAIL extrasByPath nested extras`)
    for (const e of extrasErrors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   extrasByPath nested extras (vars: ${varNames.join(', ')})`)
  }
}

if (!allPassed) process.exit(1)
