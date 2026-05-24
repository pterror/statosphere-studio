/**
 * Deep-clone a JSON-serializable value.
 *
 * JSON round-trip is used instead of structuredClone(toRaw(x)) because
 * toRaw() only strips one layer of Vue reactivity — nested reactive objects
 * remain as Proxies, which structuredClone cannot clone.  JSON.parse/stringify
 * naturally serializes through proxies and produces plain objects.
 */
export function cloneJson<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}
