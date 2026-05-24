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
      role="button"
      tabindex="0"
      :aria-label="`${childDef?.name ?? refDef.refId} — ${collapsed ? 'expand' : 'collapse'}`"
      :aria-expanded="!collapsed"
      @click="collapsed = !collapsed"
      @keydown.enter.prevent="collapsed = !collapsed"
      @keydown.space.prevent="collapsed = !collapsed"
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
              role="button"
              tabindex="0"
              @click.stop="unlinkParam(p.key)"
              @keydown.enter.stop.prevent="unlinkParam(p.key)"
              @keydown.space.stop.prevent="unlinkParam(p.key)"
            >⛓</span>
            <span
              v-else
              class="text-xs text-amber-500 cursor-pointer hover:text-gray-400"
              title="Override (click to re-link to parent)"
              role="button"
              tabindex="0"
              @click.stop="relinkParam(p.key)"
              @keydown.enter.stop.prevent="relinkParam(p.key)"
              @keydown.space.stop.prevent="relinkParam(p.key)"
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
        <!-- Pinned elements at this child's path (shown as editable) -->
        <div v-if="childPinnedCount > 0" class="divide-y" style="border-color: var(--glass-border)">
          <template v-for="et in ELEMENT_TYPES" :key="et">
            <ElementRow
              v-for="(el, i) in childPinnedElements[et]"
              :key="`${et}-${i}`"
              :element-type="et"
              :element="el"
              :instance-id="instance.id"
              @change="emit('change')"
            />
          </template>
        </div>

        <!-- Inherited-contents invitation: recipe-contributed rows not yet pinned -->
        <div v-if="hasChildInheritedRows" class="inherited-section" :class="childPinnedCount > 0 ? 'inherited-section--with-divider' : ''">
          <div class="inherited-heading px-3 py-1 text-xs" style="color: var(--text-muted)">
            From recipe — click 📌 to customize
          </div>
          <div class="divide-y" style="border-color: var(--glass-border)">
            <template v-for="et in ELEMENT_TYPES" :key="et">
              <div
                v-for="(el, i) in childUnpinnedElements[et]"
                :key="`cinh-${et}-${i}`"
                class="flex items-center gap-2 px-3 py-1.5 inherited-row"
              >
                <span class="w-3 shrink-0"></span>
                <span class="text-xs w-20 shrink-0 inherited-type-label">{{ CHILD_TYPE_LABELS[et] }}</span>
                <span class="text-sm truncate flex-1 inherited-name">{{ (el as any).name ?? (el as any).category ?? '(unnamed)' }}</span>
                <button
                  class="pin-btn pin-btn--idle shrink-0 outline-none"
                  title="Pin to customize independently from recipe"
                  aria-label="Pin element"
                  tabindex="0"
                  @click.stop="pinChildInherited(et, (el as any).name ?? (el as any).category ?? '')"
                  @keydown.enter.stop="pinChildInherited(et, (el as any).name ?? (el as any).category ?? '')"
                  @keydown.space.prevent.stop="pinChildInherited(et, (el as any).name ?? (el as any).category ?? '')"
                >📌</button>
              </div>
            </template>
          </div>
        </div>

        <div v-if="!hasChildInheritedRows && childPinnedCount === 0 && !hasPathExtras" class="px-4 py-2 text-xs" style="color: var(--text-muted)">No elements</div>
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

const _childElementCount = computed(() =>
  ELEMENT_TYPES.reduce((s, et) => s + childElements.value[et].length, 0),
)

// Extras stored at this child's path
const pathExtras = computed(() =>
  props.instance.extrasByPath?.[childRefIdPathKey.value] ?? { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] },
)

const hasPathExtras = computed(() =>
  ELEMENT_TYPES.some(et => (pathExtras.value[et]?.length ?? 0) > 0),
)

// Recipe-only child elements (no pinned overrides applied) for the invitation section.
const childRecipeElements = computed(() => {
  if (!childDef.value || childDef.value.source.kind === 'composed') {
    return { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] } as import('../recipes/types').SchemaArrays
  }
  const synth: import('../recipes/types').RecipeInstance = {
    id: props.instance.id + '_' + props.refIdPath.join('_') + '_recipe',
    recipeId: props.refDef.recipeId,
    name: props.refDef.defaultName,
    params: resolvedParams.value,
    pinned: [],
    extrasByPath: {},
  }
  return materializeInstances([synth])
})

// Child recipe elements that haven't been pinned.
const childUnpinnedElements = computed(() => {
  const pinnedSet = new Set(props.instance.pinned.map(p => `${p.elementType}:${p.elementName}`))
  const result: import('../recipes/types').SchemaArrays = { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  for (const et of ELEMENT_TYPES) {
    for (const el of childRecipeElements.value[et]) {
      const key = `${et}:${(el as any).name ?? (el as any).category ?? ''}`
      if (!pinnedSet.has(key)) result[et].push(el)
    }
  }
  return result
})

const hasChildInheritedRows = computed(() =>
  ELEMENT_TYPES.some(et => childUnpinnedElements.value[et].length > 0),
)

// Pinned elements that belong to this child (by element name in the child's materialized output).
const childPinnedElements = computed(() => {
  const childNames = new Set<string>()
  for (const et of ELEMENT_TYPES) {
    for (const el of childRecipeElements.value[et]) {
      const n = (el as any).name ?? (el as any).category ?? ''
      if (n) childNames.add(`${et}:${n}`)
    }
  }
  const result: import('../recipes/types').SchemaArrays = { variables: [], classifiers: [], generators: [], contentRules: [], functions: [] }
  for (const p of props.instance.pinned) {
    if (childNames.has(`${p.elementType}:${p.elementName}`)) {
      result[p.elementType].push(p.override)
    }
  }
  return result
})

const childPinnedCount = computed(() =>
  ELEMENT_TYPES.reduce((sum, et) => sum + childPinnedElements.value[et].length, 0),
)

const CHILD_TYPE_LABELS: Record<import('../recipes/types').ElementType, string> = {
  variables: 'var',
  classifiers: 'classifier',
  generators: 'generator',
  contentRules: 'rule',
  functions: 'function',
}

function pinChildInherited(et: import('../recipes/types').ElementType, name: string) {
  if (!name) return
  recipesStore.pinElement(props.instance.id, et, name)
  emit('change')
}

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

/* Inherited (read-only) contents invitation */
.inherited-section--with-divider {
  border-top: 1px solid var(--glass-border);
}

.inherited-heading {
  font-style: italic;
  letter-spacing: 0.01em;
}

.inherited-row {
  cursor: default;
  opacity: 0.72;
}

.inherited-row:hover {
  background: var(--glass-bg-hover);
  opacity: 0.9;
}

.inherited-type-label {
  color: var(--text-muted);
}

.inherited-name {
  color: var(--text-muted);
  font-style: italic;
}

.pin-btn {
  font-size: 0.7rem;
  line-height: 1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
  transition: opacity 120ms ease, filter 120ms ease;
}

.pin-btn--idle {
  opacity: 0;
  filter: grayscale(1);
}

.inherited-row:hover .pin-btn--idle,
.pin-btn--idle:focus {
  opacity: 0.5;
}

.pin-btn--idle:hover {
  opacity: 0.85 !important;
  filter: none;
}

.pin-btn:focus-visible {
  box-shadow: 0 0 0 2px var(--accent-soft);
}
</style>
