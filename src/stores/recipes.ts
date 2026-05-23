import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { RecipeInstance, RecipeDef, ElementType, SchemaArrays } from '../recipes/types'
import { materializeInstances, localsFromTemplate } from '../recipes/materialize'
import { getRecipe, registerRecipe, unregisterRecipe } from '../recipes/registry'
import { useSettingsStore } from './settings'

const STORAGE_KEY = 'statosphere-studio-recipes-v2'
const LIBRARY_KEY = 'statosphere-studio-custom-library-v2'

function emptyArrays(): SchemaArrays {
  return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
}

function loadFromStorage(): RecipeInstance[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecipeInstance[]
  } catch {
    return []
  }
}

function saveToStorage(instances: RecipeInstance[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(instances))
}

function loadLibrary(): RecipeDef[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) return []
    const defs = JSON.parse(raw) as RecipeDef[]
    // Derive locals on read for stored template recipes that predate the locals field.
    return defs.map(def => {
      if (def.locals) return def
      if (def.source.kind === 'template') {
        return { ...def, locals: localsFromTemplate(def.source.template) }
      }
      return { ...def, locals: { variables: [], classifiers: [], generators: [], functions: [] } }
    })
  } catch {
    return []
  }
}

function saveLibrary(defs: RecipeDef[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(defs))
}

