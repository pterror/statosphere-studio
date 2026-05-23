<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 bg-black/60 z-40" />
      <DialogContent class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col" style="width: min(92vw, 900px); height: min(85vh, 640px);">
        <div class="flex items-center px-4 py-2 border-b border-gray-800 shrink-0">
          <DialogTitle class="text-gray-100 font-semibold text-sm">Dataflow Graph</DialogTitle>
          <DialogClose class="ml-auto text-gray-400 hover:text-gray-200 text-lg leading-none">&times;</DialogClose>
        </div>
        <div class="flex-1 min-h-0 overflow-auto" ref="scrollEl">
          <svg
            v-if="layout"
            :width="layout.width"
            :height="layout.height"
            class="block"
          >
            <defs>
              <marker id="arrow-read" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#6366f1" opacity="0.7" />
              </marker>
              <marker id="arrow-write" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b" />
              </marker>
            </defs>

            <!-- Cluster backgrounds -->
            <rect
              v-for="cluster in layout.clusters"
              :key="cluster.id"
              :x="cluster.x"
              :y="cluster.y"
              :width="cluster.w"
              :height="cluster.h"
              rx="6"
              fill="none"
              stroke="#374151"
              stroke-width="1"
            />
            <text
              v-for="cluster in layout.clusters"
              :key="'label-' + cluster.id"
              :x="cluster.x + 8"
              :y="cluster.y + 12"
              fill="#6b7280"
              font-size="10"
              font-family="monospace"
            >{{ cluster.label }}</text>

            <!-- Edges -->
            <line
              v-for="(edge, i) in layout.edges"
              :key="i"
              :x1="edge.x1"
              :y1="edge.y1"
              :x2="edge.x2 - (edge.write ? 10 : 10)"
              :y2="edge.y2"
              :stroke="edge.write ? '#f59e0b' : '#6366f1'"
              :stroke-opacity="edge.write ? 1 : 0.6"
              :stroke-dasharray="edge.write ? 'none' : '4 3'"
              stroke-width="1.5"
              :marker-end="edge.write ? 'url(#arrow-write)' : 'url(#arrow-read)'"
            />

            <!-- Nodes -->
            <g
              v-for="node in layout.nodes"
              :key="node.id"
              class="cursor-pointer"
              @click="jumpTo(node)"
            >
              <!-- variable: circle -->
              <circle
                v-if="node.shape === 'circle'"
                :cx="node.cx"
                :cy="node.cy"
                :r="NODE_R"
                :fill="nodeFill(node)"
                stroke="#4b5563"
                stroke-width="1"
              />
              <!-- classifier: square -->
              <rect
                v-else-if="node.shape === 'square'"
                :x="node.cx - NODE_R"
                :y="node.cy - NODE_R"
                :width="NODE_R * 2"
                :height="NODE_R * 2"
                :fill="nodeFill(node)"
                stroke="#4b5563"
                stroke-width="1"
              />
              <!-- generator: diamond -->
              <polygon
                v-else-if="node.shape === 'diamond'"
                :points="diamond(node.cx, node.cy)"
                :fill="nodeFill(node)"
                stroke="#4b5563"
                stroke-width="1"
              />
              <!-- contentRule: rounded rect -->
              <rect
                v-else-if="node.shape === 'rrect'"
                :x="node.cx - NODE_R"
                :y="node.cy - NODE_R"
                :width="NODE_R * 2"
                :height="NODE_R * 2"
                rx="5"
                :fill="nodeFill(node)"
                stroke="#4b5563"
                stroke-width="1"
              />
              <!-- function: hexagon -->
              <polygon
                v-else-if="node.shape === 'hex'"
                :points="hexagon(node.cx, node.cy)"
                :fill="nodeFill(node)"
                stroke="#4b5563"
                stroke-width="1"
              />
              <text
                :x="node.cx"
                :y="node.cy + NODE_R + 12"
                text-anchor="middle"
                fill="#d1d5db"
                font-size="9"
                font-family="monospace"
              >{{ shortLabel(node.label) }}</text>
            </g>

            <!-- Legend -->
            <g transform="translate(8, 8)">
              <circle cx="8" cy="8" r="5" fill="#1e1b4b" stroke="#4b5563" stroke-width="1" />
              <text x="16" y="12" fill="#9ca3af" font-size="9" font-family="sans-serif">variable</text>
              <rect x="28" y="3" width="10" height="10" fill="#064e3b" stroke="#4b5563" stroke-width="1" />
              <text x="42" y="12" fill="#9ca3af" font-size="9" font-family="sans-serif">classifier</text>
              <polygon :points="diamond(65, 8, 6)" fill="#422006" stroke="#4b5563" stroke-width="1" />
              <text x="74" y="12" fill="#9ca3af" font-size="9" font-family="sans-serif">generator</text>
              <rect x="95" y="3" width="10" height="10" rx="3" fill="#4a044e" stroke="#4b5563" stroke-width="1" />
              <text x="109" y="12" fill="#9ca3af" font-size="9" font-family="sans-serif">rule</text>
              <polygon :points="hexagon(127, 8, 6)" fill="#1c1917" stroke="#4b5563" stroke-width="1" />
              <text x="136" y="12" fill="#9ca3af" font-size="9" font-family="sans-serif">function</text>
            </g>
          </svg>
          <div v-else class="flex items-center justify-center h-full text-gray-600 text-sm">No elements to graph.</div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from 'reka-ui'
