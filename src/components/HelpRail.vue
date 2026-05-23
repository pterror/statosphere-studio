<template>
  <aside
    class="help-rail shrink-0 border-l border-gray-800 bg-gray-900 overflow-y-auto transition-all"
    :class="collapsed ? 'w-8' : 'w-64'"
  >
    <div v-if="collapsed" class="flex items-center justify-center h-full">
      <button
        class="text-gray-500 hover:text-gray-300 rotate-90 text-xs tracking-widest writing-mode-vertical"
        @click="collapsed = false"
        title="Open help"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </button>
    </div>
    <div v-else class="p-4 flex flex-col gap-2 h-full">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Help</span>
        <button class="text-gray-600 hover:text-gray-400 text-xs" @click="collapsed = true" title="Collapse">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>
      <div
        v-if="rendered"
        class="prose prose-invert prose-sm max-w-none text-gray-300 help-content"
        v-html="rendered"
      />
      <template v-else>
        <p class="text-xs text-gray-600">Click any field to see help.</p>
        <template v-if="lintsStore.results.length">
          <div class="mt-2 border-t border-gray-800 pt-2">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lints ({{ lintsStore.results.length }})</span>
          </div>
          <div class="flex flex-col gap-2 mt-1">
            <button
              v-for="(lint, i) in lintsStore.results"
              :key="i"
              class="flex items-start gap-1.5 text-left rounded hover:bg-gray-800 px-1.5 py-1 transition-colors"
              @click="jumpToLint(lint)"
            >
              <span class="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span class="text-xs text-yellow-200 leading-snug">{{ lint.message }}</span>
            </button>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import { useFocusStore } from '../stores/focus'
import { useLintsStore } from '../stores/lints'
import { useUiStore } from '../stores/ui'
import { getHelp } from '../help/loader'
import type { LintResult } from '../stores/lints'

const focusStore = useFocusStore()
const lintsStore = useLintsStore()
const uiStore = useUiStore()
const collapsed = ref(false)

const raw = computed(() => {
  const f = focusStore.focusedField
  if (!f) return null
  return getHelp(f.section, f.field)
})

const rendered = computed(() => {
  if (!raw.value) return null
  return marked.parse(raw.value) as string
})

function jumpToLint(lint: LintResult) {
  uiStore.activeTab = lint.section
}

function handleResize() {
  if (window.innerWidth < 900) {
    collapsed.value = true
  } else {
    collapsed.value = false
  }
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.help-content :deep(h1) {
  @apply text-sm font-semibold text-gray-200 mb-2;
}
.help-content :deep(h2) {
  @apply text-xs font-semibold text-gray-300 mt-3 mb-1;
}
.help-content :deep(p) {
  @apply text-xs text-gray-400 leading-relaxed mb-2;
}
.help-content :deep(code) {
  @apply bg-gray-800 text-indigo-300 px-1 rounded text-xs font-mono;
}
.help-content :deep(pre) {
  @apply bg-gray-800 rounded p-2 mb-2 overflow-x-auto;
}
.help-content :deep(pre code) {
  @apply bg-transparent px-0;
}
.help-content :deep(a) {
  @apply text-indigo-400 hover:text-indigo-300 underline text-xs;
}
.help-content :deep(ul) {
  @apply list-disc list-inside text-xs text-gray-400 mb-2 space-y-1;
}
.help-content :deep(li) {
  @apply text-xs text-gray-400;
}
.help-content :deep(strong) {
  @apply text-gray-200 font-semibold;
}
.help-content :deep(blockquote) {
  @apply border-l-2 border-indigo-700 pl-2 text-gray-500 italic;
}
.help-content :deep(table) {
  @apply text-xs w-full mb-2;
}
.help-content :deep(th) {
  @apply text-gray-300 text-left pb-1 border-b border-gray-700;
}
.help-content :deep(td) {
  @apply text-gray-400 py-0.5;
}
</style>
