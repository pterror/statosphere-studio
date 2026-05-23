<template>
  <div
    data-recipe-block
    class="glass-panel transition-colors"
    :class="isFocused ? 'ring-2 ring-[var(--accent)]/40' : ''"
    @mousedown.capture="onBlockMousedown"
  >
    <!-- Header -->
    <div
      class="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-[var(--glass-bg-hover)] rounded-t-[12px]"
      style="border-bottom: 1px solid var(--glass-border)"
      @click="collapsed = !collapsed"
    >
      <!-- Grip handle -->
      <span
        class="text-gray-600 hover:text-gray-300 cursor-grab active:cursor-grabbing shrink-0 select-none"
        title="Drag to reorder"
        v-bind="gripDrag"
        @click.stop
      >≡</span>
      <span class="text-sm font-medium text-gray-100">{{ instance.name }}</span>
      <span class="text-xs text-gray-500">{{ recipeName }}</span>

      <!-- Params row (always visible) -->
      <div v-if="def && def.params.length > 0" class="flex items-center gap-3 ml-2 flex-wrap" @click.stop>
        <template v-for="p in def.params" :key="p.key">
          <div class="flex items-center gap-1">
            <span class="text-xs text-gray-600">{{ p.label }}</span>
            <!-- label-list: chip editor -->
            <div v-if="p.kind === 'label-list'" class="flex items-center gap-1 flex-wrap">
              <span
                v-for="(chip, ci) in (instance.params[p.key] as string[])"
                :key="ci"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-800 text-gray-300 border border-gray-700"
              >
                {{ chip }}
                <button
                  class="text-gray-500 hover:text-red-400 leading-none"
                  @click.stop="removeChip(p.key, ci)"
                >×</button>
              </span>
              <button
                class="text-xs text-indigo-400 hover:text-indigo-300 px-1"
                @click.stop="addChip(p.key)"
              >+</button>
            </div>
            <!-- enum -->
            <select
              v-else-if="p.kind === 'enum'"
              :value="instance.params[p.key]"
              class="param-input"
              @change="updateParam(p.key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="c in p.choices" :key="c" :value="c">{{ c }}</option>
            </select>
            <!-- number -->
            <input
              v-else-if="p.kind === 'number'"
              type="number"
              :value="instance.params[p.key] as number"
              :min="p.min"
              :max="p.max"
              class="param-input w-20"
              @change="updateParam(p.key, Number(($event.target as HTMLInputElement).value))"
            />
            <!-- string -->
            <input
              v-else
              type="text"
              :value="instance.params[p.key] as string"
              class="param-input w-28"
              @change="updateParam(p.key, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </template>
      </div>

      <span class="text-gray-600 text-xs ml-auto mr-2">{{ collapsed ? '▶' : '▼' }}</span>
      <!-- Block menu -->
      <div class="relative" @click.stop>
        <button
          ref="menuTriggerRef"
          class="text-gray-500 hover:text-gray-300 text-sm px-1"
          @click.stop="toggleMenu"
          title="More options"
        >⋯</button>
        <Popover v-model:open="menuOpen" :anchor="menuTriggerRef" placement="below-right" :roving="true">
          <div class="glass-panel py-1 min-w-[160px]" style="border-radius: 10px">
            <button role="menuitem" class="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--glass-bg-hover)]" style="color: var(--text-secondary)" @click="onRename">Rename</button>
            <button role="menuitem" class="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--glass-bg-hover)]" style="color: var(--text-secondary)" @click="onDuplicate">Duplicate</button>
            <button role="menuitem" class="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--glass-bg-hover)]" style="color: var(--text-secondary)" @click="onPromote">Promote to recipe…</button>
            <button role="menuitem" class="block w-full text-left px-4 py-2 text-sm hover:bg-[var(--glass-bg-hover)]" style="color: var(--text-secondary)" @click="onExportUrl">Export as URL</button>
            <div class="my-1" style="border-top: 1px solid var(--glass-border)" />
            <button role="menuitem" class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[var(--glass-bg-hover)]" @click="onRemove">Remove</button>
          </div>
        </Popover>
      </div>
    </div>

    <!-- Body -->
    <div
      v-if="!collapsed"
      v-bind="bodyDrop"
      :class="{
        'ring-2 ring-indigo-500/40': bodyDropActive,
        'ring-2 ring-red-500/50': bodyDropRejected,
      }"
      :style="{ transition: settingsStore.reducedMotion ? 'none' : 'box-shadow 150ms ease-out' }"
    >
      <!-- Composed: nested sub-blocks -->
      <template v-if="def && def.source.kind === 'composed'">
        <div class="flex flex-col divide-y" style="--tw-divide-opacity: 1; border-color: var(--glass-border)">
          <template v-for="ref in [...def.source.refs, ...(instance.instanceRefs?.[''] ?? [])]" :key="ref.refId">
            <ComposedChildBlock
              :ref-def="ref"
              :instance="instance"
              :parent-params="instance.params"
              :ref-id-path="[ref.refId]"
              :depth="0"
              @change="emit('change')"
            />
          </template>
        </div>
      </template>

      <!-- Non-composed: flat element rows -->
      <template v-else>
        <div class="divide-y" style="border-color: var(--glass-border)">
          <template v-for="et in ELEMENT_TYPES" :key="et">
            <ElementRow
              v-for="(el, i) in allElements[et]"
              :key="`${et}-${i}`"
              :ref="(r) => setRowRef(et, i, r)"
              :element-type="et"
              :element="el"
              :instance-id="instance.id"
              @change="emit('change')"
            />
          </template>
          <div v-if="totalCount === 0" class="px-4 py-3 text-xs" style="color: var(--text-muted)">No elements</div>
        </div>
      </template>

      <!-- Extra elements (always shown at bottom) -->
      <div v-if="instance.extras && hasExtras" class="divide-y" style="border-color: var(--glass-border); border-top: 1px solid var(--glass-border)">
        <template v-for="et in ELEMENT_TYPES" :key="et">
          <ElementRow
            v-for="(el, i) in instance.extras[et]"
            :key="`extra-${et}-${i}`"
            :ref="(r) => setExtraRowRef(et, i, r)"
            :element-type="et"
            :element="el"
            :instance-id="instance.id"
            @change="emit('change')"
          />
        </template>
      </div>

      <!-- Footer: + Add element -->
      <div class="px-4 py-2" style="border-top: 1px solid var(--glass-border)">
        <ElementTypePicker label="+ Add element ▾" @select="addElement" />
      </div>
    </div>

    <PromoteRecipeDialog
      v-if="promoteOpen"
      v-model:open="promoteOpen"
      :instance="instance"
      :materialized="allElements"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { RecipeInstance, ElementType, ComposedRef } from '../recipes/types'
