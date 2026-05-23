<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40" style="background: rgba(0,0,0,0.35); backdrop-filter: blur(4px)" />
      <DialogContent class="glass-panel fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 w-[540px] max-w-[92vw] max-h-[85vh] overflow-y-auto">
        <DialogTitle class="text-gray-100 font-semibold mb-5 text-base">Settings</DialogTitle>

        <!-- Appearance -->
        <section class="mb-5">
          <h3 class="section-heading">Appearance</h3>
          <div class="flex gap-2 mb-3">
            <button
              v-for="t in (['light', 'dark', 'auto'] as const)"
              :key="t"
              class="glass-button px-3 py-1 rounded text-sm"
              :data-tone="settings.theme === t ? 'accent' : undefined"
              @click="settings.setTheme(t)"
            >{{ t }}</button>
          </div>
          <label class="flex items-center gap-3 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" :checked="settings.reducedMotion" class="w-4 h-4 accent-indigo-500" @change="settings.reducedMotion = !settings.reducedMotion" />
            Reduce motion
          </label>
          <p class="text-xs text-gray-500 mt-1 ml-7">Disable drag-and-drop animations and transitions.</p>
        </section>

        <!-- Imports -->
        <section class="mb-5">
          <h3 class="section-heading">Trusted Import Prefixes</h3>
          <div class="flex flex-col gap-1 mb-2">
            <div
              v-for="prefix in settings.trustedPrefixes"
              :key="prefix"
              class="flex items-center gap-2 text-xs rounded px-2 py-1 glass-panel-soft" style="color: var(--text-secondary)"
            >
              <span class="flex-1 font-mono truncate">{{ prefix }}</span>
              <button class="text-red-400 hover:text-red-300 shrink-0" @click="settings.removeTrustedPrefix(prefix)">&times;</button>
            </div>
          </div>
          <div class="flex gap-2">
            <input
              v-model="newPrefix"
              class="glass-input flex-1 rounded px-2 py-1 text-xs font-mono"
              placeholder="https://example.com/"
              @keydown.enter="addPrefix"
            />
            <button class="glass-button px-3 py-1 rounded text-xs" data-tone="accent" @click="addPrefix">Add</button>
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
              class="flex items-center gap-2 text-xs rounded px-2 py-1 glass-panel-soft"
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
              class="flex items-center gap-2 text-xs rounded px-2 py-1 glass-panel-soft"
            >
              <span class="flex-1 text-gray-300 truncate">{{ def.name }}</span>
              <button class="text-red-400 hover:text-red-300 shrink-0" @click="recipesStore.removeCustomRecipe(def.id)">&times;</button>
            </div>
          </div>

          <p class="text-xs text-gray-500 mb-2">Export your studio state first if you want a backup.</p>
          <div class="flex gap-2 flex-wrap">
            <button class="glass-button px-3 py-1 rounded text-xs" @click="settings.clearScratchSlot()">Clear scratch slot</button>
            <button class="glass-button px-3 py-1 rounded text-xs" @click="exportEverything">Export everything…</button>
            <button ref="importBtn" class="glass-button px-3 py-1 rounded text-xs" @click="importBundleClick">Import bundle…</button>
            <button ref="resetBtn" class="px-3 py-1 rounded text-xs border border-red-700 text-red-300 hover:bg-red-900/30" style="background: rgba(127,29,29,0.4)" @click="resetPopoverOpen = true">Reset all studio data…</button>
          </div>

          <input ref="fileInput" type="file" accept=".json" class="hidden" @change="onFileChange" />
        </section>

        <div class="flex justify-end">
          <DialogClose class="glass-button px-3 py-1.5 rounded text-sm">Close</DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>

  <!-- Reset confirm -->
  <ConfirmPopover
    :anchor="resetBtn"
    :open="resetPopoverOpen"
    prompt="This wipes settings, drafts, recipes, and configs."
    confirmLabel="Yes, reset"
    tone="danger"
    @update:open="resetPopoverOpen = $event"
    @confirm="settings.resetAll()"
    @cancel="resetPopoverOpen = false"
  />

  <!-- Import merge/replace choice -->
  <ConfirmPopover
    :anchor="importBtn"
    :open="importPopoverOpen"
    prompt="Merge with existing data, or replace everything?"
    confirmLabel="Replace"
    cancelLabel="Cancel"
    tone="danger"
    :extraAction="{ label: 'Merge', onClick: applyMerge }"
    @update:open="importPopoverOpen = $event"
    @confirm="startReplace"
    @cancel="importPopoverOpen = false"
  />

  <!-- Replace second confirm -->
  <ConfirmPopover
    :anchor="importBtn"
    :open="replaceConfirmOpen"
    prompt="Replace will overwrite all settings, drafts, recipes, and configs. Sure?"
    confirmLabel="Yes, replace"
    tone="danger"
    @update:open="replaceConfirmOpen = $event"
    @confirm="applyReplace"
    @cancel="replaceConfirmOpen = false"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { useSettingsStore } from '../stores/settings'