export const useRecipesStore = defineStore('recipes', () => {
  const instances = ref<RecipeInstance[]>(loadFromStorage())
  const customLibrary = ref<RecipeDef[]>(loadLibrary())
  const focusedInstanceId = ref<string | null>(null)

  // Register all persisted custom recipes into the registry on startup.
  for (const def of customLibrary.value) {
    registerRecipe(def)
  }

  const settingsStore = useSettingsStore()
  const materialized = computed<SchemaArrays>(() =>
    materializeInstances(instances.value, { stripPrefix: settingsStore.stripPrefixOnExport }),
  )

  function persist() {
    saveToStorage(instances.value)
  }

  function addInstance(recipeId: string, atIndex?: number): string {
    const recipe = getRecipe(recipeId)
    if (!recipe) return ''
    const defaults: Record<string, unknown> = {}
    for (const p of recipe.params) {
      defaults[p.key] = p.default
    }
    const id = crypto.randomUUID()
    const inst: RecipeInstance = {
      id,
      recipeId,
      name: recipe.name,
      params: defaults,
      pinned: [],
      extras: emptyArrays(),
    }
    if (atIndex !== undefined && atIndex >= 0 && atIndex <= instances.value.length) {
      instances.value.splice(atIndex, 0, inst)
    } else {
      instances.value.push(inst)
    }
    persist()
    return id
  }

  function reorderInstance(instanceId: string, newIndex: number): void {
    const idx = instances.value.findIndex((i) => i.id === instanceId)
    if (idx === -1) return
    const [inst] = instances.value.splice(idx, 1)
    const clampedIndex = Math.max(0, Math.min(newIndex, instances.value.length))
    instances.value.splice(clampedIndex, 0, inst)
    persist()
  }

  function addComposedRefToInstance(instanceId: string, refIdPath: string, ref: import('../recipes/types').ComposedRef): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    if (!inst.instanceRefs) inst.instanceRefs = {}
    if (!inst.instanceRefs[refIdPath]) inst.instanceRefs[refIdPath] = []
    inst.instanceRefs[refIdPath].push(ref)
    persist()
  }

  function moveElement(
    sourceInstanceId: string,
    targetInstanceId: string,
    elementType: ElementType,
    elementName: string,
  ): void {
    if (sourceInstanceId === targetInstanceId) return
    const srcInst = instances.value.find((i) => i.id === sourceInstanceId)
    const tgtInst = instances.value.find((i) => i.id === targetInstanceId)
    if (!srcInst || !tgtInst) return

    // Determine if element is pinned or in extras
    const pinnedIdx = srcInst.pinned.findIndex(
      (p) => p.elementType === elementType && p.elementName === elementName,
    )
    let elementData: any = null

    if (pinnedIdx !== -1) {
      elementData = JSON.parse(JSON.stringify(srcInst.pinned[pinnedIdx].override))
      srcInst.pinned.splice(pinnedIdx, 1)
    } else {
      const extrasIdx = srcInst.extras[elementType].findIndex(
        (el: any) => (el?.name ?? el?.category) === elementName,
      )
      if (extrasIdx !== -1) {
        elementData = JSON.parse(JSON.stringify(srcInst.extras[elementType][extrasIdx]))
        srcInst.extras[elementType].splice(extrasIdx, 1)
      } else {
        // Materialized-from-recipe but not pinned — pin first, then move
        const recipe = getRecipe(srcInst.recipeId)
        if (!recipe) return
        const mat =
          recipe.source.kind === 'builtin'
            ? recipe.source.materialize(srcInst.params)
            : materializeInstances([srcInst])
        const el = mat[elementType].find((e: any) => e?.name === elementName)
        if (!el) return
        elementData = JSON.parse(JSON.stringify(el))
      }
    }

    if (elementData === null) return
    tgtInst.extras[elementType].push(elementData)
    persist()
  }

  function removeInstance(id: string): void {
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) {
      instances.value.splice(idx, 1)
      if (focusedInstanceId.value === id) focusedInstanceId.value = null
      persist()
    }
  }

  function renameInstance(id: string, name: string): void {
    const inst = instances.value.find((i) => i.id === id)
    if (inst) {
      inst.name = name
      persist()
    }
  }

  function duplicateInstance(id: string): string {
    const inst = instances.value.find((i) => i.id === id)
    if (!inst) return ''
    const newId = crypto.randomUUID()
    instances.value.push({
      ...JSON.parse(JSON.stringify(inst)),
      id: newId,
      name: inst.name + ' copy',
    })
    persist()
    return newId
  }

  function updateParams(id: string, params: Record<string, unknown>): void {
    const inst = instances.value.find((i) => i.id === id)
    if (inst) {
      inst.params = { ...inst.params, ...params }
      persist()
    }
  }

  function pinElement(instanceId: string, elementType: ElementType, elementName: string): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const recipe = getRecipe(inst.recipeId)
    if (!recipe) return
    const mat =
      recipe.source.kind === 'builtin'
        ? recipe.source.materialize(inst.params)
        : materializeInstances([inst])
    const el = mat[elementType].find((e: any) => e?.name === elementName)
    if (!el) return
    if (!inst.pinned.find((p) => p.elementType === elementType && p.elementName === elementName)) {
      inst.pinned.push({ elementType, elementName, override: JSON.parse(JSON.stringify(el)) })
      persist()
    }
  }

  function unpinElement(instanceId: string, elementType: ElementType, elementName: string): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const idx = inst.pinned.findIndex((p) => p.elementType === elementType && p.elementName === elementName)
    if (idx !== -1) {
      inst.pinned.splice(idx, 1)
      persist()
    }
  }

  function updatePinnedElement(instanceId: string, elementType: ElementType, elementName: string, override: any): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const pinned = inst.pinned.find((p) => p.elementType === elementType && p.elementName === elementName)
    if (pinned) {
      pinned.override = override
      persist()
    }
  }

  function setChildOverride(instanceId: string, refIdPath: string, key: string, value: unknown): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    if (!inst.childOverrides) inst.childOverrides = {}
    if (!inst.childOverrides[refIdPath]) inst.childOverrides[refIdPath] = {}
    inst.childOverrides[refIdPath][key] = value
    persist()
  }

  function clearChildOverride(instanceId: string, refIdPath: string, key: string): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst?.childOverrides?.[refIdPath]) return
    delete inst.childOverrides[refIdPath][key]
    if (Object.keys(inst.childOverrides[refIdPath]).length === 0) {
      delete inst.childOverrides[refIdPath]
    }
    persist()
  }

  function addExtra(instanceId: string, elementType: ElementType, element: any): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    inst.extras[elementType].push(element)
    persist()
  }

  // Custom library actions

  function addCustomRecipe(def: RecipeDef): void {
    customLibrary.value.push(def)
    registerRecipe(def)
    saveLibrary(customLibrary.value)
  }

  function removeCustomRecipe(id: string): void {
    const idx = customLibrary.value.findIndex((d) => d.id === id)
    if (idx !== -1) {
      customLibrary.value.splice(idx, 1)
      unregisterRecipe(id)
      saveLibrary(customLibrary.value)
    }
  }

  function renameCustomRecipe(id: string, newName: string): void {
    const def = customLibrary.value.find((d) => d.id === id)
    if (def) {
      def.name = newName
      // Keep registry in sync.
      registerRecipe(def)
      saveLibrary(customLibrary.value)
    }
  }

  return {
    instances,
    customLibrary,
    materialized,
    focusedInstanceId,
    addInstance,
    reorderInstance,
    addComposedRefToInstance,
    moveElement,
    removeInstance,
    renameInstance,
    duplicateInstance,
    updateParams,
    pinElement,
    unpinElement,
    updatePinnedElement,
    setChildOverride,
    clearChildOverride,
    addExtra,
    addCustomRecipe,
    removeCustomRecipe,
    renameCustomRecipe,
  }
})
