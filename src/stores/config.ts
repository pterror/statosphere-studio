import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// eslint-disable-next-line import/no-cycle
import { useRecipesStore } from './recipes'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import variableSchema from '../../schemas/variable-schema.json'
import functionSchema from '../../schemas/function-schema.json'
import classifierSchema from '../../schemas/classifier-schema.json'
import generatorSchema from '../../schemas/generator-schema.json'
import contentSchema from '../../schemas/content-schema.json'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

const validateVariables = ajv.compile(variableSchema)
const validateFunctions = ajv.compile(functionSchema)
const validateClassifiers = ajv.compile(classifierSchema)
const validateGenerators = ajv.compile(generatorSchema)
const validateContent = ajv.compile(contentSchema)

export interface Variable {
  name: string
  initialValue: string
  perTurnUpdate: string
  postInputUpdate: string
  preResponseUpdate: string
  postResponseUpdate: string
}

export interface FunctionDef {
  name: string
  parameters: string
  body: string
}

export interface ClassificationUpdate {
  variable: string
  setTo: string
}

export interface Classification {
  label: string
  condition: string
  category: string
  threshold: number
  dynamic: boolean
  updates: ClassificationUpdate[]
}

export interface Classifier {
  name: string
  condition: string
  dependencies: string
  inputTemplate: string
  inputHypothesis: string
  responseTemplate: string
  responseHypothesis: string
  useLlm: boolean
  useHistory: boolean
  historyContextSize: number
  classifications: Classification[]
}

export interface GeneratorUpdate {
  variable: string
  setTo: string
}

export interface Generator {
  name: string
  type: 'Text' | 'Image' | 'Image-to-Image'
  phase: 'On Input' | 'On Response'
  lazy: boolean
  condition: string
  dependencies: string
  prompt: string
  updates: GeneratorUpdate[]
  includeHistory?: boolean
  historyContextSize?: number
  minTokens?: string
  maxTokens?: string
  retryCondition?: string
  stoppingStrings?: string
  negativePrompt?: string
  removeBackground?: boolean
  aspectRatio?: string
  sourceImageUrl?: string
  imageToImageType?: string
}

export interface ContentRule {
  category: 'Input' | 'Post Input' | 'Stage Direction' | 'Response' | 'Post Response'
  condition: string
  modification: string
}

export interface ConfigTree {
  variables: Variable[]
  functions: FunctionDef[]
  classifiers: Classifier[]
  generators: Generator[]
  contentRules: ContentRule[]
}

export interface ValidationErrors {
  variables: string[]
  functions: string[]
  classifiers: string[]
  generators: string[]
  contentRules: string[]
}

export const useConfigStore = defineStore('config', () => {
  const errors = ref<ValidationErrors>({
    variables: [],
    functions: [],
    classifiers: [],
    generators: [],
    contentRules: [],
  })

  const dirty = ref(false)

  const config = computed<ConfigTree>(() => {
    const recipesStore = useRecipesStore()
    const m = recipesStore.materialized
    return {
      variables: m.variables,
      functions: m.functions,
      classifiers: m.classifiers,
      generators: m.generators,
      contentRules: m.contentRules,
    }
  })

  function validate() {
    validateVariables(config.value.variables)
    errors.value.variables = (validateVariables.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)

    validateFunctions(config.value.functions)
    errors.value.functions = (validateFunctions.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)

    validateClassifiers(config.value.classifiers)
    errors.value.classifiers = (validateClassifiers.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)

    validateGenerators(config.value.generators)
    errors.value.generators = (validateGenerators.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)

    validateContent(config.value.contentRules)
    errors.value.contentRules = (validateContent.errors ?? []).map((e) => `${e.instancePath} ${e.message}`)
  }

  const json = computed(() => JSON.stringify(config.value, null, 2))

  function loadJson(raw: string): string | null {
    try {
      const parsed = JSON.parse(raw) as ConfigTree
      replace(parsed)
      return null
    } catch (e) {
      return (e as Error).message
    }
  }

  function markDirty() {
    dirty.value = true
    validate()
  }

  function markSaved() {
    dirty.value = false
  }

  function loadTemplate(data: ConfigTree) {
    replace(data)
    dirty.value = true
  }

  function replace(data: ConfigTree) {
    const recipesStore = useRecipesStore()
    const extras = {
      variables: data.variables ?? [],
      functions: data.functions ?? [],
      classifiers: data.classifiers ?? [],
      generators: data.generators ?? [],
      contentRules: data.contentRules ?? [],
    }
    const existingCustom = recipesStore.instances.find((i) => i.recipeId === 'custom')
    if (existingCustom) {
      existingCustom.extras = extras
    } else {
      const id = recipesStore.addInstance('custom')
      const inst = recipesStore.instances.find((i) => i.id === id)
      if (inst) inst.extras = extras
    }
    dirty.value = false
    validate()
  }

  return { config, dirty, errors, json, loadJson, loadTemplate, replace, markDirty, markSaved, validate }
})
