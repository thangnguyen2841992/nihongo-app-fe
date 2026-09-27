// Only real foreground interactions extend the server's admin idle deadline.
// Polling, timers, focus and WebSocket heartbeats never call this endpoint.
export function trackAdminActivity(isAdmin: () => boolean, send: () => Promise<unknown>) {
  let lastAttempt = -Infinity
  const listener = (event: Event) => {
    if (!event.isTrusted || document.visibilityState !== 'visible' || !isAdmin()) return
    const now = Date.now()
    if (now - lastAttempt < 60_000) return
    lastAttempt = now
    void send().catch(() => { /* Auth interceptor handles expiration; retry on a later interaction. */ })
  }
  const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
  events.forEach(name => window.addEventListener(name, listener, { passive: true }))
  return () => events.forEach(name => window.removeEventListener(name, listener))
}
