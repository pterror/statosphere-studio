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

export interface RecipeDef {
  id: string
  name: string
  description: string
  tags?: string[]
  params: ParamSpec[]
  materialize: (params: Record<string, unknown>) => SchemaArrays
}

export type ElementType = 'variables' | 'classifiers' | 'generators' | 'contentRules' | 'functions'

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
  extras: SchemaArrays
}
