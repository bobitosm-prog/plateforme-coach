let count = 0
const listeners = new Set<() => void>()

export const overlayStore = {
  register() { count++; listeners.forEach(l => l()) },
  unregister() { count = Math.max(0, count - 1); listeners.forEach(l => l()) },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
  getSnapshot() { return count },
}
