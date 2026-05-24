<template>
  <div class="flex flex-col flex-1 min-h-0 relative">
    <!-- File drop overlay -->
    <Teleport to="body">
      <div
        v-if="fileDragActive"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none"
      >
        <div class="border-2 border-dashed border-indigo-400 rounded-xl px-12 py-8 text-center">
          <div class="text-indigo-200 text-lg font-semibold">Drop JSON to import</div>
          <div class="text-indigo-400 text-sm mt-1">Config or recipe JSON accepted</div>
        </div>
      </div>
    </Teleport>

    <!-- Empty state: inline library IS the canvas -->
    <template v-if="recipesStore.instances.length === 0">
      <div
        class="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 py-4"
        v-bind="fileDropTarget"
        @dragenter="onCanvasDragEnter"
        @dragleave="onCanvasFileDragLeave"
      >
        <div class="w-full max-w-2xl mx-auto" style="max-height: 50vh; min-height: 0; display: flex; flex-direction: column;">
          <RecipeLibrary display="inline" @add="addInstance" @close="() => {}" />
        </div>
      </div>
    </template>

    <!-- Active canvas -->
    <template v-else>
      <BrowseStrip ref="browseStripRef" @add="addInstance" />
      <div
        class="flex flex-col flex-1 min-h-0 overflow-y-auto"
        v-bind="fileDropTarget"
        @dragenter="onCanvasDragEnter"
        @dragleave="onCanvasFileDragLeave"
      >
        <div class="flex flex-col canvas-blocks-inner p-4">
          <!-- Top drop zone -->
          <DropZone
            :index="0"
            :active-drop-index="activeDropIndex"
            :dragging-instance-id="draggingInstanceId"
            :reduced-motion="settingsStore.reducedMotion"
            @drop-at="onBlockDrop"
            @hover-at="activeDropIndex = $event"
            @leave="activeDropIndex = undefined"
          />

          <template v-for="(inst, i) in recipesStore.instances" :key="inst.id">
            <RecipeBlock
              :instance="inst"
              :class="{ 'opacity-30': draggingInstanceId === inst.id }"
              :style="{ transition: settingsStore.reducedMotion ? 'none' : 'opacity 150ms ease-out' }"
              @remove="recipesStore.removeInstance($event)"
              @change="configStore.markDirty()"
              @export-url="onExportUrl"
              @element-drop="onElementDrop"
            />
            <DropZone
              :index="i + 1"
              :active-drop-index="activeDropIndex"
              :dragging-instance-id="draggingInstanceId"
              :reduced-motion="settingsStore.reducedMotion"
              @drop-at="onBlockDrop"
              @hover-at="activeDropIndex = $event"
              @leave="activeDropIndex = undefined"
            />
          </template>

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
import { ref, nextTick, defineComponent, h } from 'vue'
import { useRecipesStore } from '../stores/recipes'
import { useConfigStore } from '../stores/config'
import { useSettingsStore } from '../stores/settings'
import { useToastStore } from '../stores/toast'
import RecipeBlock from './RecipeBlock.vue'
import JsonFooter from './JsonFooter.vue'
import ShareDialog from './ShareDialog.vue'
import RecipeLibrary from './RecipeLibrary.vue'
import BrowseStrip from './BrowseStrip.vue'
import { makeDropTarget, currentDrag } from '../composables/use-dnd'
import type { DragPayload } from '../composables/use-dnd'
import { decodeRecipe } from '../share/recipe-encode'

const emit = defineEmits<{
  (e: 'open-library-modal'): void
}>()

const recipesStore = useRecipesStore()
const configStore = useConfigStore()
const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const shareDialogOpen = ref(false)
const shareTargetInstanceId = ref<string | undefined>(undefined)
const browseStripRef = ref<InstanceType<typeof BrowseStrip> | null>(null)
const activeDropIndex = ref<number | undefined>(undefined)
const draggingInstanceId = ref<string | undefined>(undefined)
const fileDragActive = ref(false)

function showToast(msg: string) {
  toastStore.show(msg)
}

function onExportUrl(instanceId: string) {
  shareTargetInstanceId.value = instanceId
  shareDialogOpen.value = true
}