import { getRecipe } from '../recipes/registry'
import { materializeInstances } from '../recipes/materialize'
import { useRecipesStore } from '../stores/recipes'
import ElementRow from './ElementRow.vue'
import ElementTypePicker from './ElementTypePicker.vue'
import PromoteRecipeDialog from './PromoteRecipeDialog.vue'
import ComposedChildBlock from './ComposedChildBlock.vue'
import Popover from './Popover.vue'
import { makeDragSource, makeDropTarget } from '../composables/use-dnd'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{ instance: RecipeInstance }>()
const emit = defineEmits<{ remove: [id: string]; change: []; 'export-url': [id: string]; 'element-drop': [srcId: string, tgtId: string, et: string, name: string] }>()

const recipesStore = useRecipesStore()
const settingsStore = useSettingsStore()

const collapsed = ref(false)
const bodyDropActive = ref(false)
const bodyDropRejected = ref(false)

const gripDrag = makeDragSource({ kind: 'block', instanceId: props.instance.id }, { ghostText: props.instance.name })

const bodyDrop = makeDropTarget({
  accept: ['element', 'atom-card'],
  onDrop: (p, _e) => {
    bodyDropActive.value = false
    if (p.kind === 'element') {
      emit('element-drop', p.instanceId, props.instance.id, p.elementType, p.elementName)
    } else if (p.kind === 'atom-card') {
      const def = getRecipe(props.instance.recipeId)
      if (!def || def.source.kind !== 'composed') {
        bodyDropRejected.value = true
        setTimeout(() => { bodyDropRejected.value = false }, 600)
        return
      }
      const refId = p.recipeId.replace(/[^a-z0-9]/g, '_') + '_' + Date.now()
      const atomDef = getRecipe(p.recipeId)
      const newRef: ComposedRef = {
        refId,
        recipeId: p.recipeId,
        defaultName: atomDef?.name ?? p.recipeId,
        paramBindings: {},
      }
      recipesStore.addComposedRefToInstance(props.instance.id, '', newRef)
      emit('change')
    }
  },
  onOver: () => { bodyDropActive.value = true },
  onLeave: () => { bodyDropActive.value = false },
})
const menuOpen = ref(false)
const promoteOpen = ref(false)
const menuTriggerRef = ref<HTMLButtonElement | null>(null)

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

