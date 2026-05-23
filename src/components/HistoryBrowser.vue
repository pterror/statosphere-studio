<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      @mousedown.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <div class="fixed inset-0" style="background: rgba(0,0,0,0.40); backdrop-filter: blur(4px)" @mousedown="emit('close')" />
      <div
        class="glass-panel relative z-10 flex flex-col history-browser-modal"
        @mousedown.stop
        @keydown.esc.stop="emit('close')"
        @keydown.up.prevent="moveSelection(-1)"
        @keydown.down.prevent="moveSelection(1)"
        @keydown.enter.prevent="jumpToSelected"
        @keydown.f2.prevent="beginRenameSelected"
        @keydown.delete.prevent="onDeleteKey"
        tabindex="0"
        ref="browserEl"
      >
        <!-- Header -->
        <div class="flex items-center px-4 py-2 shrink-0" style="border-bottom: 1px solid var(--glass-border)">
          <span class="font-semibold text-sm" style="color: var(--text-primary)">History</span>
          <span class="ml-2 text-xs" style="color: var(--text-muted)">⌘H to close</span>
          <button
            class="ml-auto text-lg leading-none"
            style="color: var(--text-muted)"
            @click="emit('close')"
          >&times;</button>
        </div>

        <!-- Body: two-column layout -->
        <div class="flex flex-1 min-h-0 history-body">
          <!-- Left: tree pane -->
          <div class="flex flex-col history-tree-pane" style="border-right: 1px solid var(--glass-border)">
            <!-- Search -->
            <div class="px-3 py-2 shrink-0" style="border-bottom: 1px solid var(--glass-border)">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search history…"
                class="glass-input w-full text-xs"
                @keydown.stop
              />
            </div>
            <!-- Tree rows -->
            <div class="flex-1 overflow-y-auto py-1" ref="treeEl">
              <div
                v-for="row in visibleRows"
                :key="row.node.id"
                class="history-row glass-row"
                :class="{
                  'history-row-current': row.node.id === historyStore.currentId,
                  'history-row-selected': row.node.id === selectedId,
                  'history-row-on-path': row.onCurrentPath,
                  'history-row-dimmed': searchQuery && !row.matchesSearch,
                }"
                @click="selectRow(row.node.id)"
                @dblclick="jumpToSelected"
              >
                <!-- Indentation + connectors -->
                <span class="history-indent" :style="{ width: row.depth * 16 + 'px' }" />
                <span class="history-connector font-mono text-xs" style="color: var(--text-muted); width: 12px; shrink-0">{{ row.connector }}</span>

                <!-- Inline rename input -->
                <template v-if="renamingId === row.node.id">
                  <input
                    ref="renameInputRef"
                    v-model="renameValue"
                    type="text"
                    class="glass-input flex-1 text-xs h-5 py-0"
                    @keydown.enter.stop.prevent="commitRename"
                    @keydown.esc.stop.prevent="cancelRename"
                    @blur="commitRename"
                    @click.stop
                  />
                </template>
                <template v-else>
                  <!-- Time -->
                  <span class="text-xs shrink-0 mr-1" style="color: var(--text-muted)">{{ formatTime(row.node.timestamp) }}</span>
                  <!-- Label -->
                  <span
                    class="flex-1 text-xs truncate"
                    :class="row.node.label ? 'font-semibold' : ''"
                    style="color: var(--text-primary)"
                  >{{ row.node.label ?? patchSummary(row.node) }}</span>
                  <!-- ID stub -->
                  <span class="text-xs shrink-0 ml-1 font-mono" style="color: var(--text-muted)">{{ row.node.id.slice(0, 4) }}</span>
                  <!-- Rename pencil -->
                  <button
                    class="history-action-btn ml-1 shrink-0"
                    title="Rename (F2)"
                    @click.stop="beginRename(row.node.id)"
                  >✎</button>
                </template>
              </div>
              <div v-if="visibleRows.length === 0" class="px-4 py-8 text-center text-xs" style="color: var(--text-muted)">
                No history nodes found.
              </div>
            </div>
          </div>

          <!-- Right: preview pane -->
          <div class="flex flex-col history-preview-pane">
            <div class="flex items-center gap-2 px-3 py-2 shrink-0" style="border-bottom: 1px solid var(--glass-border)">
              <span class="text-xs font-semibold" style="color: var(--text-secondary)">
                {{ selectedNode?.label ?? (selectedNode ? patchSummary(selectedNode) : 'No selection') }}
              </span>
              <div class="ml-auto flex gap-2">
                <button
                  class="glass-button text-xs py-0.5 px-2"
                  data-tone="accent"
                  :disabled="!selectedId"
                  :class="!selectedId ? 'opacity-40 cursor-not-allowed' : ''"
                  @click="jumpToSelected"
                  title="Jump to this state"
                >Jump here</button>
                <button
                  v-if="selectedId && !isOnCurrentPath(selectedId)"
                  class="glass-button text-xs py-0.5 px-2"
                  style="border-color: rgba(185,28,28,0.5); color: #fca5a5"
                  @click="requestDeleteBranch"
                  title="Delete this branch"
                  ref="deleteAnchorRef"
                >Delete branch</button>
              </div>
            </div>
            <!-- Preview JSON -->
            <div class="flex-1 overflow-y-auto p-3">
              <pre v-if="selectedNode" class="text-xs whitespace-pre-wrap break-words history-preview-pre">{{ previewJson }}</pre>
              <div v-else class="text-xs" style="color: var(--text-muted)">Select a node to preview its patch.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Delete branch confirm (inline, not using ConfirmPopover anchor since we're in Teleport) -->
      <div
        v-if="deleteConfirmOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center"
        @mousedown.self="deleteConfirmOpen = false"
      >
        <div class="glass-panel p-5 flex flex-col gap-3" style="width: 280px">
          <p class="text-sm" style="color: var(--text-secondary)">
            Delete this branch and {{ subtreeSize }} descendant{{ subtreeSize !== 1 ? 's' : '' }}?
          </p>
          <div class="flex justify-end gap-2">
            <button class="glass-button text-xs py-1 px-3" @click="deleteConfirmOpen = false">Cancel</button>
            <button
              class="glass-button text-xs py-1 px-3"
              style="border-color: rgba(185,28,28,0.5); color: #fca5a5"
              @click="confirmDeleteBranch"
            >Delete</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useHistoryStore } from '../stores/history'
