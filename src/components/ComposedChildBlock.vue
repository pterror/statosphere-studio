<template>
  <!-- Depth guard: >2 levels show stub -->
  <div v-if="depth >= 2" class="pl-4 py-2 text-xs ml-4" style="color: var(--text-muted); border-left: 2px solid var(--glass-border)">
    <span title="Deep nesting view coming soon">Show sub-tree →</span>
  </div>

  <div v-else class="glass-panel-soft pl-4 ml-2" style="border-left: 2px solid var(--glass-border)">
    <!-- Child header -->
    <div
      class="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded"
      style="transition: background 120ms ease-out"
      @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--glass-bg-hover)'"
      @mouseleave="($event.currentTarget as HTMLElement).style.background = ''"
      @click="collapsed = !collapsed"
    >
      <span class="text-xs text-gray-400 font-medium">{{ childDef?.name ?? refDef.refId }}</span>
      <span class="text-xs text-gray-600">{{ refDef.refId }}</span>

      <!-- Child params row -->
      <div v-if="childDef && childDef.params.length > 0" class="flex items-center gap-2 ml-2 flex-wrap" @click.stop>
        <template v-for="p in childDef.params" :key="p.key">
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-600">{{ p.label }}</span>
            <span
              v-if="isParentBound(p.key)"
              class="text-xs text-gray-500 cursor-pointer hover:text-indigo-400"
              title="Bound from parent — click to override"
              @click.stop="unlinkParam(p.key)"
            >⛓</span>
            <span
              v-else
              class="text-xs text-amber-500 cursor-pointer hover:text-gray-400"
              title="Override (click to re-link to parent)"
              @click.stop="relinkParam(p.key)"
            >⛓‍💥</span>
            <!-- label-list chips -->
            <template v-if="p.kind === 'label-list'">
              <div class="flex items-center gap-1 flex-wrap">
                <span
                  v-for="(chip, ci) in (resolvedParams[p.key] as string[])"
                  :key="ci"
                  class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-300 border border-gray-700"
                >{{ chip }}</span>
              </div>
            </template>
            <input
              v-else-if="p.kind === 'number'"
              type="number"
              :value="resolvedParams[p.key] as number"
              :min="p.min"
              :max="p.max"
              class="param-input w-20"
              @change="overrideParam(p.key, Number(($event.target as HTMLInputElement).value))"
            />
            <select
              v-else-if="p.kind === 'enum'"
              :value="resolvedParams[p.key]"
              class="param-input"
              @change="overrideParam(p.key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="c in p.choices" :key="c" :value="c">{{ c }}</option>
            </select>
            <input
              v-else
              type="text"
              :value="resolvedParams[p.key] as string"
              class="param-input w-24"
              @change="overrideParam(p.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </template>
      </div>

      <span class="text-gray-600 text-xs ml-auto">{{ collapsed ? '▶' : '▼' }}</span>
    </div>

    <!-- Child body -->
    <div v-if="!collapsed">
      <!-- Further composed children -->
      <template v-if="childDef && childDef.source.kind === 'composed'">
        <div class="flex flex-col divide-y" style="border-color: var(--glass-border)">
          <ComposedChildBlock
            v-for="childRef in childDef.source.refs"
            :key="childRef.refId"
            :ref-def="childRef"
            :instance="instance"
            :parent-params="resolvedParams"
            :ref-id-path="[...refIdPath, childRef.refId]"
            :depth="depth + 1"
            @change="emit('change')"
          />
        </div>
      </template>

      <!-- Leaf: show materialized elements -->
      <template v-else>
        <div class="divide-y" style="border-color: var(--glass-border)">
          <template v-for="et in ELEMENT_TYPES" :key="et">
            <ElementRow
              v-for="(el, i) in childElements[et]"
              :key="`${et}-${i}`"
              :element-type="et"
              :element="el"
              :instance-id="instance.id"
              @change="emit('change')"
            />
          </template>
          <div v-if="childElementCount === 0" class="px-4 py-2 text-xs" style="color: var(--text-muted)">No elements</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecipeInstance, ComposedRef, ElementType } from '../recipes/types'
import { getRecipe } from '../recipes/registry'
import { resolveChildParams } from '../recipes/compose'
import { materializeInstances } from '../recipes/materialize'
import { useRecipesStore } from '../stores/recipes'
import ElementRow from './ElementRow.vue'

const props = defineProps<{
  refDef: ComposedRef
  instance: RecipeInstance
  parentParams: Record<string, unknown>
  refIdPath: string[]
  depth: number
}>()
const emit = defineEmits<{ change: [] }>()

const recipesStore = useRecipesStore()
const collapsed = ref(false)

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

const childDef = computed(() => getRecipe(props.refDef.recipeId))

const childOverridesKey = computed(() => props.refIdPath.join('.'))

const childOverrides = computed(
  () => props.instance.childOverrides?.[childOverridesKey.value] ?? {},
)

const resolvedParams = computed(() =>
  resolveChildParams(props.refDef, props.parentParams, childOverrides.value),
)

function isParentBound(key: string): boolean {
  return !(childOverrides.value && key in childOverrides.value)
}

function overrideParam(key: string, value: unknown) {
  recipesStore.setChildOverride(props.instance.id, childOverridesKey.value, key, value)
  emit('change')
}

function unlinkParam(key: string) {
  overrideParam(key, resolvedParams.value[key])
}

function relinkParam(key: string) {
  recipesStore.clearChildOverride(props.instance.id, childOverridesKey.value, key)
  emit('change')
}

// Materialize this child's elements for display
const childElements = computed(() => {
  if (!childDef.value) return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  if (childDef.value.source.kind === 'composed') {
    return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  }
  // Create a synthetic instance for materialization
  const syntheticInst: RecipeInstance = {
    id: props.instance.id + '_' + props.refIdPath.join('_'),
    recipeId: props.refDef.recipeId,
    name: props.refDef.defaultName,
    params: resolvedParams.value,
    pinned: [],
    extras: { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] },
  }
  return materializeInstances([syntheticInst])
})

const childElementCount = computed(() =>
  ELEMENT_TYPES.reduce((s, et) => s + childElements.value[et].length, 0),
)
</script>

<style scoped>
.param-input {
  @apply rounded px-1.5 py-0.5 text-xs outline-none;
  background: rgba(0, 0, 0, 0.15);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
}
:root[data-theme="light"] .param-input {
  background: rgba(255, 255, 255, 0.50);
}
.param-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
</style>