const def = computed(() => getRecipe(props.instance.recipeId))
const recipeName = computed(() => def.value?.name ?? props.instance.recipeId)
const allElements = computed(() => materializeInstances([props.instance]))

const totalCount = computed(() =>
  ELEMENT_TYPES.reduce((sum, et) => sum + allElements.value[et].length, 0),
)

const hasExtras = computed(() =>
  props.instance.extras && ELEMENT_TYPES.some(et => (props.instance.extras[et]?.length ?? 0) > 0),
)

const isFocused = computed(() => recipesStore.focusedInstanceId === props.instance.id)

// Row refs for auto-expand
const rowRefs = ref<Record<string, any>>({})
const extraRowRefs = ref<Record<string, any>>({})

function setRowRef(et: ElementType, i: number, r: any) {
  if (r) rowRefs.value[`${et}-${i}`] = r
}

function setExtraRowRef(et: ElementType, i: number, r: any) {
  if (r) extraRowRefs.value[`${et}-${i}`] = r
}

function updateParam(key: string, value: unknown) {
  recipesStore.updateParams(props.instance.id, { [key]: value })
  emit('change')
}

function removeChip(key: string, idx: number) {
  const arr = [...(props.instance.params[key] as string[])]
  arr.splice(idx, 1)
  updateParam(key, arr)
}

function addChip(key: string) {
  const label = prompt('Add label:')
  if (!label) return
  const arr = [...((props.instance.params[key] as string[]) ?? [])]
  arr.push(label.trim())
  updateParam(key, arr)
}

function emptyElement(et: ElementType): any {
  if (et === 'variables') return { name: 'new_var', initialValue: '0' }
  if (et === 'classifiers') return { name: 'NewClassifier', classifications: [{ label: 'an event', threshold: 0.65, updates: [] }] }
  if (et === 'generators') return { name: 'NewGen', type: 'Text', prompt: '""', minTokens: 5, maxTokens: 40, phase: 'On Response' }
  if (et === 'contentRules') return { category: 'Stage Direction', condition: 'true', modification: '""' }
  return { name: 'newFn', body: '0' }
}

function addElement(et: ElementType) {
  const el = emptyElement(et)
  recipesStore.addExtra(props.instance.id, et, el)
  emit('change')
  // Auto-expand the new row
  nextTick(() => {
    const count = props.instance.extras[et].length - 1
    const key = `${et}-${count}`
    extraRowRefs.value[key]?.expand()
  })
}

function onBlockMousedown() {
  recipesStore.focusedInstanceId = props.instance.id
}

// Block menu logic
function closeMenu() {
  menuOpen.value = false
}

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  menuOpen.value = !menuOpen.value
}

function onRemove() { closeMenu(); emit('remove', props.instance.id) }
function onRename() {
  closeMenu()
  const newName = prompt('Rename recipe instance:', props.instance.name)
  if (newName?.trim()) recipesStore.renameInstance(props.instance.id, newName.trim())
}
function onDuplicate() { closeMenu(); recipesStore.duplicateInstance(props.instance.id) }
function onPromote() { closeMenu(); promoteOpen.value = true }
function onExportUrl() { closeMenu(); emit('export-url', props.instance.id) }
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
