<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" @mousedown.self="close">
      <div class="fixed inset-0 bg-black/60" @mousedown="close" />
      <div
        ref="panel"
        class="relative z-10 bg-gray-900 border border-gray-700 rounded-xl w-[560px] max-w-[90vw] shadow-2xl flex flex-col overflow-hidden"
        @keydown="onKeydown"
      >
        <!-- Search input -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <span class="text-gray-500 text-sm">⌕</span>
          <input
            ref="searchInput"
            v-model="query"
            class="flex-1 bg-transparent text-gray-100 text-sm outline-none placeholder-gray-600"
            placeholder="Search recipes…"
            @keydown.esc.prevent="close"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.enter.prevent="addSelected"
          />
          <kbd class="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        <!-- Recipe list -->
        <div ref="listEl" class="max-h-[55vh] overflow-y-auto py-1">
          <div v-if="filtered.length === 0" class="px-4 py-6 text-sm text-gray-600 text-center">
            No recipes match "{{ query }}"
          </div>
          <button
            v-for="(item, i) in filtered"
            :key="item.def.id"
            :ref="(el) => setItemRef(el, i)"
            class="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors"
            :class="i === selectedIndex ? 'bg-indigo-600/20 border-l-2 border-indigo-500' : 'border-l-2 border-transparent hover:bg-gray-800'"
            @mouseenter="selectedIndex = i"
            @click="addRecipe(item.def.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-100">{{ item.def.name }}</span>
                <span
                  v-if="item.isCustom"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50"
                >Custom</span>
              </div>
              <div class="text-xs text-gray-400 mt-0.5 truncate">{{ item.def.description }}</div>
            </div>
          </button>
        </div>

        <div class="px-4 py-2 border-t border-gray-800 text-xs text-gray-600 flex items-center gap-3">
          <span><kbd class="bg-gray-800 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd class="bg-gray-800 px-1 rounded">↵</kbd> add</span>
          <span><kbd class="bg-gray-800 px-1 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { listRecipes } from '../recipes/registry'
import { useRecipesStore } from '../stores/recipes'
import type { RecipeDef } from '../recipes/types'

const open = defineModel<boolean>('open', { default: false })
const recipesStore = useRecipesStore()

const query = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
const itemRefs = ref<(Element | null)[]>([])

function setItemRef(el: Element | null | any, i: number) {
  itemRefs.value[i] = el instanceof Element ? el : null
}

interface ListItem {
  def: RecipeDef
  isCustom: boolean
  score: number
}

// Tiny fuzzy matcher: subsequence with consecutive-char bonus and prefix bonus.
// Name field is weighted 2×. Returns 0 when no match.
function fuzzyScore(target: string, pattern: string): number {
  if (!pattern) return 1
  const t = target.toLowerCase()
  const p = pattern.toLowerCase()
  let ti = 0
  let pi = 0
  let score = 0
  let consecutive = 0
  while (ti < t.length && pi < p.length) {
    if (t[ti] === p[pi]) {
      score += 1 + consecutive * 2
      if (ti === 0 && pi === 0) score += 5 // prefix bonus
      consecutive++
      pi++
    } else {
      consecutive = 0
    }
    ti++
  }
  return pi === p.length ? score : 0
}

const allItems = computed<ListItem[]>(() => {
  const customIds = new Set(recipesStore.customLibrary.map((d) => d.id))
  return listRecipes()
    .filter((r) => r.id !== 'custom')
    .map((def) => ({ def, isCustom: customIds.has(def.id), score: 0 }))
})

const filtered = computed<ListItem[]>(() => {
  const q = query.value.trim()
  if (!q) {
    return allItems.value.map((item) => ({ ...item, score: 1 }))
  }
  return allItems.value
    .map((item) => {
      const nameScore = fuzzyScore(item.def.name, q) * 2
      const descScore = fuzzyScore(item.def.description, q)
      const tagScore = (item.def.tags ?? []).reduce((acc, t) => acc + fuzzyScore(t, q), 0)
      return { ...item, score: nameScore + descScore + tagScore }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
})

watch(filtered, () => {
  selectedIndex.value = 0
})

watch(open, (v) => {
  if (v) {
    query.value = ''
    selectedIndex.value = 0
    nextTick(() => searchInput.value?.focus())
  }
})

function close() {
  open.value = false
}

function moveSelection(dir: number) {
  const len = filtered.value.length
  if (!len) return
  selectedIndex.value = (selectedIndex.value + dir + len) % len
  nextTick(() => {
    const el = itemRefs.value[selectedIndex.value]
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

function addRecipe(id: string) {
  recipesStore.addInstance(id)
  close()
}

function addSelected() {
  const item = filtered.value[selectedIndex.value]
  if (item) addRecipe(item.def.id)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { close(); e.preventDefault() }
  if (e.key === 'ArrowUp') { moveSelection(-1); e.preventDefault() }
  if (e.key === 'ArrowDown') { moveSelection(1); e.preventDefault() }
  if (e.key === 'Enter') { addSelected(); e.preventDefault() }
}
</script>
