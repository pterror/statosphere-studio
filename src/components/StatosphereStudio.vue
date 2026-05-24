<template>
  <div
    class="flex flex-col text-gray-100 font-sans"
    :class="embedded ? 'h-[600px] relative' : 'h-screen'"
  >
    <TopBar v-if="!embedded" @toggle-browse="onToggleBrowse" @open-library-modal="libraryModalOpen = true" @open-history="historyBrowserOpen = true" />
    <!-- Recipe-install confirmation banner -->
    <div
      v-if="rcpBanner"
      class="flex items-center gap-3 px-4 py-2 bg-indigo-900/80 border-b border-indigo-700 text-sm text-indigo-100"
    >
      <span>Recipe "<strong>{{ rcpBanner.name }}</strong>" added to your library.</span>
      <button
        class="ml-auto px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
        @click="addInstanceNow"
      >Add an instance now</button>
      <button class="text-indigo-300 hover:text-white text-xs ml-2" aria-label="Dismiss" @click="rcpBanner = null">&times;</button>
    </div>
    <StreamCanvas ref="canvasRef" :class="embedded ? 'pt-0' : ''" @open-library-modal="libraryModalOpen = true" />
    <Toast />
    <!-- cmd-H history browser -->
    <HistoryBrowser v-if="historyBrowserOpen" @close="historyBrowserOpen = false" />
    <!-- cmd-K modal -->
    <Teleport to="body">
      <div v-if="libraryModalOpen" class="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" @mousedown.self="libraryModalOpen = false">
        <div class="fixed inset-0" style="background: rgba(0,0,0,0.35); backdrop-filter: blur(4px)" @mousedown="libraryModalOpen = false" />
        <div class="relative z-10 glass-panel w-[620px] max-w-[90vw] flex flex-col overflow-hidden">
          <RecipeLibrary display="modal" @add="onModalAdd" @close="libraryModalOpen = false" />
        </div>
      </div>
    </Teleport>
    <a
      v-if="embedded"
      :href="openInStudioUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="absolute bottom-2 right-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
    >Open in full studio &rarr;</a>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed, ref } from 'vue'
import TopBar from './TopBar.vue'
import StreamCanvas from './StreamCanvas.vue'
import RecipeLibrary from './RecipeLibrary.vue'
import Toast from './Toast.vue'
import HistoryBrowser from './HistoryBrowser.vue'
import { hydrateFromLocation } from '../share/hydrate'
import { encodeConfig, decodeConfig } from '../share/encode'
import { useConfigStore } from '../stores/config'
import { useRecipesStore } from '../stores/recipes'
import { useLintsStore } from '../stores/lints'
import { useSettingsStore } from '../stores/settings'
import { useHistoryStore } from '../stores/history'
import { registerRecipe } from '../recipes/registry'
import { useShortcuts } from '../composables/use-shortcuts'

