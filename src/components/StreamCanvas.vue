<template>
  <div class="flex flex-col flex-1 min-h-0">
    <!-- Empty state: inline library IS the canvas -->
    <template v-if="recipesStore.instances.length === 0">
      <div class="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 py-8">
        <div class="text-center mb-6">
          <h2 class="text-lg font-semibold text-gray-300">Add your first recipe</h2>
          <p class="text-sm text-gray-600 mt-1">Search or browse to get started.</p>
        </div>
        <RecipeLibrary display="inline" @add="addInstance" @close="() => {}" />
      </div>
    </template>

    <!-- Active canvas -->
    <template v-else>
      <BrowseStrip ref="browseStripRef" @add="addInstance" />
      <div class="flex flex-col flex-1 min-h-0 overflow-y-auto">
        <div class="flex flex-col gap-3 p-4">
          <RecipeBlock
            v-for="inst in recipesStore.instances"
            :key="inst.id"
            :instance="inst"
            @remove="recipesStore.removeInstance($event)"
            @change="configStore.markDirty()"
            @export-url="onExportUrl"
          />
          <button
            class="add-recipe-footer-card"
            @click="emit('open-library-modal')"
          >+ Add recipe…</button>
        </div>
        <JsonFooter />
      </div>
    </template>

    <ShareDialog v-model:open="shareDialogOpen" :recipe-instance-id="shareTargetInstanceId" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useRecipesStore } from '../stores/recipes'
import { useConfigStore } from '../stores/config'
import RecipeBlock from './RecipeBlock.vue'
import JsonFooter from './JsonFooter.vue'
import ShareDialog from './ShareDialog.vue'
import RecipeLibrary from './RecipeLibrary.vue'
import BrowseStrip from './BrowseStrip.vue'

const emit = defineEmits<{
  (e: 'open-library-modal'): void
}>()

const recipesStore = useRecipesStore()
const configStore = useConfigStore()

const shareDialogOpen = ref(false)
const shareTargetInstanceId = ref<string | undefined>(undefined)
const browseStripRef = ref<InstanceType<typeof BrowseStrip> | null>(null)

function onExportUrl(instanceId: string) {
  shareTargetInstanceId.value = instanceId
  shareDialogOpen.value = true
}

function addInstance(recipeId: string) {
  recipesStore.addInstance(recipeId)
  nextTick(() => {
    const blocks = document.querySelectorAll('[data-recipe-block]')
    blocks[blocks.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function openBrowseStrip() {
  browseStripRef.value?.open()
  nextTick(() => browseStripRef.value?.focusSearch())
}

defineExpose({ openBrowseStrip })
</script>

<style scoped>
.add-recipe-footer-card {
  @apply w-full py-3 rounded-lg border border-dashed border-gray-700 text-gray-500 text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-colors;
}
</style>
