import { ref } from 'vue'
import type { ElementType } from '../recipes/types'

export type DragPayload =
  | { kind: 'recipe-card'; recipeId: string }
  | { kind: 'atom-card'; recipeId: string }
  | { kind: 'block'; instanceId: string }
  | { kind: 'element'; instanceId: string; elementType: ElementType; elementName: string }
  | { kind: 'file'; file: File }

const MIME = 'application/x-statosphere-dnd'

export const currentDrag = ref<DragPayload | null>(null)

export function makeDragSource(payload: DragPayload, opts?: { ghostText?: string }) {
  function onDragStart(e: DragEvent) {
    if (!e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(MIME, JSON.stringify(payload))
    if (opts?.ghostText) {
      const ghost = document.createElement('div')
      ghost.textContent = opts.ghostText
      ghost.style.cssText = 'position:absolute;left:-9999px;top:-9999px;padding:4px 8px;background:#1e1b4b;color:#c7d2fe;border-radius:4px;font-size:12px;'
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, 0, 0)
      requestAnimationFrame(() => ghost.remove())
    }
    currentDrag.value = payload
  }

  function onDragEnd(_e: DragEvent) {
    currentDrag.value = null
  }

  return { onDragStart, onDragEnd, draggable: true as const }
}

export function makeDropTarget(opts: {
  accept: DragPayload['kind'][]
  onDrop: (p: DragPayload, ev: DragEvent) => void
  onOver?: (p: DragPayload | null, ev: DragEvent) => void
  onLeave?: () => void
}) {
  function isCompatible(e: DragEvent): boolean {
    if (e.dataTransfer?.types.includes('Files')) return opts.accept.includes('file')
    if (e.dataTransfer?.types.includes(MIME)) {
      const drag = currentDrag.value
      return drag !== null && opts.accept.includes(drag.kind)
    }
    return false
  }

  function onDragOver(e: DragEvent) {
    if (!isCompatible(e)) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    opts.onOver?.(currentDrag.value, e)
  }

  function onDragEnter(e: DragEvent) {
    if (!isCompatible(e)) return
    e.preventDefault()
    opts.onOver?.(currentDrag.value, e)
  }

  function onDragLeave(e: DragEvent) {
    const related = e.relatedTarget as Node | null
    if (related && (e.currentTarget as Element).contains(related)) return
    opts.onLeave?.()
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    opts.onLeave?.()

    if (e.dataTransfer?.files?.length) {
      for (const file of Array.from(e.dataTransfer.files)) {
        opts.onDrop({ kind: 'file', file }, e)
      }
      currentDrag.value = null
      return
    }

    const raw = e.dataTransfer?.getData(MIME)
    if (!raw) return
    try {
      const payload = JSON.parse(raw) as DragPayload
      if (opts.accept.includes(payload.kind)) {
        opts.onDrop(payload, e)
      }
    } catch { /* malformed */ }
    currentDrag.value = null
  }

  return { onDragOver, onDragEnter, onDragLeave, onDrop }
}
