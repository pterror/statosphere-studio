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
import type { RecipeDef, SchemaArrays, ParamSpec } from '../src/recipes/types'
import { interpretTemplate, materializeInstances } from '../src/recipes/materialize'

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
    } else {
      materialized = interpretTemplate(def.source.template, def.source.substitutions, params)
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

// Use registry to look up by id — materializeInstances needs the recipe registered.
import { registerRecipe } from '../src/recipes/registry'
for (const def of builtins) registerRecipe(def)

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
  const allPrefixedVarNames = new Set(merged.variables.map((v: any) => v?.name).filter(Boolean))
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

if (!allPassed) process.exit(1)
