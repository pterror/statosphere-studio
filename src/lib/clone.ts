import { toRaw } from 'vue'

/** Deep-clone, unwrapping Vue reactive proxies first. */
export function cloneJson<T>(x: T): T {
  return structuredClone(toRaw(x)) as T
}
