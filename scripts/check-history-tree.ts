/**
 * Smoke tests for the history tree logic.
 * Tests diff/apply/invert primitives plus an in-memory tree walker
 * that mirrors store logic — no Pinia/Vue runtime needed.
 */

import { diff, apply, invert } from '../src/lib/json-patch'
import type { Patch } from '../src/lib/json-patch'

let passed = 0
let failed = 0

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  PASS  ${label}`)
    passed++
  } else {
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

// ── In-memory tree ─────────────────────────────────────────────────────────

interface HistoryNode {
  id: string
  parentId?: string
  patch: Patch
  inversePatch: Patch
  timestamp?: number
  label?: string
}

interface HistoryExport {
  version: 1
  rootId: string
  currentId: string
  nodes: HistoryNode[]
}

class HistoryTree {
  nodes = new Map<string, HistoryNode>()
  rootId: string
  currentId: string

  constructor(initialState: unknown) {
    const rootNode: HistoryNode = {
      id: 'root',
      patch: [],
      inversePatch: [],
    }
    this.nodes.set(rootNode.id, rootNode)
    this.rootId = rootNode.id
    this.currentId = rootNode.id
    void initialState
  }

  childrenOf(id: string): string[] {
    const result: string[] = []
    for (const n of this.nodes.values()) {
      if (n.parentId === id) result.push(n.id)
    }
    return result
  }

  commit(prevState: unknown, nextState: unknown, label?: string): void {
    const patch = diff(prevState, nextState)
    if (patch.length === 0) return
    const inversePatch = invert(prevState, patch)
    const id = `node-${this.nodes.size}`
    const node: HistoryNode = { id, parentId: this.currentId, patch, inversePatch, label }
    this.nodes.set(id, node)
    this.currentId = id
  }

  undo(liveState: unknown): { ok: boolean; state: unknown } {
    if (this.currentId === this.rootId) return { ok: false, state: liveState }
    const node = this.nodes.get(this.currentId)!
    const newState = apply(liveState, node.inversePatch)
    this.currentId = node.parentId!
    return { ok: true, state: newState }
  }

  redo(liveState: unknown): { ok: boolean; state: unknown } {
    const children = this.childrenOf(this.currentId)
    if (children.length === 0) return { ok: false, state: liveState }
    const childId = children[children.length - 1]
    const child = this.nodes.get(childId)!
    const newState = apply(liveState, child.patch)
    this.currentId = childId
    return { ok: true, state: newState }
  }

  ancestors(id: string): string[] {
    const chain: string[] = []
    let cur: string | undefined = id
    while (cur !== undefined) {
      chain.push(cur)
      cur = this.nodes.get(cur)?.parentId
    }
    return chain
  }

  jump(liveState: unknown, targetId: string): { ok: boolean; state: unknown } {
    if (targetId === this.currentId) return { ok: true, state: liveState }
    if (!this.nodes.has(targetId)) return { ok: false, state: liveState }

    const fromChain = this.ancestors(this.currentId)
    const toChain = this.ancestors(targetId)
    const fromSet = new Set(fromChain)

    let lca: string | undefined
    let lcaToIdx = 0
    for (let i = 0; i < toChain.length; i++) {
      if (fromSet.has(toChain[i])) { lca = toChain[i]; lcaToIdx = i; break }
    }
    if (!lca) return { ok: false, state: liveState }

    let state: unknown = liveState
    for (const id of fromChain) {
      if (id === lca) break
      state = apply(state, this.nodes.get(id)!.inversePatch)
    }
    const downPath = toChain.slice(0, lcaToIdx).reverse()
    for (const id of downPath) {
      state = apply(state, this.nodes.get(id)!.patch)
    }
    this.currentId = targetId
    return { ok: true, state }
  }

  exportTree(): HistoryExport {
    return {
      version: 1,
      rootId: this.rootId,
      currentId: this.currentId,
      nodes: Array.from(this.nodes.values()),
    }
  }

  importTree(data: HistoryExport): void {
    if (data.version !== 1) throw new Error('Unsupported history export version')
    if (!data.rootId || !data.currentId || !Array.isArray(data.nodes)) {
      throw new Error('Malformed history export data')
    }
    const nodeMap = new Map<string, HistoryNode>()
    for (const n of data.nodes) nodeMap.set(n.id, n)
    this.nodes = nodeMap
    this.rootId = data.rootId
    this.currentId = data.currentId
  }

  /** Replay root → targetId from an empty initial state, returning the resulting live state. */
  replayFrom(targetId: string, initialState: unknown): unknown {
    const path = this.ancestors(targetId).reverse()
    let state: unknown = initialState
    for (const id of path) {
      const node = this.nodes.get(id)
      if (!node || node.patch.length === 0) continue
      state = apply(state, node.patch)
    }
    return state
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

console.log('\n[Basic commit + undo + redo]')
{
  const s0 = { x: 0 }
  const tree = new HistoryTree(s0)
  let live: unknown = s0

  tree.commit(live, { x: 1 }, 'step 1'); live = { x: 1 }
  tree.commit(live, { x: 2 }, 'step 2'); live = { x: 2 }
  tree.commit(live, { x: 3 }, 'step 3'); live = { x: 3 }
  tree.commit(live, { x: 4 }, 'step 4'); live = { x: 4 }
  tree.commit(live, { x: 5 }, 'step 5'); live = { x: 5 }

  assert('5 commits → 5 non-root nodes', tree.nodes.size === 6)

  // Undo 3
  let r = tree.undo(live); live = r.state; assert('undo 1 ok', r.ok)
  r = tree.undo(live); live = r.state; assert('undo 2 ok', r.ok)
  r = tree.undo(live); live = r.state; assert('undo 3 ok', r.ok)
  assert('after 3 undos live.x === 2', deepEqual(live, { x: 2 }))

  // Branch: commit from x=2
  const branchId = `node-${tree.nodes.size}`
  tree.commit(live, { x: 99 }, 'branch commit')
  live = { x: 99 }
  assert('branch node created', tree.nodes.has(branchId))
}

console.log('\n[Original nodes survive branch]')
{
  const s0 = { v: 0 }
  const tree = new HistoryTree(s0)
  let live: unknown = s0

  tree.commit(live, { v: 1 }); live = { v: 1 }; const n1 = tree.currentId
  tree.commit(live, { v: 2 }); live = { v: 2 }; const n2 = tree.currentId
  tree.commit(live, { v: 3 }); live = { v: 3 }; const n3 = tree.currentId

  // Undo back to n1
  let r = tree.undo(live); live = r.state
  r = tree.undo(live); live = r.state

  assert('current is n1', tree.currentId === n1)
  assert('n2 still in tree', tree.nodes.has(n2))
  assert('n3 still in tree', tree.nodes.has(n3))

  // Branch
  tree.commit(live, { v: 42 }); live = { v: 42 }

  assert('n2 still reachable after branch', tree.nodes.has(n2))
  assert('n3 still reachable after branch', tree.nodes.has(n3))
}

console.log('\n[Jump across arbitrary path]')
{
  const s0 = { n: 0 }
  const tree = new HistoryTree(s0)
  let live: unknown = s0

  // Build: root → A → B → C
  tree.commit(live, { n: 1 }); live = { n: 1 }; const nodeA = tree.currentId
  tree.commit(live, { n: 2 }); live = { n: 2 }; const nodeB = tree.currentId
  tree.commit(live, { n: 3 }); live = { n: 3 }

  // Undo to A, then branch to D → E
  let r = tree.undo(live); live = r.state
  r = tree.undo(live); live = r.state
  assert('back at A', tree.currentId === nodeA)

  tree.commit(live, { n: 10 }); live = { n: 10 }; const nodeD = tree.currentId
  tree.commit(live, { n: 20 }); live = { n: 20 }; const nodeE = tree.currentId

  // Jump from E to B (across the fork)
  r = tree.jump(live, nodeB); live = r.state
  assert('jump to B ok', r.ok)
  assert('live state is n=2 after jump to B', deepEqual(live, { n: 2 }))

  // Jump from B to E
  r = tree.jump(live, nodeE); live = r.state
  assert('jump back to E ok', r.ok)
  assert('live state is n=20 after jump to E', deepEqual(live, { n: 20 }))

  // Jump from E to D
  r = tree.jump(live, nodeD); live = r.state
  assert('jump to D ok', r.ok)
  assert('live state is n=10 after jump to D', deepEqual(live, { n: 10 }))
}

console.log('\n[No-op commit]')
{
  const s0 = { x: 1 }
  const tree = new HistoryTree(s0)
  tree.commit(s0, s0)
  assert('no-op commit adds no node', tree.nodes.size === 1)
}

console.log('\n[Export / Import round-trip]')
{
  // Build a branched tree: root → A → B → C, then undo to A and branch → D → E
  const s0 = { v: 0 }
  const src = new HistoryTree(s0)
  let live: unknown = s0

  src.commit(live, { v: 1 }); live = { v: 1 }; const nodeA = src.currentId
  src.commit(live, { v: 2 }); live = { v: 2 }
  src.commit(live, { v: 3 }); live = { v: 3 }

  let r = src.undo(live); live = r.state
  r = src.undo(live); live = r.state
  assert('back at A before branch', src.currentId === nodeA)

  src.commit(live, { v: 10 }); live = { v: 10 }
  src.commit(live, { v: 20 }); live = { v: 20 }
  const lastId = src.currentId

  const nodeCount = src.nodes.size

  // Export → JSON → parse → import into fresh tree
  const exported = src.exportTree()
  const serialized = JSON.stringify(exported)
  const parsed = JSON.parse(serialized) as HistoryExport

  const dst = new HistoryTree({})
  dst.importTree(parsed)

  assert('import: node count matches', dst.nodes.size === nodeCount, `got ${dst.nodes.size}, want ${nodeCount}`)
  assert('import: rootId restored', dst.rootId === src.rootId)
  assert('import: currentId restored', dst.currentId === lastId)

  // Verify all original node IDs are present
  let allPresent = true
  for (const id of src.nodes.keys()) {
    if (!dst.nodes.has(id)) { allPresent = false; break }
  }
  assert('import: all node IDs present', allPresent)

  // Verify that replaying root → currentId on dst yields the same state as src.
  // The base state (at root) is s0 = { v: 0 }; patches are relative to that.
  const replayedState = dst.replayFrom(dst.currentId, s0)
  // The src's live state at currentId should be { v: 20 }
  assert('import: replay root→currentId yields correct state', deepEqual(replayedState, { v: 20 }))

  // Verify jump still works after import
  r = dst.jump(live, nodeA); live = r.state
  assert('import: jump to A ok after import', r.ok)
  assert('import: state after jump to A is v=1', deepEqual(live, { v: 1 }))
}

console.log(`\n${passed} passed, ${failed} failed.`)
if (failed > 0) process.exit(1)
