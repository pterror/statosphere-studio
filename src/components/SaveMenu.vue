<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <button class="btn-action">Save</button>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="bg-gray-900 border border-gray-700 rounded shadow-xl z-50 py-1 min-w-[220px]" :side-offset="4">
        <div class="px-3 py-2 border-b border-gray-800">
          <div class="flex gap-2">
            <input
              v-model="newName"
              class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              placeholder="Save as..."
              @keydown.enter="saveNew"
            />
            <button class="btn-save" :disabled="!newName.trim()" @click="saveNew">Save</button>
          </div>
        </div>
        <template v-if="slotList.length > 0">
          <div
            v-for="slot in slotList"
            :key="slot.name"
            class="group flex items-center gap-1 px-3 py-1.5 hover:bg-gray-800"
          >
            <template v-if="renamingSlot === slot.name">
              <input
                v-model="renameValue"
                class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-sm text-gray-200 focus:outline-none"
                @keydown.enter="commitRename(slot.name)"
                @keydown.escape="renamingSlot = null"
              />
              <button class="icon-btn" title="Confirm" @click="commitRename(slot.name)">OK</button>
            </template>
            <template v-else>
              <button class="flex-1 text-left text-sm text-gray-300 truncate" @click="loadSlot(slot.name)">
                {{ slot.name }}
              </button>
              <span class="text-xs text-gray-600 shrink-0">{{ humanize(slot.updatedAt) }}</span>
              <button class="icon-btn opacity-0 group-hover:opacity-100" title="Rename" @click="startRename(slot.name)">R</button>
              <button class="icon-btn opacity-0 group-hover:opacity-100 text-red-500" title="Delete" @click="deleteSlot(slot.name)">X</button>
            </template>
          </div>
        </template>
        <p v-else class="px-3 py-2 text-xs text-gray-600">No saved drafts.</p>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
} from 'reka-ui'
import { useConfigStore } from '../stores/config'
import { useDraftsStore } from '../stores/drafts'

const configStore = useConfigStore()
const draftsStore = useDraftsStore()

const newName = ref('')
const renamingSlot = ref<string | null>(null)
const renameValue = ref('')

const slotList = computed(() =>
  Object.values(draftsStore.slots).sort((a, b) => b.updatedAt - a.updatedAt),
)

function humanize(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function saveNew() {
  const name = newName.value.trim()
  if (!name) return
  draftsStore.save(name, configStore.config)
  newName.value = ''
}

function loadSlot(name: string) {
  const slot = draftsStore.load(name)
  if (slot) configStore.replace(slot.config)
}

function startRename(name: string) {
  renamingSlot.value = name
  renameValue.value = name
}

function commitRename(oldName: string) {
  const newNameVal = renameValue.value.trim()
  if (newNameVal && newNameVal !== oldName) {
    draftsStore.rename(oldName, newNameVal)
  }
  renamingSlot.value = null
}

function deleteSlot(name: string) {
  draftsStore.delete(name)
}
</script>

<style scoped>
.btn-action {
  @apply px-3 py-1 rounded text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors;
}
.btn-save {
  @apply px-2 py-1 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed;
}
.icon-btn {
  @apply px-1 text-xs text-gray-500 hover:text-gray-200 transition-colors;
}
</style>
