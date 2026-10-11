import { onScopeDispose } from 'vue'

/** Cancels superseded reads and invalidates their results when a view is disposed. */
export function useLatestRequest() {
  let active: AbortController | undefined
  let disposed = false
  const cancel = () => { active?.abort(); active = undefined }
  onScopeDispose(() => { disposed = true; cancel() })
  return {
    cancel,
    begin() {
      cancel()
      const request = new AbortController()
      active = request
      if (disposed) request.abort()
      return { signal: request.signal, isCurrent: () => active === request && !request.signal.aborted }
    },
  }
}
