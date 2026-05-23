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
import { interpretTemplate } from '../src/recipes/materialize'

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
