import { toRaw } from 'vue'

/**
 * Deep-clone a value that may be Vue-reactive.
 *
 * structuredClone(toRaw(x)) works correctly: toRaw() returns the original
 * target object, and Vue's reactivity system does not recursively create
 * Proxy wrappers — it lazily wraps on access, so the underlying target and
 * all its nested properties are plain objects.  structuredClone then clones
 * them without issue and preserves types that JSON round-trip would lose
 * (Map, Set, Date, etc.).
 */
export function cloneJson<T>(x: T): T {
  return structuredClone(toRaw(x)) as T
}