import { useRecipesStore } from '../stores/recipes'
import { useToastStore } from '../stores/toast'
import type { HistoryNode } from '../stores/history'

const emit = defineEmits<{ (e: 'close'): void }>()

const historyStore = useHistoryStore()
const recipesStore = useRecipesStore()
const toastStore = useToastStore()

const browserEl = ref<HTMLElement | null>(null)
const treeEl = ref<HTMLElement | null>(null)
const renameInputRef = ref<HTMLInputElement | null>(null)
const deleteAnchorRef = ref<HTMLElement | null>(null)

const selectedId = ref<string>(historyStore.currentId)
const searchQuery = ref('')
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const deleteConfirmOpen = ref(false)
const subtreeSize = ref(0)

onMounted(() => {
  nextTick(() => browserEl.value?.focus())
})

// ── Tree flattening ──────────────────────────────────────────────────────────

interface TreeRow {
  node: HistoryNode
  depth: number
  connector: string
  onCurrentPath: boolean
  matchesSearch: boolean
}

// Build set of ancestor IDs for currentId (the "current path")
const currentPathSet = computed<Set<string>>(() => {
  const set = new Set<string>()
  let cur: string | undefined = historyStore.currentId
  while (cur) {
    set.add(cur)
    const node = historyStore.nodes.get(cur)
    cur = node?.parentId
  }
  return set
})

function isOnCurrentPath(id: string): boolean {
  return currentPathSet.value.has(id)
}

// DFS traversal to produce flat row list with depth and connector info
const allRows = computed<TreeRow[]>(() => {
  const rows: TreeRow[] = []
  const children = historyStore.childrenOf

  function visit(id: string, depth: number, isLast: boolean) {
    const node = historyStore.nodes.get(id)
    if (!node) return
    const connector = depth === 0 ? '○' : isLast ? '└' : '├'
    rows.push({
      node,
      depth,
      connector,
      onCurrentPath: currentPathSet.value.has(id),
      matchesSearch: matchesSearch(node),
    })
    const kids = children[id] ?? []
    for (let i = 0; i < kids.length; i++) {
      visit(kids[i], depth + 1, i === kids.length - 1)
    }
  }

  if (historyStore.rootId) {
    visit(historyStore.rootId, 0, true)
  }

  return rows
})

const query = computed(() => searchQuery.value.toLowerCase().trim())

function matchesSearch(node: HistoryNode): boolean {
  if (!query.value) return true
  const label = (node.label ?? '').toLowerCase()
  const summary = patchSummary(node).toLowerCase()
  return label.includes(query.value) || summary.includes(query.value)
}

// When searching, dim non-matching rows but keep them for structure
const visibleRows = computed<TreeRow[]>(() => {
  return allRows.value.map((r) => ({
    ...r,
    matchesSearch: matchesSearch(r.node),
  }))
})

// ── Utilities ────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function patchSummary(node: HistoryNode): string {
  if (!node.patch || node.patch.length === 0) return 'Initial state'
  const adds = node.patch.filter((op: any) => op.op === 'add').length
  const removes = node.patch.filter((op: any) => op.op === 'remove').length
  const replaces = node.patch.filter((op: any) => op.op === 'replace').length
  const firstPath = (node.patch[0] as any)?.path ?? ''
  const parts: string[] = []
  if (adds) parts.push(`+${adds}`)
  if (removes) parts.push(`-${removes}`)
  if (replaces) parts.push(`~${replaces}`)
  return parts.length ? `${parts.join(' ')} @ ${firstPath}` : firstPath || 'change'
}

