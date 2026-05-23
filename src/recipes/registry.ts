import type { RecipeDef } from './types'
import builtins from './builtins/index'

const registry = new Map<string, RecipeDef>(builtins.map((r) => [r.id, r]))

export function getRecipe(id: string): RecipeDef | undefined {
  return registry.get(id)
}

export function listRecipes(): RecipeDef[] {
  return Array.from(registry.values())
}

export function registerRecipe(def: RecipeDef): void {
  registry.set(def.id, def)
}
