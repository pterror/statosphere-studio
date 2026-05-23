import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RecipeInstance, RecipeDef, ElementType, SchemaArrays } from '../recipes/types'
import { materializeInstances } from '../recipes/materialize'
import { getRecipe } from '../recipes/registry'

const STORAGE_KEY = 'statosphere-studio-recipes-v2'

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

export const useRecipesStore = defineStore('recipes', () => {
  const instances = ref<RecipeInstance[]>(loadFromStorage())
  const customLibrary = ref<RecipeDef[]>([])

  const materialized = computed<SchemaArrays>(() => materializeInstances(instances.value))

  function persist() {
    saveToStorage(instances.value)
  }

  function addInstance(recipeId: string): string {
    const recipe = getRecipe(recipeId)
    if (!recipe) return ''
    const defaults: Record<string, unknown> = {}
    for (const p of recipe.params) {
      defaults[p.key] = p.default
    }
    const id = crypto.randomUUID()
    instances.value.push({
      id,
      recipeId,
      name: recipe.name,
      params: defaults,
      pinned: [],
      extras: emptyArrays(),
    })
    persist()
    return id
  }

  function removeInstance(id: string): void {
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx !== -1) {
      instances.value.splice(idx, 1)
      persist()
    }
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
    const materialized = recipe.materialize(inst.params)
    const el = materialized[elementType].find((e: any) => e?.name === elementName)
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

  function addExtra(instanceId: string, elementType: ElementType, element: any): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    inst.extras[elementType].push(element)
    persist()
  }

  return {
    instances,
    customLibrary,
    materialized,
    addInstance,
    removeInstance,
    updateParams,
    pinElement,
    unpinElement,
    updatePinnedElement,
    addExtra,
  }
})
