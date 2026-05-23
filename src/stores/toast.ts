import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'

export interface ToastItem {
  id: string
  message: string
  action?: { label: string; onClick: () => void }
  expiresAt: number
}

export const useToastStore = defineStore('toast', () => {
  const items = ref<ToastItem[]>([])

  const timer = setInterval(() => {
    const now = Date.now()
    items.value = items.value.filter((t) => t.expiresAt > now)
  }, 200)

  function show(
    message: string,
    opts?: { durationMs?: number; action?: { label: string; onClick: () => void } },
  ): string {
    const id = crypto.randomUUID()
    const durationMs = opts?.durationMs ?? 3000
    items.value.push({ id, message, action: opts?.action, expiresAt: Date.now() + durationMs })
    return id
  }

  function dismiss(id: string): void {
    items.value = items.value.filter((t) => t.id !== id)
  }

  function $dispose() {
    clearInterval(timer)
  }

  return { items, show, dismiss, $dispose }
})
