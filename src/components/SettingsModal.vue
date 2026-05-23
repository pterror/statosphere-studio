<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg p-6 w-[540px] max-w-[92vw] max-h-[85vh] overflow-y-auto shadow-xl">
        <DialogTitle class="text-gray-100 font-semibold mb-5 text-base">Settings</DialogTitle>

        <!-- Appearance -->
        <section class="mb-5">
          <h3 class="section-heading">Appearance</h3>
          <div class="flex gap-2">
            <button
              v-for="t in (['light', 'dark', 'auto'] as const)"
              :key="t"
              class="px-3 py-1 rounded text-sm border transition-colors"
              :class="settings.theme === t
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'"
              @click="settings.setTheme(t)"
            >{{ t }}</button>
          </div>
        </section>

        <!-- Imports -->
        <section class="mb-5">
          <h3 class="section-heading">Trusted Import Prefixes</h3>
          <div class="flex flex-col gap-1 mb-2">
            <div
              v-for="prefix in settings.trustedPrefixes"
              :key="prefix"
              class="flex items-center gap-2 text-xs text-gray-300 bg-gray-800 rounded px-2 py-1"
            >
              <span class="flex-1 font-mono truncate">{{ prefix }}</span>
              <button class="text-red-400 hover:text-red-300 shrink-0" @click="settings.removeTrustedPrefix(prefix)">&times;</button>
            </div>
          </div>
          <div class="flex gap-2">
            <input
              v-model="newPrefix"
              class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs font-mono text-gray-200 outline-none focus:border-indigo-500"
              placeholder="https://example.com/"
              @keydown.enter="addPrefix"
            />
            <button class="px-3 py-1 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white" @click="addPrefix">Add</button>
          </div>
        </section>

        <!-- Editor -->
        <section class="mb-5">
          <h3 class="section-heading">Editor</h3>
          <label class="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" :checked="settings.defaultExpandAdvanced" class="w-4 h-4 accent-indigo-500" @change="settings.defaultExpandAdvanced = !settings.defaultExpandAdvanced" />
            Expand advanced fields by default
          </label>
          <label class="flex items-center gap-3 cursor-pointer text-sm text-gray-300 mt-2">
            <input type="checkbox" :checked="settings.stripPrefixOnExport" class="w-4 h-4 accent-indigo-500" @change="settings.stripPrefixOnExport = !settings.stripPrefixOnExport" />
            Strip instance prefix on export
          </label>
          <p class="text-xs text-gray-500 mt-1 ml-7">
            When on, element names are exported without the <code class="bg-gray-800 rounded px-1">instanceName.</code> prefix — cleaner Chub configs, but harder to debug when two recipes produce the same bare name (collisions get a numeric suffix).
          </p>
        </section>

        <!-- Data -->
        <section class="mb-5">
          <h3 class="section-heading">Data</h3>

          <p class="text-xs text-gray-400 mb-1 font-medium">Saved Drafts</p>
          <div v-if="Object.keys(draftsStore.slots).length === 0" class="text-xs text-gray-600 mb-2">No drafts saved.</div>
          <div v-else class="flex flex-col gap-1 mb-3">
            <div
              v-for="(slot, name) in draftsStore.slots"
              :key="name"
              class="flex items-center gap-2 text-xs bg-gray-800 rounded px-2 py-1"
            >
              <span class="flex-1 text-gray-300 truncate">{{ slot.name }}</span>
              <span class="text-gray-500">{{ new Date(slot.updatedAt).toLocaleDateString() }}</span>
              <button class="text-red-400 hover:text-red-300 shrink-0" @click="draftsStore.delete(name)">&times;</button>
            </div>
          </div>

          <p class="text-xs text-gray-400 mb-1 font-medium">Custom Recipes</p>
          <div v-if="recipesStore.customLibrary.length === 0" class="text-xs text-gray-600 mb-3">No custom recipes installed.</div>
          <div v-else class="flex flex-col gap-1 mb-3">
            <div
              v-for="def in recipesStore.customLibrary"
              :key="def.id"
              class="flex items-center gap-2 text-xs bg-gray-800 rounded px-2 py-1"
            >
              <span class="flex-1 text-gray-300 truncate">{{ def.name }}</span>
              <button class="text-red-400 hover:text-red-300 shrink-0" @click="recipesStore.removeCustomRecipe(def.id)">&times;</button>
            </div>
          </div>

          <div class="flex gap-2 flex-wrap">
            <button class="px-3 py-1 rounded text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700" @click="settings.clearScratchSlot()">Clear scratch slot</button>
            <button class="px-3 py-1 rounded text-xs bg-red-900/70 border border-red-700 text-red-300 hover:bg-red-800/70" @click="confirmReset">Reset all studio data…</button>
          </div>
          <p v-if="resetPending" class="text-xs text-red-400 mt-2">
            This will wipe all settings, drafts, recipes, and configs. Are you sure?
            <button class="underline ml-2" @click="settings.resetAll()">Yes, reset</button>
            <button class="underline ml-2 text-gray-400" @click="resetPending = false">Cancel</button>
          </p>
        </section>

        <div class="flex justify-end">
          <DialogClose class="px-3 py-1.5 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">Close</DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { useSettingsStore } from '../stores/settings'
import { useDraftsStore } from '../stores/drafts'
import { useRecipesStore } from '../stores/recipes'

const open = defineModel<boolean>('open', { default: false })

const settings = useSettingsStore()
const draftsStore = useDraftsStore()
const recipesStore = useRecipesStore()

const newPrefix = ref('')
const resetPending = ref(false)

function addPrefix() {
  settings.addTrustedPrefix(newPrefix.value.trim())
  newPrefix.value = ''
}

function confirmReset() {
  resetPending.value = true
}
</script>

<style scoped>
.section-heading {
  @apply text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2;
}
</style>
