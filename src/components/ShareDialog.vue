<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40" style="background: rgba(0,0,0,0.35); backdrop-filter: blur(4px)" />
      <DialogContent class="glass-panel fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 w-[480px] max-w-[90vw]">
        <DialogTitle class="text-gray-100 font-semibold mb-4">Share</DialogTitle>

        <!-- Tabs (only shown when a recipe instance is targeted) -->
        <div v-if="recipeInstanceId" class="flex gap-1 mb-4" style="border-bottom: 1px solid var(--glass-border)">
          <button
            class="tab-btn"
            :class="activeTab === 'config' ? 'tab-active' : 'tab-inactive'"
            @click="activeTab = 'config'"
          >Share config</button>
          <button
            v-if="isTemplateRecipe"
            class="tab-btn"
            :class="activeTab === 'recipe' ? 'tab-active' : 'tab-inactive'"
            @click="activeTab = 'recipe'"
          >Share recipe</button>
          <button
            v-else
            class="tab-btn tab-disabled"
            disabled
            title="Built-in recipes are shipped with the studio; no URL needed."
          >Share recipe</button>
        </div>

        <!-- Config share pane -->
        <template v-if="activeTab === 'config'">
          <div class="flex gap-2 mb-2">
            <input
              readonly
              :value="shareUrl"
              class="glass-input flex-1 rounded px-3 py-1.5 text-sm font-mono overflow-ellipsis"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <button class="btn-action" @click="copyConfig">{{ copyConfigLabel }}</button>
          </div>
          <p class="text-xs text-gray-500">{{ configByteSize }} bytes — fits in most chat apps</p>
        </template>

        <!-- Recipe share pane -->
        <template v-if="activeTab === 'recipe' && isTemplateRecipe">
          <div class="flex gap-2 mb-2">
            <input
              readonly
              :value="recipeShareUrl"
              class="glass-input flex-1 rounded px-3 py-1.5 text-sm font-mono overflow-ellipsis"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <button class="btn-action" @click="copyRecipe">{{ copyRecipeLabel }}</button>
          </div>
          <p class="text-xs text-gray-500">{{ recipeByteSize }} bytes — recipe definition only</p>
        </template>

        <!-- Disabled recipe hint -->
        <template v-if="activeTab === 'recipe' && !isTemplateRecipe && recipeInstanceId">
          <p class="text-sm text-gray-400">Built-in recipes are shipped with the studio; no URL needed.</p>
        </template>

        <DialogClose class="absolute top-4 right-4 text-gray-500 hover:text-gray-300 text-lg leading-none">&times;</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { buildShareUrl, buildRecipeShareUrl } from '../share/hydrate'
import { encodeRecipe } from '../share/recipe-encode'
import { useRecipesStore } from '../stores/recipes'
import { getRecipe } from '../recipes/registry'

const props = defineProps<{
  recipeInstanceId?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const activeTab = ref<'config' | 'recipe'>('config')

watch(() => props.recipeInstanceId, () => { activeTab.value = 'config' })

const recipesStore = useRecipesStore()

const targetInstance = computed(() =>
  props.recipeInstanceId
    ? recipesStore.instances.find((i) => i.id === props.recipeInstanceId)
    : undefined,
)

const targetRecipeDef = computed(() =>
  targetInstance.value ? getRecipe(targetInstance.value.recipeId) : undefined,
)

const isTemplateRecipe = computed(() => targetRecipeDef.value?.source.kind === 'template')

const shareUrl = computed(() => buildShareUrl())
const configByteSize = computed(() => new TextEncoder().encode(shareUrl.value).length)

const recipeShareUrl = computed(() => {
  const def = targetRecipeDef.value
  if (!def || def.source.kind !== 'template') return ''
  try {
    return buildRecipeShareUrl(encodeRecipe(def))
  } catch {
    return ''
  }
})
const recipeByteSize = computed(() => new TextEncoder().encode(recipeShareUrl.value).length)

const copyConfigLabel = ref('Copy')
const copyRecipeLabel = ref('Copy')

async function copyConfig() {
  if (typeof navigator === 'undefined') return
  await navigator.clipboard.writeText(shareUrl.value)
  copyConfigLabel.value = 'Copied!'
  setTimeout(() => { copyConfigLabel.value = 'Copy' }, 2000)
}

async function copyRecipe() {
  if (typeof navigator === 'undefined') return
  await navigator.clipboard.writeText(recipeShareUrl.value)
  copyRecipeLabel.value = 'Copied!'
  setTimeout(() => { copyRecipeLabel.value = 'Copy' }, 2000)
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1.5 rounded text-sm transition-colors shrink-0;
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  color: var(--accent);
}
.btn-action:hover {
  background: var(--glass-bg-hover);
}
.tab-btn {
  @apply px-4 py-2 text-sm border-b-2 -mb-px transition-colors;
}
.tab-active {
  border-color: var(--accent);
  color: var(--accent);
}
.tab-inactive {
  @apply border-transparent;
  color: var(--text-muted);
}
.tab-inactive:hover {
  color: var(--text-secondary);
}
.tab-disabled {
  @apply border-transparent cursor-not-allowed;
  color: var(--text-muted);
  opacity: 0.5;
}
</style>
