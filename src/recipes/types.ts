export type SchemaArrays = {
  variables: any[]
  classifiers: any[]
  generators: any[]
  contentRules: any[]
  functions: any[]
}

export type ParamSpec =
  | { kind: 'string'; key: string; label: string; default: string }
  | { kind: 'number'; key: string; label: string; default: number; min?: number; max?: number }
  | { kind: 'enum'; key: string; label: string; default: string; choices: string[] }
  | { kind: 'label-list'; key: string; label: string; default: string[] }

export type ElementType = 'variables' | 'classifiers' | 'generators' | 'contentRules' | 'functions'

// Path to a string field inside SchemaArrays for template substitution.
// e.g. { elementType: 'variables', index: 0, fieldPath: ['initialValue'] }
export interface ParamPath {
  elementType: ElementType
  index: number
  fieldPath: string[]
}

export interface Substitution {
  path: ParamPath
  paramKey: string
}

export interface Locals {
  variables: string[]
  classifiers: string[]
  generators: string[]
  functions: string[]
}

export interface ComposedRef {
  refId: string
  recipeId: string
  defaultName: string
  paramBindings: Record<string, ParamBinding>
}

export type ParamBinding =
  | { kind: 'literal'; value: unknown }
  | { kind: 'parent'; paramKey: string }
  | { kind: 'derived'; expr: string }

export interface RecipeDef {
  id: string
  name: string
  description: string
  tags?: string[]
  params: ParamSpec[]
  locals: Locals
  source:
    | { kind: 'builtin'; materialize: (params: Record<string, unknown>) => SchemaArrays }
    | { kind: 'template'; template: SchemaArrays; substitutions: Substitution[] }
    | { kind: 'composed'; refs: ComposedRef[] }
}

export interface PinnedElement {
  elementType: ElementType
  elementName: string
  override: any
}

export interface RecipeInstance {
  id: string
  recipeId: string
  name: string
  params: Record<string, unknown>
  pinned: PinnedElement[]
  /** Keyed by dot-joined refIdPath; '' = instance root. */
  extrasByPath: Record<string, SchemaArrays>
  childOverrides?: Record<string, Record<string, unknown>>
  instanceRefs?: Record<string, ComposedRef[]>
}

/** Migrate a raw stored instance: if it carries legacy `extras`, lift it into `extrasByPath`. */
export function migrateInstance(raw: any): RecipeInstance {
  if (raw && raw.extras && !raw.extrasByPath) {
    const { extras, ...rest } = raw
    return { ...rest, extrasByPath: { '': extras } } as RecipeInstance
  }
  if (raw && !raw.extrasByPath) {
    const { ...rest } = raw
    return { ...rest, extrasByPath: { '': { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] } } } as RecipeInstance
  }
  return raw as RecipeInstance
}