// ── Selection ────────────────────────────────────────────────────────────────

const selectedNode = computed<HistoryNode | undefined>(() => {
  return selectedId.value ? historyStore.nodes.get(selectedId.value) : undefined
})

const previewJson = computed<string>(() => {
  if (!selectedNode.value) return ''
  const node = selectedNode.value
  return JSON.stringify({ patch: node.patch, inversePatch: node.inversePatch }, null, 2)
})

function selectRow(id: string) {
  selectedId.value = id
}

function moveSelection(delta: number) {
  const rows = visibleRows.value
  if (!rows.length) return
  const idx = rows.findIndex((r) => r.node.id === selectedId.value)
  const next = Math.max(0, Math.min(rows.length - 1, idx + delta))
  selectedId.value = rows[next].node.id
}

// ── Jump ─────────────────────────────────────────────────────────────────────

function jumpToSelected() {
  if (!selectedId.value) return
  const result = historyStore.jump(recipesStore.snapshotInstances(), selectedId.value)
  if (result.ok) {
    recipesStore.restoreInstances(result.state as Parameters<typeof recipesStore.restoreInstances>[0])
  }
}

// ── Rename ───────────────────────────────────────────────────────────────────

function beginRename(id: string) {
  const node = historyStore.nodes.get(id)
  if (!node) return
  renamingId.value = id
  renameValue.value = node.label ?? ''
  nextTick(() => renameInputRef.value?.focus())
}

function beginRenameSelected() {
  if (selectedId.value) beginRename(selectedId.value)
}

function commitRename() {
  if (!renamingId.value) return
  historyStore.rename(renamingId.value, renameValue.value.trim())
  renamingId.value = null
}

function cancelRename() {
  renamingId.value = null
}

// ── Delete branch ────────────────────────────────────────────────────────────

function countSubtree(id: string): number {
  const children = historyStore.childrenOf[id] ?? []
  return 1 + children.reduce((acc, cid) => acc + countSubtree(cid), 0)
}

function requestDeleteBranch() {
  if (!selectedId.value) return
  if (isOnCurrentPath(selectedId.value)) {
    toastStore.show('Cannot delete — node is on the current path.')
    return
  }
  subtreeSize.value = countSubtree(selectedId.value) - 1 // exclude the node itself from "descendants"
  deleteConfirmOpen.value = true
}

function onDeleteKey() {
  if (!selectedId.value) return
  if (isOnCurrentPath(selectedId.value)) return
  requestDeleteBranch()
}

function confirmDeleteBranch() {
  if (!selectedId.value) return
  const ok = historyStore.deleteBranch(selectedId.value)
  deleteConfirmOpen.value = false
  if (!ok) {
    toastStore.show('Could not delete branch — it may be on the current path.')
  } else {
    selectedId.value = historyStore.currentId
  }
}

// Keep selectedId valid if it gets deleted
watch(() => historyStore.nodes, () => {
  if (selectedId.value && !historyStore.nodes.has(selectedId.value)) {
    selectedId.value = historyStore.currentId
  }
}, { deep: false })
</script>

<style scoped>
.history-browser-modal {
  width: min(92vw, 860px);
  height: min(85vh, 620px);
}

.history-body {
  min-height: 0;
}

.history-tree-pane {
  width: 50%;
  min-width: 240px;
  flex-shrink: 0;
}

.history-preview-pane {
  flex: 1;
  min-width: 0;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 4px;
  margin: 0 4px;
  min-height: 24px;
}

.history-row-current {
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  border-radius: 4px;
}

.history-row-selected {
  background: var(--glass-bg-hover);
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

.history-row-on-path {
  color: var(--text-primary);
}

.history-row-dimmed {
  opacity: 0.35;
}

.history-indent {
  display: inline-block;
  flex-shrink: 0;
}

.history-connector {
  flex-shrink: 0;
  display: inline-block;
}

.history-action-btn {
  opacity: 0;
  font-size: 0.7rem;
  padding: 0 2px;
  border-radius: 3px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  line-height: 1;
}
.history-row:hover .history-action-btn {
  opacity: 1;
}
.history-action-btn:hover {
  color: var(--text-primary);
  background: var(--glass-bg-hover);
}

.history-preview-pre {
  font-family: monospace;
  color: var(--text-secondary);
  background: transparent;
  font-size: 0.7rem;
  line-height: 1.5;
}

/* Narrow viewport: stack columns vertically */
@media (max-width: 700px) {
  .history-body {
    flex-direction: column;
  }
  .history-tree-pane {
    width: 100%;
    max-height: 50%;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
  }
  .history-preview-pane {
    max-height: 50%;
  }
}
</style>
