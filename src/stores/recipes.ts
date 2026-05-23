import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { RecipeInstance, RecipeDef, ElementType, SchemaArrays } from '../recipes/types'
import { materializeInstances, localsFromTemplate } from '../recipes/materialize'
import { getRecipe, registerRecipe, unregisterRecipe } from '../recipes/registry'
import { useSettingsStore } from './settings'
import { useUndoStore } from './undo'
import { useToastStore } from './toast'

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

  function snapshotInstances(): RecipeInstance[] {
    return JSON.parse(JSON.stringify(instances.value))
  }

  function restoreInstances(snapshot: RecipeInstance[]): void {
    instances.value.splice(0, instances.value.length, ...snapshot)
    persist()
  }

  // Debounced param-edit snapshot (Option B for non-destructive param edits)
  const paramDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const paramDebounceSnapshots = new Map<string, RecipeInstance[]>()

  function scheduleParamSnapshot(instanceId: string, label: string): void {
    const undoStore = useUndoStore()
    if (!paramDebounceSnapshots.has(instanceId)) {
      paramDebounceSnapshots.set(instanceId, snapshotInstances())
    }
    if (paramDebounceTimers.has(instanceId)) {
      clearTimeout(paramDebounceTimers.get(instanceId)!)
    }
    const timer = setTimeout(() => {
      paramDebounceTimers.delete(instanceId)
      const before = paramDebounceSnapshots.get(instanceId)!
      paramDebounceSnapshots.delete(instanceId)
      const after = snapshotInstances()
      undoStore.push({
        label,
        do: () => { restoreInstances(after) },
        undo: () => { restoreInstances(before) },
      })
    }, 500)
    paramDebounceTimers.set(instanceId, timer)
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
    const before = snapshotInstances()
    if (atIndex !== undefined && atIndex >= 0 && atIndex <= instances.value.length) {
      instances.value.splice(atIndex, 0, inst)
    } else {
      instances.value.push(inst)
    }
    persist()
    const after = snapshotInstances()
    useUndoStore().push({
      label: `Add "${recipe.name}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
    return id
  }

  function reorderInstance(instanceId: string, newIndex: number): void {
    const idx = instances.value.findIndex((i) => i.id === instanceId)
    if (idx === -1) return
    const before = snapshotInstances()
    const [inst] = instances.value.splice(idx, 1)
    const clampedIndex = Math.max(0, Math.min(newIndex, instances.value.length))
    instances.value.splice(clampedIndex, 0, inst)
    persist()
    const after = snapshotInstances()
    useUndoStore().push({
      label: `Reorder "${inst.name}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
  }

  function addComposedRefToInstance(instanceId: string, refIdPath: string, ref: import('../recipes/types').ComposedRef): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const before = snapshotInstances()
    if (!inst.instanceRefs) inst.instanceRefs = {}
    if (!inst.instanceRefs[refIdPath]) inst.instanceRefs[refIdPath] = []
    inst.instanceRefs[refIdPath].push(ref)
    persist()
    const after = snapshotInstances()
    useUndoStore().push({
      label: `Add atom to "${inst.name}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
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
    const before = snapshotInstances()

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
    const after = snapshotInstances()
    useUndoStore().push({
      label: `Move element "${elementName}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
  }

  function removeInstance(id: string): void {
    const idx = instances.value.findIndex((i) => i.id === id)
    if (idx === -1) return
    const before = snapshotInstances()
    const name = instances.value[idx].name
    instances.value.splice(idx, 1)
    if (focusedInstanceId.value === id) focusedInstanceId.value = null
    persist()
    const after = snapshotInstances()
    const undoStore = useUndoStore()
    undoStore.push({
      label: `Remove "${name}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
    useToastStore().show(`Removed "${name}"`, {
      durationMs: 8000,
      action: { label: 'Undo', onClick: () => undoStore.undo() },
    })
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
    if (!inst) return
    inst.params = { ...inst.params, ...params }
    persist()
    scheduleParamSnapshot(id, `Edit params "${inst.name}"`)
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
      const before = snapshotInstances()
      inst.pinned.push({ elementType, elementName, override: JSON.parse(JSON.stringify(el)) })
      persist()
      const after = snapshotInstances()
      useUndoStore().push({
        label: `Pin element "${elementName}"`,
        do: () => { restoreInstances(after) },
        undo: () => { restoreInstances(before) },
      })
    }
  }

  function unpinElement(instanceId: string, elementType: ElementType, elementName: string): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const idx = inst.pinned.findIndex((p) => p.elementType === elementType && p.elementName === elementName)
    if (idx === -1) return
    const before = snapshotInstances()
    inst.pinned.splice(idx, 1)
    persist()
    const after = snapshotInstances()
    const undoStore = useUndoStore()
    undoStore.push({
      label: `Unpin element "${elementName}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
    useToastStore().show(`Removed element "${elementName}"`, {
      durationMs: 8000,
      action: { label: 'Undo', onClick: () => undoStore.undo() },
    })
  }

  function updatePinnedElement(instanceId: string, elementType: ElementType, elementName: string, override: any): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const pinned = inst.pinned.find((p) => p.elementType === elementType && p.elementName === elementName)
    if (!pinned) return
    pinned.override = override
    persist()
    scheduleParamSnapshot(instanceId + '/' + elementName, `Edit element "${elementName}"`)
  }

  function setChildOverride(instanceId: string, refIdPath: string, key: string, value: unknown): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    if (!inst.childOverrides) inst.childOverrides = {}
    if (!inst.childOverrides[refIdPath]) inst.childOverrides[refIdPath] = {}
    inst.childOverrides[refIdPath][key] = value
    persist()
    scheduleParamSnapshot(instanceId + '/child/' + refIdPath, `Edit child params`)
  }

  function clearChildOverride(instanceId: string, refIdPath: string, key: string): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst?.childOverrides?.[refIdPath]) return
    const before = snapshotInstances()
    delete inst.childOverrides[refIdPath][key]
    if (Object.keys(inst.childOverrides[refIdPath]).length === 0) {
      delete inst.childOverrides[refIdPath]
    }
    persist()
    const after = snapshotInstances()
    useUndoStore().push({
      label: `Clear child param "${key}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
  }

  function addExtra(instanceId: string, elementType: ElementType, element: any): void {
    const inst = instances.value.find((i) => i.id === instanceId)
    if (!inst) return
    const before = snapshotInstances()
    inst.extras[elementType].push(element)
    persist()
    const after = snapshotInstances()
    useUndoStore().push({
      label: `Add element to "${inst.name}"`,
      do: () => { restoreInstances(after) },
      undo: () => { restoreInstances(before) },
    })
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
