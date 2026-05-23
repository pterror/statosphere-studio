<template>
  <div class="border border-gray-800 rounded-lg bg-gray-900 overflow-hidden">
    <div
      class="flex items-center gap-3 px-4 py-2 bg-gray-850 border-b border-gray-800 cursor-pointer hover:bg-gray-800"
      @click="collapsed = !collapsed"
    >
      <span class="text-sm font-medium text-gray-100">{{ instance.name }}</span>
      <span class="text-xs text-gray-500">{{ recipeName }}</span>
      <span class="text-gray-600 text-xs ml-auto mr-2">{{ collapsed ? '▶' : '▼' }}</span>
      <div class="relative">
        <button
          class="text-gray-500 hover:text-gray-300 text-sm px-1"
          @click.stop="menuOpen = !menuOpen"
          title="More options"
        >⋯</button>
        <div
          v-if="menuOpen"
          v-click-outside="() => { menuOpen = false }"
          class="absolute right-0 top-6 z-20 bg-gray-900 border border-gray-700 rounded shadow-xl py-1 min-w-[120px]"
        >
          <button class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800" @click="onRemove">Remove</button>
        </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { RecipeInstance, ElementType } from '../recipes/types'
import { getRecipe } from '../recipes/registry'
import { materializeInstances } from '../recipes/materialize'
import ElementRow from './ElementRow.vue'

const props = defineProps<{ instance: RecipeInstance }>()
const emit = defineEmits<{ remove: [id: string]; change: [] }>()

const collapsed = ref(false)
const menuOpen = ref(false)

const ELEMENT_TYPES: ElementType[] = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']

const recipeName = computed(() => getRecipe(props.instance.recipeId)?.name ?? props.instance.recipeId)

const allElements = computed(() => materializeInstances([props.instance]))

const totalCount = computed(() =>
  ELEMENT_TYPES.reduce((sum, et) => sum + allElements.value[et].length, 0),
)

function onRemove() {
  menuOpen.value = false
  emit('remove', props.instance.id)
}

const clickOutsideHandlers = new WeakMap<HTMLElement, (e: MouseEvent) => void>()

const vClickOutside = {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    clickOutsideHandlers.set(el, handler)
    document.addEventListener('click', handler, true)
  },
  unmounted(el: HTMLElement) {
    const handler = clickOutsideHandlers.get(el)
    if (handler) document.removeEventListener('click', handler, true)
  },
}
</script>
