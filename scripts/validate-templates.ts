import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')
const TEMPLATES_DIR = join(ROOT, 'templates')
const SCHEMAS_DIR = join(ROOT, 'schemas')

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const variableSchema = loadJson(join(SCHEMAS_DIR, 'variable-schema.json'))
const functionSchema = loadJson(join(SCHEMAS_DIR, 'function-schema.json'))
const classifierSchema = loadJson(join(SCHEMAS_DIR, 'classifier-schema.json'))
const generatorSchema = loadJson(join(SCHEMAS_DIR, 'generator-schema.json'))
const contentSchema = loadJson(join(SCHEMAS_DIR, 'content-schema.json'))

const validateVariables = ajv.compile(variableSchema)
const validateFunctions = ajv.compile(functionSchema)
const validateClassifiers = ajv.compile(classifierSchema)
const validateGenerators = ajv.compile(generatorSchema)
const validateContent = ajv.compile(contentSchema)

const slugs = readdirSync(TEMPLATES_DIR)
  .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
  .map((f) => f.replace('.json', ''))

let allPassed = true

for (const slug of slugs) {
  const path = join(TEMPLATES_DIR, `${slug}.json`)
  const tpl = loadJson(path)
  const errors: string[] = []

  const sections: [string, ReturnType<typeof ajv.compile>, unknown][] = [
    ['variables', validateVariables, tpl.variables ?? []],
    ['functions', validateFunctions, tpl.functions ?? []],
    ['classifiers', validateClassifiers, tpl.classifiers ?? []],
    ['generators', validateGenerators, tpl.generators ?? []],
    ['contentRules', validateContent, tpl.contentRules ?? []],
  ]

  for (const [section, validate, data] of sections) {
    validate(data)
    for (const e of validate.errors ?? []) {
      errors.push(`  ${section}${e.instancePath} ${e.message}`)
    }
  }

  if (errors.length > 0) {
    console.error(`FAIL ${slug}`)
    for (const e of errors) console.error(e)
    allPassed = false
  } else {
    console.log(`ok   ${slug}`)
  }
}

if (!allPassed) {
  process.exit(1)
}