function addInstance(recipeId: string, atIndex?: number) {
  recipesStore.addInstance(recipeId, atIndex)
  nextTick(() => {
    const blocks = document.querySelectorAll('[data-recipe-block]')
    const idx = atIndex !== undefined ? atIndex : blocks.length - 1
    blocks[Math.min(idx, blocks.length - 1)]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function onBlockDrop(payload: DragPayload, index: number) {
  activeDropIndex.value = undefined
  draggingInstanceId.value = undefined
  if (payload.kind === 'recipe-card' || payload.kind === 'atom-card') {
    addInstance(payload.recipeId, index)
  } else if (payload.kind === 'block') {
    const curIdx = recipesStore.instances.findIndex((i) => i.id === payload.instanceId)
    if (curIdx === -1) return
    const adjustedIndex = curIdx < index ? index - 1 : index
    if (adjustedIndex === curIdx) return
    recipesStore.reorderInstance(payload.instanceId, adjustedIndex)
  }
}

function onElementDrop(sourceInstanceId: string, targetInstanceId: string, elementType: string, elementName: string) {
  recipesStore.moveElement(sourceInstanceId, '', targetInstanceId, '', elementType as any, elementName)
  configStore.markDirty()
}

// File drop on canvas
const fileDropTarget = makeDropTarget({
  accept: ['file'],
  onDrop: (p) => {
    fileDragActive.value = false
    if (p.kind !== 'file') return
    handleFileDrop(p.file)
  },
  onOver: () => { fileDragActive.value = true },
  onLeave: () => { fileDragActive.value = false },
})

function onCanvasDragEnter(e: DragEvent) {
  if (e.dataTransfer?.types.includes('Files')) fileDragActive.value = true
}

function onCanvasFileDragLeave(e: DragEvent) {
  const related = e.relatedTarget as Node | null
  if (!related || !(e.currentTarget as Element).contains(related)) {
    fileDragActive.value = false
  }
}

async function handleFileDrop(file: File) {
  let text: string
  try {
    text = await file.text()
  } catch {
    showToast('Could not read file.')
    return
  }
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch {
    showToast("Couldn't parse JSON as a config or recipe.")
    return
  }
  // Detect serialized recipe (has source.kind)
  if (parsed && typeof parsed === 'object' && parsed.source?.kind) {
    try {
      const def = parsed as import('../recipes/types').RecipeDef
      recipesStore.addCustomRecipe(def)
      showToast(`Recipe "${def.name}" added to your library.`)
      return
    } catch { /* fall through */ }
  }
  // Detect rcp= encoded or plain config (has variables/classifiers/etc.)
  if (parsed && typeof parsed === 'object' && (parsed.variables || parsed.classifiers || parsed.generators || parsed.contentRules || parsed.functions)) {
    try {
      configStore.replace(parsed)
      configStore.markDirty()
      return
    } catch { /* fall through */ }
  }
  showToast("Couldn't parse JSON as a config or recipe.")
}

// Track dragging instance for opacity dimming
import { watch } from 'vue'
watch(currentDrag, (drag) => {
  if (drag?.kind === 'block') {
    draggingInstanceId.value = drag.instanceId
  } else {
    draggingInstanceId.value = undefined
  }
})

function openBrowseStrip() {
  browseStripRef.value?.open()
  nextTick(() => browseStripRef.value?.focusSearch())
}

defineExpose({ openBrowseStrip })

// DropZone inline component
const DropZone = defineComponent({
  props: {
    index: { type: Number, required: true },
    activeDropIndex: { type: Number, default: null },
    draggingInstanceId: { type: String, default: null },
    reducedMotion: { type: Boolean, default: false },
  },
  emits: ['drop-at', 'hover-at', 'leave'],
  setup(props, { emit: emitLocal }) {
    const isActive = ref(false)

    const dropTarget = makeDropTarget({
      accept: ['recipe-card', 'atom-card', 'block'],
      onDrop: (p, _e) => {
        isActive.value = false
        emitLocal('drop-at', p, props.index)
      },
      onOver: () => {
        isActive.value = true
        emitLocal('hover-at', props.index)
      },
      onLeave: () => {
        isActive.value = false
        emitLocal('leave')
      },
    })

    return () => {
      const dur = props.reducedMotion ? '0ms' : '150ms'
      return h('div', {
        ...dropTarget,
        style: {
          height: isActive.value ? '28px' : '4px',
          transition: `height ${dur} ease-out`,
          margin: '2px 0',
          borderRadius: '4px',
          position: 'relative',
          overflow: 'visible',
        },
      }, isActive.value ? [
        h('div', {
          style: {
            position: 'absolute',
            inset: '0',
            background: 'rgba(99,102,241,0.08)',
            borderRadius: '4px',
            border: '1px solid rgba(99,102,241,0.4)',
            boxShadow: '0 0 8px 2px rgba(99,102,241,0.2)',
            display: 'flex',
            alignItems: 'center',
          },
        }, [
          h('div', {
            style: {
              height: '2px',
              flex: '1',
              background: 'rgba(99,102,241,0.7)',
              borderRadius: '1px',
              margin: '0 4px',
            },
          }),
        ]),
      ] : [])
    }
  },
})
</script>

<style scoped>
.add-recipe-footer-card {
  @apply w-full py-3 rounded-lg border border-dashed border-gray-700 text-gray-500 text-sm hover:border-indigo-500/50 hover:text-indigo-400 transition-colors;
}

@media (max-width: 480px) {
  .canvas-blocks-inner {
    padding: 0.5rem;
  }
}
</style>
