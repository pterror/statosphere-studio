export function useShortcuts(bindings: Record<string, () => void>): () => void {
  function onKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) return

    const key = [
      e.metaKey && 'meta',
      e.ctrlKey && 'ctrl',
      e.shiftKey && 'shift',
      e.key.toLowerCase(),
    ]
      .filter(Boolean)
      .join('+')

    const handler = bindings[key]
    if (handler) {
      e.preventDefault()
      handler()
    }
  }

  window.addEventListener('keydown', onKeydown)
  return () => window.removeEventListener('keydown', onKeydown)
}
