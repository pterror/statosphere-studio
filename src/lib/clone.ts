/** Deep-clone via JSON round-trip. Safe on Vue reactive proxies. */
export function cloneJson<T>(x: T): T {
  return JSON.parse(JSON.stringify(x))
}