import { useRecipesStore } from '../stores/recipes'

const open = defineModel<boolean>('open', { default: false })

const recipesStore = useRecipesStore()
const scrollEl = ref<HTMLElement | null>(null)

const NODE_R = 14
const COL_GAP = 160
const ROW_GAP = 70
const CLUSTER_PAD = 20

type NodeShape = 'circle' | 'square' | 'diamond' | 'rrect' | 'hex'

interface GNode {
  id: string
  label: string
  shape: NodeShape
  cx: number
  cy: number
  elementType: string
  instanceId: string
}

interface GEdge { x1: number; y1: number; x2: number; y2: number; write: boolean }
interface GCluster { id: string; label: string; x: number; y: number; w: number; h: number }

function diamond(cx: number, cy: number, r = NODE_R) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`
}

function hexagon(cx: number, cy: number, r = NODE_R) {
  const pts = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}

function nodeFill(node: GNode) {
  const fills: Record<NodeShape, string> = {
    circle: '#1e1b4b',
    square: '#064e3b',
    diamond: '#422006',
    rrect: '#4a044e',
    hex: '#1c1917',
  }
  return fills[node.shape]
}

function shortLabel(s: string) {
  return s.length > 14 ? s.slice(0, 13) + '…' : s
}

function extractVarRefs(s: string): string[] {
  const matches = [...(s ?? '').matchAll(/\{\{(\w+)\}\}/g)]
  return matches.map((m) => m[1])
}

const layout = computed(() => {
  const instances = recipesStore.instances
  if (!instances.length) return null

  const mat = recipesStore.materialized
  const allVarNames = new Set(mat.variables.map((v: any) => v.name))
  const nodes: GNode[] = []
  const nodeById = new Map<string, GNode>()

  // Assign columns by element type: vars=0, classifiers=1, generators=1, contentRules=2, functions=2
  const typeCol: Record<string, number> = {
    variables: 0,
    classifiers: 1,
    generators: 1,
    contentRules: 2,
    functions: 2,
  }
  const typeShape: Record<string, NodeShape> = {
    variables: 'circle',
    classifiers: 'square',
    generators: 'diamond',
    contentRules: 'rrect',
    functions: 'hex',
  }

  // Build node list per instance group
  const clusters: GCluster[] = []
  let clusterX = CLUSTER_PAD

  const colCounts = [0, 0, 0]

  for (const inst of instances) {
    const instNodes: GNode[] = []
    const types: Array<'variables' | 'classifiers' | 'generators' | 'contentRules' | 'functions'> =
      ['variables', 'classifiers', 'generators', 'contentRules', 'functions']
    for (const et of types) {
      const col = typeCol[et]
      for (const el of mat[et] as any[]) {
        const id = `${inst.id}:${et}:${el.name}`
        const node: GNode = {
          id,
          label: el.name || `(${et.slice(0, 3)})`,
          shape: typeShape[et],
          cx: 0, cy: 0,
          elementType: et,
          instanceId: inst.id,
        }
        nodes.push(node)
        nodeById.set(id, node)
        instNodes.push(node)
        colCounts[col]++
      }
    }
    // We'll position them after global pass
    clusters.push({ id: inst.id, label: inst.name, x: 0, y: 0, w: 0, h: 0 })
  }

  // Position: 3 columns, stack within each column
  const colRow = [0, 0, 0]
  const totalNodes = nodes.length

  if (!totalNodes) return null

  for (const node of nodes) {
    const col = typeCol[node.elementType] ?? 0
    node.cx = CLUSTER_PAD + col * COL_GAP + COL_GAP / 2
    node.cy = CLUSTER_PAD + 30 + colRow[col] * ROW_GAP + NODE_R
    colRow[col]++
  }

  // Cluster bounding boxes — simple: wrap all nodes of this instance
  for (const cluster of clusters) {
    const inst = instances.find((i) => i.id === cluster.id)
    if (!inst) continue
    const types = ['variables', 'classifiers', 'generators', 'contentRules', 'functions']
    const instNodes = nodes.filter((n) => n.instanceId === inst.id)
    if (!instNodes.length) continue
    const xs = instNodes.map((n) => n.cx)
    const ys = instNodes.map((n) => n.cy)
    cluster.x = Math.min(...xs) - NODE_R - 8
    cluster.y = Math.min(...ys) - NODE_R - 18
    cluster.w = Math.max(...xs) - cluster.x + NODE_R + 8
    cluster.h = Math.max(...ys) - cluster.y + NODE_R + 8
  }

  // Build edges
  const edges: GEdge[] = []

  function edgeTo(fromNode: GNode, varName: string, write: boolean) {
    const target = nodes.find((n) => n.elementType === 'variables' && (n.label === varName || n.label.endsWith('.' + varName)))
    if (!target) return
    edges.push({ x1: fromNode.cx, y1: fromNode.cy, x2: target.cx, y2: target.cy, write })
  }

  for (const el of mat.classifiers as any[]) {
    const fromNode = nodes.find((n) => n.elementType === 'classifiers' && n.label === el.name)
    if (!fromNode) continue
    for (const ref of extractVarRefs(el.condition ?? '')) edgeTo(fromNode, ref, false)
    for (const cls of el.classifications ?? []) {
      for (const upd of cls.updates ?? []) {
        if (upd.variable) edgeTo(fromNode, upd.variable, true)
      }
    }
  }

  for (const el of mat.generators as any[]) {
    const fromNode = nodes.find((n) => n.elementType === 'generators' && n.label === el.name)
    if (!fromNode) continue
    for (const ref of extractVarRefs(el.prompt ?? '')) edgeTo(fromNode, ref, false)
    for (const upd of el.updates ?? []) {
      if (upd.variable) edgeTo(fromNode, upd.variable, true)
    }
  }

  for (const el of mat.contentRules as any[]) {
    const fromNode = nodes.find((n) => n.elementType === 'contentRules' && n.label === el.name)
    if (!fromNode) continue
    for (const ref of extractVarRefs(el.condition ?? '')) edgeTo(fromNode, ref, false)
    for (const ref of extractVarRefs(el.modification ?? '')) edgeTo(fromNode, ref, false)
  }

  const maxY = Math.max(...nodes.map((n) => n.cy)) + NODE_R + CLUSTER_PAD + 20
  const svgW = CLUSTER_PAD + 3 * COL_GAP + CLUSTER_PAD
  const svgH = Math.max(maxY, 200)

  return { nodes, edges, clusters, width: svgW, height: svgH }
})

function jumpTo(node: GNode) {
  // Close modal and attempt to scroll to the element drawer for this instance/elementType
  // We dispatch a custom event; StreamCanvas/ElementDrawer can listen if needed
  const event = new CustomEvent('studio:jump-to-element', {
    bubbles: true,
    detail: { instanceId: node.instanceId, elementType: node.elementType, elementName: node.label },
  })
  document.dispatchEvent(event)
}
</script>