import { useDraftsStore } from '../stores/drafts'
import { useRecipesStore } from '../stores/recipes'
import { useToastStore } from '../stores/toast'
import { useHistoryStore } from '../stores/history'
import ConfirmPopover from './ConfirmPopover.vue'
import type { RecipeInstance, RecipeDef } from '../recipes/types'
import type { DraftSlot } from '../stores/drafts'

const open = defineModel<boolean>('open', { default: false })

const settings = useSettingsStore()
const draftsStore = useDraftsStore()
const recipesStore = useRecipesStore()
const toastStore = useToastStore()
const historyStore = useHistoryStore()

const newPrefix = ref('')
const resetBtn = ref<HTMLElement | null>(null)
const resetPopoverOpen = ref(false)

const importBtn = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const importPopoverOpen = ref(false)
const replaceConfirmOpen = ref(false)

let pendingBundle: BundlePayload | null = null

interface BundlePayload {
  version: 'studio-export-1'
  exportedAt: string
  recipes: RecipeInstance[]
  customLibrary: RecipeDef[]
  drafts: DraftSlot[]
  settings: ReturnType<typeof settings.export>
}

function addPrefix() {
  settings.addTrustedPrefix(newPrefix.value.trim())
  newPrefix.value = ''
}

function exportEverything() {
  const date = new Date().toISOString().slice(0, 10)
  const payload: BundlePayload = {
    version: 'studio-export-1',
    exportedAt: new Date().toISOString(),
    recipes: structuredClone(recipesStore.instances),
    customLibrary: structuredClone(recipesStore.customLibrary),
    drafts: structuredClone(draftsStore.list),
    settings: settings.export(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `statosphere-studio-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
  toastStore.show('Exported studio bundle.')
}

function importBundleClick() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(e.target as HTMLInputElement).value = ''
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target!.result as string)
      if (parsed.version !== 'studio-export-1') {
        toastStore.show('Invalid bundle: unrecognized version.', { durationMs: 5000 })
        return
      }
      pendingBundle = parsed as BundlePayload
      importPopoverOpen.value = true
    } catch {
      toastStore.show('Failed to parse bundle file.', { durationMs: 5000 })
    }
  }
  reader.readAsText(file)
}

function applyMerge() {
  if (!pendingBundle) return
  const before = recipesStore.snapshotInstances()
  const bundle = pendingBundle
  pendingBundle = null

  recipesStore.mergeFrom(bundle.recipes, bundle.customLibrary)
  draftsStore.mergeSlots(bundle.drafts)
  settings.importSettings(bundle.settings)

  historyStore.commit(before, recipesStore.snapshotInstances(), 'Imported bundle')
  toastStore.show('Imported studio bundle (merged).')
}

function startReplace() {
  importPopoverOpen.value = false
  replaceConfirmOpen.value = true
}

function applyReplace() {
  if (!pendingBundle) return
  const before = recipesStore.snapshotInstances()
  const bundle = pendingBundle
  pendingBundle = null

  recipesStore.replaceFrom(bundle.recipes, bundle.customLibrary)
  draftsStore.replaceSlots(bundle.drafts)
  settings.importSettings(bundle.settings)

  historyStore.commit(before, recipesStore.snapshotInstances(), 'Imported bundle (replaced)')
  toastStore.show('Imported studio bundle (replaced).')
}
</script>

<style scoped>
.section-heading {
  @apply text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2;
}
</style>
