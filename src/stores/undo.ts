import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UndoAction {
  do: () => void
  undo: () => void
  redo?: () => void
  label: string
}

const MAX_DEPTH = 50

export const useUndoStore = defineStore('undo', () => {
  const stack = ref<UndoAction[]>([])
  const cursor = ref(0)

  function push(a: UndoAction): void {
    // Discard any redo history past cursor
    stack.value.splice(cursor.value)
    stack.value.push(a)
    if (stack.value.length > MAX_DEPTH) {
      stack.value.splice(0, stack.value.length - MAX_DEPTH)
    }
    cursor.value = stack.value.length
  }

  function undo(): boolean {
    if (cursor.value === 0) return false
    cursor.value--
    stack.value[cursor.value].undo()
    return true
  }

  function redo(): boolean {
    if (cursor.value >= stack.value.length) return false
    const a = stack.value[cursor.value]
    ;(a.redo ?? a.do)()
    cursor.value++
    return true
  }

  const canUndo = computed(() => cursor.value > 0)
  const canRedo = computed(() => cursor.value < stack.value.length)

  return { stack, cursor, push, undo, redo, canUndo, canRedo }
})
