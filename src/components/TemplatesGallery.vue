<template>
  <div class="p-6 overflow-y-auto">
    <h2 class="text-lg font-semibold text-gray-200 mb-4">Templates</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="entry in manifest.templates"
        :key="entry.slug"
        class="flex flex-col gap-3 rounded-lg bg-gray-900 border border-gray-800 p-4"
      >
        <div>
          <div class="font-medium text-gray-100 text-sm mb-1">{{ entry.title }}</div>
          <p class="text-xs text-gray-400 leading-relaxed">{{ entry.description }}</p>
        </div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="tag in entry.tags"
            :key="tag"
            class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400"
          >{{ tag }}</span>
        </div>
        <div class="flex gap-2 mt-auto">
          <button
            class="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            @click="handleLoad(entry.slug)"
          >Load</button>
          <a
            :href="entry.recipe"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >Recipe</a>
        </div>
      </div>
    </div>

    <DialogRoot :open="confirmOpen" @update:open="confirmOpen = $event">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
        <DialogContent
          class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-6 w-80 shadow-xl focus:outline-none"
        >
          <DialogTitle class="text-sm font-semibold text-gray-100 mb-2">Replace current config?</DialogTitle>
          <DialogDescription class="text-xs text-gray-400 mb-4">
            Loading this template will discard unsaved changes.
          </DialogDescription>
          <div class="flex justify-end gap-2">
            <button
              class="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              @click="cancelLoad"
            >Cancel</button>
            <button
              class="px-3 py-1 text-xs rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              @click="confirmLoad"
            >Replace</button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { useConfigStore } from '../stores/config'
import type { ConfigTree } from '../stores/config'
import manifest from '../../templates/manifest.json'

const templateFiles = import.meta.glob('../../templates/*.json', { eager: true }) as Record<
  string,
  { default: ConfigTree }
>

function getTemplateData(slug: string): ConfigTree | null {
  const key = `../../templates/${slug}.json`
  const mod = templateFiles[key]
  return mod ? (mod.default ?? (mod as unknown as ConfigTree)) : null
}

const configStore = useConfigStore()
const confirmOpen = ref(false)
const pendingSlug = ref<string | null>(null)

function handleLoad(slug: string) {
  if (configStore.dirty) {
    pendingSlug.value = slug
    confirmOpen.value = true
  } else {
    applyTemplate(slug)
  }
}

function applyTemplate(slug: string) {
  const data = getTemplateData(slug)
  if (data) configStore.loadTemplate(data)
}

function confirmLoad() {
  if (pendingSlug.value) applyTemplate(pendingSlug.value)
  confirmOpen.value = false
  pendingSlug.value = null
}

function cancelLoad() {
  confirmOpen.value = false
  pendingSlug.value = null
}
</script>
