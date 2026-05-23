import { useConfigStore } from '../stores/config'
import { useDraftsStore } from '../stores/drafts'
import { useRecipesStore } from '../stores/recipes'
import { encodeConfig, decodeConfig } from './encode'
import { decodeRecipe } from './recipe-encode'
import { registerRecipe } from '../recipes/registry'
import { migrateInstance } from '../recipes/types'

export type HydrateResult =
  | { kind: 'none' }
  | { kind: 'config' }
  | { kind: 'recipe'; recipeId: string; recipeName: string }

export function hydrateFromLocation(): HydrateResult {
  if (typeof window === 'undefined') return { kind: 'none' }
  const configStore = useConfigStore()
  const draftsStore = useDraftsStore()
  const recipesStore = useRecipesStore()
  const hash = window.location.hash

  const rcpMatch = hash.match(/[#&]rcp=([^&]+)/)
  if (rcpMatch) {
    try {
      const def = decodeRecipe(rcpMatch[1])
      recipesStore.addCustomRecipe(def)
      return { kind: 'recipe', recipeId: def.id, recipeName: def.name }
    } catch {
      // fall through to scratch
    }
  }

  const cfgMatch = hash.match(/[#&]cfg=([^&]+)/)
  if (cfgMatch) {
    try {
      const decoded = decodeConfig(cfgMatch[1])
      if (decoded.sidecar) {
        // v2.5 sidecar payload: restore custom library and instances
        for (const def of decoded.sidecar.customLibrary) {
          if (!recipesStore.customLibrary.find((d) => d.id === def.id)) {
            registerRecipe(def)
            recipesStore.customLibrary.push(def)
          }
        }
        recipesStore.instances.splice(0, recipesStore.instances.length, ...(decoded.sidecar.instances as any[]).map(migrateInstance))
      } else {
        // Legacy plain-config payload: wrap into Custom recipe via replace()
        configStore.replace(decoded.config)
      }
      return { kind: 'config' }
    } catch {
    }
    return { kind: 'none' }
  }

  const scratch = draftsStore.loadScratch()
  if (scratch) {
    configStore.replace(scratch)
  }
  return { kind: 'none' }
}

export function buildShareUrl(): string {
  if (typeof window === 'undefined') return ''
  const configStore = useConfigStore()
  const recipesStore = useRecipesStore()
  const encoded = encodeConfig(configStore.config, {
    instances: recipesStore.instances,
    customLibrary: recipesStore.customLibrary,
  })
  return `${window.location.origin}${window.location.pathname}#cfg=${encoded}`
}

export function buildRecipeShareUrl(encoded: string): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${window.location.pathname}#rcp=${encoded}`
}
