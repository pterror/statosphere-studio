<template>
  <div
    class="glass-panel-soft"
    :class="depthClass"
    :style="{ paddingLeft: indentPx, marginLeft: '0.5rem', borderLeft: '2px solid var(--glass-border)' }"
  >
    <!-- Child header -->
    <div
      class="glass-row flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded"
      :class="headerSizeClass"
      @click="collapsed = !collapsed"
    >
      <span class="font-medium" style="color: var(--text-secondary)">{{ childDef?.name ?? refDef.refId }}</span>
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

      <!-- Extras at this child's path -->
      <div v-if="hasPathExtras" class="divide-y" style="border-color: var(--glass-border); border-top: 1px solid var(--glass-border)">
        <template v-for="et in ELEMENT_TYPES" :key="et">
          <ElementRow
            v-for="(el, i) in pathExtras[et]"
            :key="`extra-${et}-${i}`"
            :element-type="et"
            :element="el"
            :instance-id="instance.id"
            :extras-index="i"
            :extras-path="childRefIdPathKey"
            @change="emit('change')"
          />
        </template>
      </div>

      <!-- Footer: + Add element at this child's path -->
      <div class="px-3 py-1.5" style="border-top: 1px solid var(--glass-border)">
        <ElementTypePicker label="+ Add element ▾" @select="addChildElement" />
      </div>
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
import ElementTypePicker from './ElementTypePicker.vue'

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

const childRefIdPathKey = computed(() => props.refIdPath.join('.'))

const childOverrides = computed(
  () => props.instance.childOverrides?.[childRefIdPathKey.value] ?? {},
)

const resolvedParams = computed(() =>
  resolveChildParams(props.refDef, props.parentParams, childOverrides.value),
)

// Indent: min(depth * 12, 48) px, expressed as a string for inline style.
const indentPx = computed(() => `${Math.min(props.depth * 12, 48)}px`)

// Past depth 3, shrink header text slightly.
const depthClass = computed(() => props.depth > 3 ? 'composed-child--deep' : '')
const headerSizeClass = computed(() => props.depth > 3 ? 'text-xs' : 'text-xs')

function isParentBound(key: string): boolean {
  return !(childOverrides.value && key in childOverrides.value)
}

function overrideParam(key: string, value: unknown) {
  recipesStore.setChildOverride(props.instance.id, childRefIdPathKey.value, key, value)
  emit('change')
}

function unlinkParam(key: string) {
  overrideParam(key, resolvedParams.value[key])
}

function relinkParam(key: string) {
  recipesStore.clearChildOverride(props.instance.id, childRefIdPathKey.value, key)
  emit('change')
}

// Materialize this child's elements for display
const childElements = computed(() => {
  if (!childDef.value) return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  if (childDef.value.source.kind === 'composed') {
    return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  }
  // Create a synthetic instance for materialization — no extras needed here (display only)
  const syntheticInst: RecipeInstance = {
    id: props.instance.id + '_' + props.refIdPath.join('_'),
    recipeId: props.refDef.recipeId,
    name: props.refDef.defaultName,
    params: resolvedParams.value,
    pinned: [],
    extrasByPath: {},
  }
  return materializeInstances([syntheticInst])
})

const childElementCount = computed(() =>
  ELEMENT_TYPES.reduce((s, et) => s + childElements.value[et].length, 0),
)

// Extras stored at this child's path
const pathExtras = computed(() =>
  props.instance.extrasByPath?.[childRefIdPathKey.value] ?? { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] },
)

const hasPathExtras = computed(() =>
  ELEMENT_TYPES.some(et => (pathExtras.value[et]?.length ?? 0) > 0),
)

function emptyElement(et: ElementType): any {
  if (et === 'variables') return { name: 'new_var', initialValue: '0' }
  if (et === 'classifiers') return { name: 'NewClassifier', classifications: [{ label: 'an event', threshold: 0.65, updates: [] }] }
  if (et === 'generators') return { name: 'NewGen', type: 'Text', prompt: '""', minTokens: 5, maxTokens: 40, phase: 'On Response' }
  if (et === 'contentRules') return { category: 'Stage Direction', condition: 'true', modification: '""' }
  return { name: 'newFn', body: '0' }
}

function addChildElement(et: ElementType) {
  recipesStore.addExtra(props.instance.id, childRefIdPathKey.value, et, emptyElement(et))
  emit('change')
}
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
/* Past depth 3: slightly reduce header font size */
.composed-child--deep .glass-row {
  font-size: 0.9rem;
}
</style>