const props = withDefaults(defineProps<{
  embedded?: boolean
  template?: string
  share?: string
  spaUrl?: string
}>(), {
  embedded: false,
  template: '',
  share: '',
  spaUrl: 'https://pterror.github.io/statosphere-studio/',
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let teardownShortcuts: (() => void) | null = null

const rcpBanner = ref<{ recipeId: string; name: string } | null>(null)
const libraryModalOpen = ref(false)
const historyBrowserOpen = ref(false)
const canvasRef = ref<InstanceType<typeof StreamCanvas> | null>(null)

function addInstanceNow() {
  if (!rcpBanner.value) return
  const recipesStore = useRecipesStore()
  recipesStore.addInstance(rcpBanner.value.recipeId)
  rcpBanner.value = null
}

function onToggleBrowse() {
  const recipesStore = useRecipesStore()
  if (recipesStore.instances.length === 0) {
    // Inline library is visible — focus its search input via the canvas ref
    // Best-effort: open modal as fallback since inline library doesn't have a direct focus ref here
    libraryModalOpen.value = true
  } else {
    canvasRef.value?.openBrowseStrip()
  }
}

function onModalAdd(recipeId: string) {
  const recipesStore = useRecipesStore()
  recipesStore.addInstance(recipeId)
  libraryModalOpen.value = false
}

const openInStudioUrl = computed(() => {
  if (typeof window === 'undefined') return props.spaUrl
  const configStore = useConfigStore()
  const recipesStore = useRecipesStore()
  const encoded = encodeConfig(configStore.config, {
    instances: recipesStore.instances,
    customLibrary: recipesStore.customLibrary,
  })
  return `${props.spaUrl}#cfg=${encoded}`
})

function applyTheme(t: 'light' | 'dark' | 'auto') {
  if (typeof document === 'undefined') return
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  const dark = t === 'dark' || (t === 'auto' && prefersDark)
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

onUnmounted(() => teardownShortcuts?.())

onMounted(() => {
  const configStore = useConfigStore()
  const recipesStore = useRecipesStore()
  const lintsStore = useLintsStore()
  const settingsStore = useSettingsStore()
  const historyStore = useHistoryStore()

  // Init history tree; pass initial instances snapshot as the root state reference.
  historyStore.init(recipesStore.snapshotInstances())

  function applyHistoryState(result: { ok: boolean; state: unknown }): void {
    if (result.ok) {
      recipesStore.restoreInstances(result.state as Parameters<typeof recipesStore.restoreInstances>[0])
    }
  }

  teardownShortcuts = useShortcuts({
    'meta+z': () => applyHistoryState(historyStore.undo(recipesStore.snapshotInstances())),
    'ctrl+z': () => applyHistoryState(historyStore.undo(recipesStore.snapshotInstances())),
    'meta+shift+z': () => applyHistoryState(historyStore.redo(recipesStore.snapshotInstances())),
    'ctrl+shift+z': () => applyHistoryState(historyStore.redo(recipesStore.snapshotInstances())),
    'meta+h': () => { historyBrowserOpen.value = !historyBrowserOpen.value },
    'ctrl+h': () => { historyBrowserOpen.value = !historyBrowserOpen.value },
  })

  applyTheme(settingsStore.theme)
  watch(() => settingsStore.theme, applyTheme)
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (mq) {
    mq.addEventListener('change', () => {
      if (settingsStore.theme === 'auto') applyTheme('auto')
    })
  }

  if (props.share) {
    try {
      const decoded = decodeConfig(props.share)
      if (decoded.sidecar) {
        for (const def of decoded.sidecar.customLibrary) {
          if (!recipesStore.customLibrary.find((d) => d.id === def.id)) {
            registerRecipe(def)
            recipesStore.customLibrary.push(def)
          }
        }
        recipesStore.instances.splice(0, recipesStore.instances.length, ...decoded.sidecar.instances)
      } else {
        configStore.replace(decoded.config)
      }
    } catch {
    }
  } else if (props.template) {
    // template prop maps to a builtin recipe id; unknown ids are warned and ignored
    const BUILTIN_IDS = ['hp-tracker', 'mood-companion', 'stamina-tracker', 'background-swapper',
      'npc-relationships', 'branching-scenario', 'inventory', 'mystery-game',
      'persistent-memory', 'time-of-day']
    if (BUILTIN_IDS.includes(props.template)) {
      recipesStore.addInstance(props.template)
    } else {
      console.warn(`[StatosphereStudio] Unknown template id "${props.template}" — rendering empty studio. Pass a builtin recipe id.`)
    }
  } else {
    if (typeof window !== 'undefined') {
      const result = hydrateFromLocation()
      if (result.kind === 'recipe') {
        rcpBanner.value = { recipeId: result.recipeId, name: result.recipeName }
      }
    }
  }

  lintsStore.recompute()

  watch(
    () => configStore.config,
    () => {
      if (debounceTimer !== null) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        lintsStore.recompute()
      }, 300)
    },
    { deep: true },
  )
})
</script>
