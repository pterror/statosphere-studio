/**
 * Tree-shaped history store with IndexedDB persistence and JSON-Patch deltas.
 * Replaces the linear undo stack in src/stores/undo.ts.
 *
 * Domain model:
 *   HistoryNode = { id, parentId?, patch, inversePatch, timestamp, label? }
 *   Tree: nodes Map + rootId + currentId
 *   Children index: childrenOf record (newest child = default redo branch)
 *
 * The store diffs RecipeInstance[] snapshots using json-patch.ts.
 * The live state is managed by restoring instances via the recipes store.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Patch } from '../lib/json-patch'
import { diff, apply, invert } from '../lib/json-patch'
import { getAll, put, deleteRecord, getMeta, putMeta, STORE_NODES } from '../lib/indexed-db'

export interface HistoryNode {
  id: string
  parentId?: string
  patch: Patch
  inversePatch: Patch
  timestamp: number
  label?: string
}

export const useHistoryStore = defineStore('history', () => {
  const nodes = ref<Map<string, HistoryNode>>(new Map())
  const rootId = ref<string>('')
  const currentId = ref<string>('')

  // Children index: parentId → [childId, ...] ordered oldest→newest (last = default redo)
  const childrenOf = computed<Record<string, string[]>>(() => {
    const index: Record<string, string[]> = {}
    for (const node of nodes.value.values()) {
      if (node.parentId !== undefined) {
        if (!index[node.parentId]) index[node.parentId] = []
        index[node.parentId].push(node.id)
      }
    }
    return index
  })

  const canUndo = computed(() => currentId.value !== '' && currentId.value !== rootId.value)
  const canRedo = computed(() => (childrenOf.value[currentId.value]?.length ?? 0) > 0)

  // ── Persistence helpers ────────────────────────────────────────────────

  function persistNode(node: HistoryNode): void {
    put(STORE_NODES, node).catch(console.error)
  }

  function persistCurrentId(id: string): void {
    putMeta('currentNodeId', id).catch(console.error)
  }

  // ── Init ───────────────────────────────────────────────────────────────

  async function init(initialState: unknown): Promise<void> {
    // Load tree from IndexedDB
    let loaded: HistoryNode[] = []
    try {
      loaded = await getAll<HistoryNode>(STORE_NODES)
    } catch {
      // IndexedDB unavailable (e.g., SSR/test env) — start fresh
    }

    if (loaded.length === 0) {
      // First run: create root node
      const rootNode: HistoryNode = {
        id: crypto.randomUUID(),
        patch: [],
        inversePatch: [],
        timestamp: Date.now(),
        label: 'Initial state',
      }
      nodes.value = new Map([[rootNode.id, rootNode]])
      rootId.value = rootNode.id
      currentId.value = rootNode.id
      persistNode(rootNode)
      putMeta('rootNodeId', rootNode.id).catch(console.error)
      putMeta('currentNodeId', rootNode.id).catch(console.error)
      return
    }

    // Hydrate in-memory tree
    const nodeMap = new Map<string, HistoryNode>()
    for (const n of loaded) nodeMap.set(n.id, n)
    nodes.value = nodeMap

    // Recover rootId and currentId from meta
    let savedRoot: string | undefined
    let savedCurrent: string | undefined
    try {
      savedRoot = (await getMeta('rootNodeId')) as string | undefined
      savedCurrent = (await getMeta('currentNodeId')) as string | undefined
    } catch {
      // ignore
    }

    // Derive root as node with no parentId if meta is missing/invalid
    if (!savedRoot || !nodeMap.has(savedRoot)) {
      const roots = loaded.filter((n) => !n.parentId)
      savedRoot = roots[0]?.id ?? loaded[0].id
    }
    rootId.value = savedRoot

    if (!savedCurrent || !nodeMap.has(savedCurrent)) {
      savedCurrent = savedRoot
    }
    currentId.value = savedCurrent

    // The caller is responsible for replaying the current node's state onto the store.
    // For P8, we rely on the fact that the recipes store already loaded from localStorage;
    // the history store tracks the tree and can undo/redo from the current position.
    void initialState // accepted for API symmetry; not re-applied on warm start
  }

  // ── Commit ─────────────────────────────────────────────────────────────

  function commit(prevState: unknown, nextState: unknown, label?: string): void {
    // Deep-equality check to avoid no-op commits
    const patch = diff(prevState, nextState)
    if (patch.length === 0) return

    const inversePatch = invert(prevState, patch)
    const node: HistoryNode = {
      id: crypto.randomUUID(),
      parentId: currentId.value,
      patch,
      inversePatch,
      timestamp: Date.now(),
      label,
    }
    nodes.value.set(node.id, node)
    currentId.value = node.id
    persistNode(node)
    persistCurrentId(node.id)
  }

  // ── Undo ───────────────────────────────────────────────────────────────
  // Returns the new live state (after applying inversePatch), or null if no-op.

  function undo(liveState: unknown): { ok: boolean; state: unknown } {
    if (currentId.value === rootId.value) return { ok: false, state: liveState }
    const node = nodes.value.get(currentId.value)
    if (!node || !node.parentId) return { ok: false, state: liveState }

    const newState = apply(liveState, node.inversePatch)
    currentId.value = node.parentId
    persistCurrentId(node.parentId)
    return { ok: true, state: newState }
  }

  // ── Redo ───────────────────────────────────────────────────────────────
  // Returns the new live state (after applying the child's patch), or null if no-op.

  function redo(liveState: unknown): { ok: boolean; state: unknown } {
    const children = childrenOf.value[currentId.value]
    if (!children || children.length === 0) return { ok: false, state: liveState }
    // Newest child = last in insertion order
    const childId = children[children.length - 1]
    const childNode = nodes.value.get(childId)
    if (!childNode) return { ok: false, state: liveState }

    const newState = apply(liveState, childNode.patch)
    currentId.value = childId
    persistCurrentId(childId)
    return { ok: true, state: newState }
  }

  // ── Jump ───────────────────────────────────────────────────────────────
  // Walks the tree: up to LCA, then down to target. Returns new live state.

  function jump(liveState: unknown, targetId: string): { ok: boolean; state: unknown } {
    if (targetId === currentId.value) return { ok: true, state: liveState }
    if (!nodes.value.has(targetId)) return { ok: false, state: liveState }

    // Build ancestor chain for a node (inclusive)
    function ancestors(id: string): string[] {
      const chain: string[] = []
      let cur: string | undefined = id
      while (cur !== undefined) {
        chain.push(cur)
        const node = nodes.value.get(cur)
        cur = node?.parentId
      }
      return chain
    }

    const fromChain = ancestors(currentId.value) // [current, ..., root]
    const toChain = ancestors(targetId) // [target, ..., root]

    const fromSet = new Set(fromChain)
    // Find LCA: first node in toChain that's also in fromChain
    let lca: string | undefined
    let lcaToIdx = 0
    for (let i = 0; i < toChain.length; i++) {
      if (fromSet.has(toChain[i])) {
        lca = toChain[i]
        lcaToIdx = i
        break
      }
    }
    if (!lca) return { ok: false, state: liveState }

    let state: unknown = liveState

    // Walk up from current to LCA, applying inverse patches
    for (const id of fromChain) {
      if (id === lca) break
      const node = nodes.value.get(id)!
      state = apply(state, node.inversePatch)
    }

    // Walk down from LCA to target, applying forward patches
    // toChain[lcaToIdx] === lca, so the path to apply is toChain[0..lcaToIdx-1] reversed
    const downPath = toChain.slice(0, lcaToIdx).reverse()
    for (const id of downPath) {
      const node = nodes.value.get(id)!
      state = apply(state, node.patch)
    }

    currentId.value = targetId
    persistCurrentId(targetId)
    return { ok: true, state }
  }

  // ── Rename ─────────────────────────────────────────────────────────────

  function rename(id: string, label: string): void {
    const node = nodes.value.get(id)
    if (!node) return
    node.label = label
    nodes.value.set(id, { ...node })
    persistNode(node)
  }

  // ── DeleteBranch ───────────────────────────────────────────────────────

  function deleteBranch(id: string): boolean {
    if (id === rootId.value) return false

    // Check if the target is an ancestor of currentId
    let cur: string | undefined = currentId.value
    while (cur !== undefined) {
      if (cur === id) return false // cannot delete ancestor of current node
      const node = nodes.value.get(cur)
      cur = node?.parentId
    }

    // Collect all nodes in the subtree rooted at id
    function collectSubtree(nodeId: string): string[] {
      const ids: string[] = [nodeId]
      const children = childrenOf.value[nodeId]
      if (children) {
        for (const child of children) {
          ids.push(...collectSubtree(child))
        }
      }
      return ids
    }

    const toDelete = collectSubtree(id)
    for (const nid of toDelete) {
      nodes.value.delete(nid)
      deleteRecord(STORE_NODES, nid).catch(console.error)
    }
    return true
  }

  return {
    nodes,
    rootId,
    currentId,
    childrenOf,
    canUndo,
    canRedo,
    init,
    commit,
    undo,
    redo,
    jump,
    rename,
    deleteBranch,
  }
})
