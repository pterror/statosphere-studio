// ── Element update (shared by classifiers and generators) ────────────────────
export interface ElementUpdate {
  variable?: string
  setTo?: string
}

// ── Classification entry inside a classifier ─────────────────────────────────
export interface ClassificationEntry {
  label?: string
  condition?: string
  category?: string
  threshold?: number
  dynamic?: boolean
  updates?: ElementUpdate[]
}

// ── Discriminated element shapes ─────────────────────────────────────────────
export interface VariableElement {
  name: string
  initialValue?: string
  perTurnUpdate?: string
  postInputUpdate?: string
  preResponseUpdate?: string
  postResponseUpdate?: string
}

export interface ClassifierElement {
  name: string
  condition?: string
  dependencies?: string
  inputTemplate?: string
  inputHypothesis?: string
  responseTemplate?: string
  responseHypothesis?: string
  useLlm?: boolean
  useHistory?: boolean
  historyContextSize?: number
  classifications?: ClassificationEntry[]
}

export interface GeneratorElement {
  name: string
  type?: 'Text' | 'Image' | 'Image-to-Image'
  phase?: string
  lazy?: boolean
  condition?: string
  dependencies?: string
  prompt?: string
  updates?: ElementUpdate[]
  // Text-only
  includeHistory?: boolean
  historyContextSize?: number
  minTokens?: number | string
  maxTokens?: number | string
  retryCondition?: string
  stoppingStrings?: string
  // Image-only
  negativePrompt?: string
  removeBackground?: boolean
  aspectRatio?: string
  // Image-to-Image-only
  sourceImageUrl?: string
  imageToImageType?: string
}

export interface ContentRuleElement {
  category?: string
  condition?: string
  modification?: string
}

export interface FunctionElement {
  name: string
  parameters?: string
  body?: string
}

export type AnyElement = VariableElement | ClassifierElement | GeneratorElement | ContentRuleElement | FunctionElement

// SchemaArrays uses AnyElement[] for all arrays so dynamic iteration over ELEMENT_TYPES
// remains ergonomic.  Use the specific element types (VariableElement etc.) at call sites
// where the kind is statically known.
export type SchemaArrays = {
  variables: AnyElement[]
  classifiers: AnyElement[]
  generators: AnyElement[]
  contentRules: AnyElement[]
  functions: AnyElement[]
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
  override: AnyElement
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
