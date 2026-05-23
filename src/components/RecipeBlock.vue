<template>
  <div class="border border-gray-800 rounded-lg bg-gray-900">
    <div
      class="flex items-center gap-3 px-4 py-2 bg-gray-850 border-b border-gray-800 cursor-pointer hover:bg-gray-800"
      @click="collapsed = !collapsed"
    >
      <span class="text-sm font-medium text-gray-100">{{ instance.name }}</span>
      <span class="text-xs text-gray-500">{{ recipeName }}</span>
      <span class="text-gray-600 text-xs ml-auto mr-2">{{ collapsed ? '▶' : '▼' }}</span>
      <div class="relative">
        <button
          ref="menuTriggerRef"
          class="text-gray-500 hover:text-gray-300 text-sm px-1"
          @click.stop="toggleMenu"
          title="More options"
        >⋯</button>
        <Teleport to="body">
          <div
            v-if="menuOpen"
            ref="menuRef"
            :style="menuStyle"
            class="fixed z-50 bg-gray-900 border border-gray-700 rounded shadow-xl py-1 min-w-[160px]"
            @keydown="onMenuKeydown"
          >
            <button class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800" @click="onRename">Rename</button>
            <button class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800" @click="onDuplicate">Duplicate</button>
            <button class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800" @click="onPromote">Promote to recipe…</button>
            <button class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800" @click="onExportUrl">Export as URL</button>
            <div class="border-t border-gray-800 my-1" />
            <button class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800" @click="onRemove">Remove</button>
          </div>
        </Teleport>
      </div>
    </div>

    <div v-if="!collapsed" class="divide-y divide-gray-800">
      <template v-for="et in ELEMENT_TYPES" :key="et">
        <ElementRow
          v-for="(el, i) in allElements[et]"
          :key="`${et}-${i}`"
          :element-type="et"
          :element="el"
          @change="emit('change')"
        />
      </template>
      <div v-if="totalCount === 0" class="px-4 py-3 text-xs text-gray-600">No elements</div>
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
import { ref, computed, nextTick, onUnmounted } from 'vue'
import type { RecipeInstance, ElementType } from '../recipes/types'
import { getRecipe } from '../recipes/registry'
import { materializeInstances } from '../recipes/materialize'
import { useRecipesStore } from '../stores/recipes'
import ElementRow from './ElementRow.vue'
import PromoteRecipeDialog from './PromoteRecipeDialog.vue'

const props = defineProps<{ instance: RecipeInstance }>()
const emit = defineEmits<{ remove: [id: string]; change: []; 'export-url': [id: string] }>()

const recipesStore = useRecipesStore()

const collapsed = ref(false)
const menuOpen = ref(false)
const promoteOpen = ref(false)
const menuTriggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

const recipeName = computed(() => getRecipe(props.instance.recipeId)?.name ?? props.instance.recipeId)

const allElements = computed(() => materializeInstances([props.instance]))

const totalCount = computed(() =>
  ELEMENT_TYPES.reduce((sum, et) => sum + allElements.value[et].length, 0),
)

function closeMenu() {
  menuOpen.value = false
  removeGlobalListeners()
}

function toggleMenu(e: MouseEvent) {
  e.stopPropagation()
  if (menuOpen.value) {
    closeMenu()
    return
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    right: `${window.innerWidth - rect.right}px`,
  }
  menuOpen.value = true
  nextTick(() => {
    const first = menuRef.value?.querySelector('button') as HTMLElement | null
    first?.focus()
    addGlobalListeners()
  })
}

function onMenuKeydown(e: KeyboardEvent) {
  const items = Array.from(menuRef.value?.querySelectorAll('button') ?? []) as HTMLElement[]
  const idx = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    items[(idx + 1) % items.length]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    items[(idx - 1 + items.length) % items.length]?.focus()
  } else if (e.key === 'Escape') {
    closeMenu()
    menuTriggerRef.value?.focus()
  }
}

function onMousedown(e: MouseEvent) {
  const target = e.target as Node
  if (!menuRef.value?.contains(target) && !menuTriggerRef.value?.contains(target)) {
    closeMenu()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

function onScroll() {
  closeMenu()
}

function addGlobalListeners() {
  document.addEventListener('mousedown', onMousedown, true)
  document.addEventListener('keydown', onKeydown, true)
  window.addEventListener('scroll', onScroll, true)
}

function removeGlobalListeners() {
  document.removeEventListener('mousedown', onMousedown, true)
  document.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('scroll', onScroll, true)
}

onUnmounted(removeGlobalListeners)

function onRemove() {
  closeMenu()
  emit('remove', props.instance.id)
}

function onRename() {
  closeMenu()
  const newName = prompt('Rename recipe instance:', props.instance.name)
  if (newName && newName.trim()) {
    recipesStore.renameInstance(props.instance.id, newName.trim())
  }
}

function onDuplicate() {
  closeMenu()
  recipesStore.duplicateInstance(props.instance.id)
}

function onPromote() {
  closeMenu()
  promoteOpen.value = true
}

function onExportUrl() {
  closeMenu()
  emit('export-url', props.instance.id)
}
</script>
